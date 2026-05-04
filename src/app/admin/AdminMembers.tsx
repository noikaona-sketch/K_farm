import { useEffect, useState, useCallback } from 'react'
import {
  fetchAdminMembers, approveMember, rejectMember,
  updateMemberAdminFields, fetchLeaders, assignLeader,
  type AdminMemberRow, type LeaderOption,
} from '../../lib/db'
import { isSupabaseReady } from '../../lib/supabase'
import { RefreshCw, Search, Check, X, ChevronDown, ChevronUp, Phone, Wifi, WifiOff } from 'lucide-react'

const roles    = ['member','farmer','leader']
const grades   = ['C','B','A','VIP','Premium']
const statuses = ['pending_leader','pending_admin','approved','rejected']

const STATUS_CFG: Record<string,{label:string;bg:string;text:string;dot:string}> = {
  pending_leader: {label:'รอ Leader',   bg:'bg-amber-100',   text:'text-amber-700',   dot:'bg-amber-400'},
  pending_admin:  {label:'รอ Admin',    bg:'bg-orange-100',  text:'text-orange-700',  dot:'bg-orange-400'},
  approved:       {label:'อนุมัติแล้ว', bg:'bg-emerald-100', text:'text-emerald-700', dot:'bg-emerald-500'},
  rejected:       {label:'ปฏิเสธ',     bg:'bg-red-100',     text:'text-red-700',     dot:'bg-red-400'},
}

interface RowEdit { role:string; grade:string; status:string }

export default function MembersPage() {
  const [data, setData]         = useState<Record<string,unknown>[]>([])
  const [leaders, setLeaders]   = useState<LeaderOption[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [expanded, setExpanded] = useState<string|null>(null)
  const [edits, setEdits]       = useState<Record<string,RowEdit>>({})
  const [editLeader, setEditLeader]   = useState<Record<string,string>>({})
  const [editInspect, setEditInspect] = useState<Record<string,boolean>>({})
  const [acting, setActing]     = useState<string|null>(null)
  const [toast, setToast]       = useState<{ok:boolean;msg:string}|null>(null)

  const flash = (ok:boolean,msg:string) => {
    setToast({ok,msg}); setTimeout(()=>setToast(null),4000)
  }

  const setEdit = (id:string, patch:Partial<RowEdit>) =>
    setEdits(prev=>({...prev,[id]:{...prev[id],...patch}}))

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [res, lRes] = await Promise.all([fetchAdminMembers(), fetchLeaders()])
      const farmers = (res as unknown as Record<string,unknown>[])
        .filter(u => u.role==='farmer' || u.role==='member')
      setData(farmers)
      setLeaders(lRes)
      // seed edit state
      const init: Record<string,RowEdit> = {}
      farmers.forEach(u => {
        const id = String(u.id)
        init[id] = {
          role:   String(u.role??'member'),
          grade:  String(u.grade??'C'),
          status: String(u.status??'pending_leader'),
        }
        if (u.leader_id) setEditLeader(p=>({...p,[id]:String(u.leader_id)}))
        setEditInspect(p=>({...p,[id]:Boolean(u.can_inspect??false)}))
      })
      setEdits(init)
    } catch { flash(false,'โหลดข้อมูลไม่สำเร็จ') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const total    = data.length
  const approved = data.filter(u=>u.status==='approved').length
  const pending  = data.filter(u=>String(u.status??'').includes('pending')).length
  const rejected = data.filter(u=>u.status==='rejected').length

  const filtered = data
    .filter(u => filterStatus==='all' || u.status===filterStatus)
    .filter(u =>
      String(u.full_name??'').includes(search)||
      String(u.id_card??'').includes(search)||
      String(u.phone??'').includes(search)
    )

  const act = async (id:string, fn:()=>Promise<void>, msg:string) => {
    setActing(id)
    try { await fn(); flash(true,msg); await load() }
    catch(e) { flash(false, e instanceof Error?e.message:'ไม่สำเร็จ') }
    finally { setActing(null) }
  }

  const handleAssignLeader = async (u: Record<string,unknown>) => {
    const id = String(u.id)
    const farmerObj = u.farmer as Record<string,unknown>|null
    const farmerId = String(farmerObj?.id ?? u.id)
    setActing(id)
    try {
      await assignLeader(farmerId, editLeader[id]||null, editInspect[id]??false)
      flash(true,`✅ บันทึกหัวหน้ากลุ่ม`)
      await load()
    } catch(e) { flash(false, e instanceof Error?e.message:'ไม่สำเร็จ') }
    finally { setActing(null) }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">สมาชิก / อนุมัติสมาชิก</h1>
          <div className="flex items-center gap-1.5 mt-0.5 text-sm">
            {isSupabaseReady
              ? <><Wifi className="w-3.5 h-3.5 text-emerald-600"/><span className="text-emerald-600">Supabase · farmer only</span></>
              : <><WifiOff className="w-3.5 h-3.5 text-amber-500"/><span className="text-amber-600">Mock</span></>}
            <span className="text-gray-400">• {total} รายการ</span>
          </div>
        </div>
        <button onClick={()=>{setLoading(true);load()}}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm hover:bg-gray-50 shadow-sm">
          <RefreshCw className="w-4 h-4"/>รีโหลด
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`rounded-xl px-4 py-3 flex items-center gap-2 text-sm font-medium border
          ${toast.ok?'bg-emerald-50 border-emerald-300 text-emerald-700':'bg-red-50 border-red-300 text-red-700'}`}>
          {toast.ok?'✅':'❌'} {toast.msg}
          <button onClick={()=>setToast(null)} className="ml-auto text-lg leading-none opacity-60">×</button>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {l:'ทั้งหมด',     n:total,    bg:'border-gray-200 bg-gray-50 text-gray-700'},
          {l:'รออนุมัติ',   n:pending,  bg:'border-amber-200 bg-amber-50 text-amber-700'},
          {l:'อนุมัติแล้ว', n:approved, bg:'border-emerald-200 bg-emerald-50 text-emerald-700'},
          {l:'ปฏิเสธ',     n:rejected, bg:'border-red-200 bg-red-50 text-red-700'},
        ].map(({l,n,bg})=>(
          <div key={l} className={`border-2 rounded-2xl p-4 text-center ${bg}`}>
            <div className="text-3xl font-bold">{loading?'…':n}</div>
            <div className="text-sm font-semibold mt-0.5">{l}</div>
          </div>
        ))}
      </div>

      {/* Filter + Search */}
      <div className="flex gap-2 flex-wrap">
        {(['all','pending_leader','pending_admin','approved','rejected'] as const).map(s=>(
          <button key={s} onClick={()=>setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all
              ${filterStatus===s?'bg-emerald-600 text-white border-emerald-600':'bg-white border-gray-200 text-gray-600'}`}>
            {s==='all'?`ทั้งหมด (${total})`:((STATUS_CFG[s]?.label??s)+` (${data.filter(u=>u.status===s).length})`)}
          </button>
        ))}
        <div className="relative flex-1 min-w-40">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"/>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="ค้นหาชื่อ บัตร เบอร์"
            className="w-full pl-8 pr-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"/>
        </div>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="flex justify-center py-12"><RefreshCw className="w-6 h-6 text-emerald-600 animate-spin"/></div>
      ) : filtered.length===0 ? (
        <div className="text-center py-14 text-gray-400">
          <div className="text-5xl mb-3">🌾</div>
          <p className="font-medium">ไม่พบสมาชิก</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(u=>{
            const id  = String(u.id)
            const e   = edits[id] ?? {role:String(u.role??'member'),grade:String(u.grade??'C'),status:String(u.status??'pending_leader')}
            const st  = STATUS_CFG[e.status] ?? {label:e.status,bg:'bg-gray-100',text:'text-gray-600',dot:'bg-gray-300'}
            const isA = acting===id
            const isExp = expanded===id
            const isPending = e.status.includes('pending')
            const farmerObj = u.farmer as Record<string,unknown>|null
            const leaderName = leaders.find(l=>l.id===String(farmerObj?.leader_id??editLeader[id]??''))?.name

            return (
              <div key={id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Card header */}
                <button className="w-full p-4 text-left hover:bg-gray-50/60 transition-colors"
                  onClick={()=>setExpanded(isExp?null:id)}>
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-11 h-11 rounded-full bg-emerald-100 flex items-center justify-center font-bold text-emerald-700 text-base flex-shrink-0">
                      {String(u.full_name??'?').charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-900">{String(u.full_name??'-')}</div>
                      {/* ที่อยู่ + กลุ่ม */}
                      <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap gap-x-2">
                        {farmerObj?.province ? <span>📍 {String(farmerObj.province)}</span> : null}
                        {farmerObj?.district ? <span>{String(farmerObj.district)}</span> : null}
                        {farmerObj?.village  ? <span>{String(farmerObj.village)}</span> : null}
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-mono">{String(u.id_card??'')}</span>
                        {e.grade && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">เกรด {e.grade}</span>}
                        {leaderName && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">👑 {leaderName}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs px-2.5 py-1.5 rounded-full font-semibold ${st.bg} ${st.text}`}>{st.label}</span>
                      {isExp?<ChevronUp className="w-4 h-4 text-gray-400"/>:<ChevronDown className="w-4 h-4 text-gray-400"/>}
                    </div>
                  </div>
                </button>

                {/* Expanded detail */}
                {isExp && (
                  <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-4">
                    {/* Info grid */}
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {[
                        ['📞 เบอร์', String(u.phone??'-')],
                        ['🪪 บัตรประชาชน', String(u.id_card??'-')],
                        ['🏘️ จังหวัด', String(farmerObj?.province??'-')],
                        ['🏠 อำเภอ', String(farmerObj?.district??'-')],
                        ['🏡 หมู่บ้าน', String(farmerObj?.village??'-')],
                        ['🏦 ธนาคาร', String(farmerObj?.bank_name??'-')],
                        ['💳 เลขบัญชี', String(farmerObj?.bank_account_no??'-')],
                        ['👤 ชื่อบัญชี', String(farmerObj?.bank_account_name??'-')],
                      ].map(([l,v])=>(
                        <div key={l} className="bg-white rounded-xl p-2.5">
                          <div className="text-[10px] text-gray-400">{l}</div>
                          <div className="font-semibold text-gray-800 text-xs mt-0.5 truncate">{v}</div>
                        </div>
                      ))}
                    </div>

                    {/* Phone */}
                    {String(u.phone ?? '') && (
                      <a href={`tel:${u.phone}`}
                        className="flex items-center justify-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl py-2.5 text-sm font-semibold hover:bg-blue-100 transition-colors">
                        <Phone className="w-4 h-4"/>โทร {String(u.phone)}
                      </a>
                    )}

                    {/* Role / Grade / Status editors */}
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 block mb-1">Role</label>
                        <select value={e.role} onChange={ev=>setEdit(id,{role:ev.target.value})}
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:border-emerald-500">
                          {roles.map(r=><option key={r}>{r}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 block mb-1">Grade</label>
                        <select value={e.grade} onChange={ev=>setEdit(id,{grade:ev.target.value})}
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:border-emerald-500">
                          <option value="">-</option>
                          {grades.map(g=><option key={g}>{g}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 block mb-1">Status</label>
                        <select value={e.status} onChange={ev=>setEdit(id,{status:ev.target.value})}
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:border-emerald-500">
                          {statuses.map(s=><option key={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Approve / Reject */}
                    {isPending && (
                      <div className="flex gap-2">
                        <button onClick={()=>act(id,()=>rejectMember(id),'❌ ปฏิเสธ')} disabled={isA}
                          className={`flex-1 border-2 border-red-200 text-red-600 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 ${isA?'opacity-60':'hover:bg-red-50'} transition-colors`}>
                          {isA?<RefreshCw className="w-4 h-4 animate-spin"/>:<X className="w-4 h-4"/>}ปฏิเสธ
                        </button>
                        <button onClick={()=>act(id,()=>approveMember(id),'✅ อนุมัติ')} disabled={isA}
                          className={`flex-1 bg-emerald-600 text-white py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 ${isA?'opacity-60':'hover:bg-emerald-700'} transition-colors`}>
                          {isA?<RefreshCw className="w-4 h-4 animate-spin"/>:<Check className="w-4 h-4"/>}อนุมัติ
                        </button>
                      </div>
                    )}

                    {/* Save role/grade/status */}
                    <button onClick={()=>act(id,()=>updateMemberAdminFields(id,{role:e.role,grade:e.grade,status:e.status}),'💾 บันทึก')} disabled={isA}
                      className={`w-full border-2 border-gray-200 text-gray-700 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${isA?'opacity-60':'hover:bg-gray-50'}`}>
                      {isA?<RefreshCw className="w-3.5 h-3.5 animate-spin"/>:'💾'} บันทึก Role / Grade / Status
                    </button>

                    {/* หัวหน้ากลุ่ม + can_inspect */}
                    <div className="border-t border-gray-200 pt-3 space-y-2">
                      <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">กลุ่มและการรับรอง</div>
                      <div className="flex flex-wrap gap-2 items-center">
                        <div className="flex-1 min-w-40">
                          <label className="text-[10px] text-gray-400 block mb-1">หัวหน้ากลุ่ม</label>
                          <select value={editLeader[id]??''} onChange={ev=>setEditLeader(p=>({...p,[id]:ev.target.value}))}
                            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:border-emerald-500">
                            <option value="">— ไม่ระบุ —</option>
                            {leaders.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
                          </select>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer mt-4">
                          <input type="checkbox" checked={editInspect[id]??false}
                            onChange={ev=>setEditInspect(p=>({...p,[id]:ev.target.checked}))}
                            className="w-4 h-4 accent-emerald-600"/>
                          <span className="text-xs text-gray-600">มีสิทธิ์ตรวจแปลง</span>
                        </label>
                        <button onClick={()=>handleAssignLeader(u)} disabled={isA}
                          className={`px-4 py-1.5 rounded-lg text-xs font-bold border-2 border-emerald-300 text-emerald-700 mt-4 transition-colors ${isA?'opacity-60':'hover:bg-emerald-50'}`}>
                          {isA?'…':'บันทึกกลุ่ม'}
                        </button>
                      </div>
                    </div>

                    {/* Quick: ตั้งหัวหน้า */}
                    <button onClick={()=>act(id,()=>updateMemberAdminFields(id,{role:'leader',grade:'A',status:'approved'}),'👑 ตั้งหัวหน้า')} disabled={isA}
                      className={`w-full bg-amber-500 text-white py-2.5 rounded-xl font-bold text-sm transition-all ${isA?'opacity-60':'hover:bg-amber-600 active:scale-[.98]'}`}>
                      👑 ตั้งเป็นหัวหน้ากลุ่ม
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
