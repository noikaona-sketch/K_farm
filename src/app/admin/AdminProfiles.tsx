import { useEffect, useState, useCallback } from 'react'
import {
  fetchAdminMembers, approveMember, rejectMember,
  updateMemberAdminFields,
} from '../../lib/db'
import { isSupabaseReady, supabase } from '../../lib/supabase'
import { RefreshCw, Search, Check, X, ChevronDown, ChevronUp, Wifi, WifiOff, Phone } from 'lucide-react'
import { ROLE_LABEL, ROLE_COLOR } from '../../lib/roles'
import type { AppRole } from '../../lib/roles'
import { DEPARTMENTS } from '../../lib/permissions'

// ── constants ─────────────────────────────────────────────────────────────────
const ALL_ROLES: AppRole[] = ['member','farmer','leader','inspector','service_provider','field_staff','admin']

const PLATFORM: Record<string, string> = {
  member:'📱 LINE', farmer:'📱 LINE', leader:'📱 LINE',
  inspector:'📱 LINE', service_provider:'📱 LINE', field_staff:'📱 LINE',
  admin:'💻 Web',
}

const STATUS_CFG: Record<string,{label:string;bg:string;text:string}> = {
  pending_leader: {label:'รอหัวหน้า', bg:'bg-amber-50 border-amber-300', text:'text-amber-700'},
  pending_admin:  {label:'รออนุมัติ', bg:'bg-orange-50 border-orange-300',text:'text-orange-700'},
  approved:       {label:'อนุมัติแล้ว',bg:'bg-emerald-50 border-emerald-300',text:'text-emerald-700'},
  rejected:       {label:'ปฏิเสธ',   bg:'bg-red-50 border-red-300',      text:'text-red-700'},
}

interface RowEdit { role: string; department: string }

async function saveDept(profileId: string, dept: string) {
  if (!supabase) { console.info('[mock] saveDept', profileId, dept); return }
  const { error } = await supabase
    .from('profiles')
    .update({ department: dept || null })
    .eq('id', profileId)
  if (error) throw new Error(error.message)
}

// ── component ─────────────────────────────────────────────────────────────────
export default function AdminProfiles() {
  const [data, setData]     = useState<Record<string,unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [expanded, setExpanded] = useState<string|null>(null)
  const [edits, setEdits]   = useState<Record<string,RowEdit>>({})
  const [acting, setActing] = useState<string|null>(null)
  const [toast, setToast]   = useState<{ok:boolean;msg:string}|null>(null)

  const flash = (ok:boolean, msg:string) => {
    setToast({ok,msg}); setTimeout(()=>setToast(null),4000)
  }

  const setEdit = (id:string, patch:Partial<RowEdit>) =>
    setEdits(p=>({...p,[id]:{...p[id],...patch}}))

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchAdminMembers()
      const all = res as unknown as Record<string,unknown>[]
      setData(all)
      // seed edits
      const init: Record<string,RowEdit> = {}
      all.forEach(u => {
        init[String(u.id)] = {
          role:       String(u.role ?? 'member'),
          department: String(u.department ?? ''),
        }
      })
      setEdits(init)
    } catch { flash(false,'โหลดข้อมูลไม่สำเร็จ') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const act = async (id:string, fn:()=>Promise<void>, msg:string) => {
    setActing(id); try { await fn(); flash(true,msg); await load() }
    catch(e) { flash(false, e instanceof Error?e.message:'ไม่สำเร็จ') }
    finally { setActing(null) }
  }

  const handleSave = async (u: Record<string,unknown>) => {
    const id = String(u.id)
    const e  = edits[id]
    if (!e) return
    setActing(id)
    try {
      await Promise.all([
        updateMemberAdminFields(id, { role: e.role }),
        saveDept(id, e.department),
      ])
      flash(true, `✅ บันทึก ${String(u.full_name)} → role: ${e.role}${e.department ? ', dept: '+e.department : ''}`)
      await load()
    } catch(err) { flash(false, err instanceof Error?err.message:'ไม่สำเร็จ') }
    finally { setActing(null) }
  }

  // ── summary ──────────────────────────────────────────────────────────────────
  const total   = data.length
  const pending = data.filter(u=>String(u.status??'').includes('pending')||u.role==='member').length
  const approved= data.filter(u=>u.status==='approved').length

  // ── filter ───────────────────────────────────────────────────────────────────
  const rows = data.filter(u => {
    const matchRole   = filterRole==='all'   || u.role===filterRole
    const matchStatus = filterStatus==='all' ||
      (filterStatus==='pending' ? String(u.status??'').includes('pending')||u.role==='member'
      : filterStatus==='approved' ? u.status==='approved'
      : u.status===filterStatus)
    const matchSearch =
      String(u.full_name??'').includes(search)||
      String(u.id_card??'').includes(search)||
      String(u.phone??'').includes(search)
    return matchRole && matchStatus && matchSearch
  })

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Profile ทั้งหมด</h1>
          <p className="text-sm text-gray-500 mt-0.5">อนุมัติสิทธิ์และกำหนด Role / Department ทุก profile</p>
          <div className="flex items-center gap-1.5 mt-0.5 text-xs">
            {isSupabaseReady
              ? <><Wifi className="w-3 h-3 text-emerald-600"/><span className="text-emerald-600">Supabase · profiles</span></>
              : <><WifiOff className="w-3 h-3 text-amber-500"/><span className="text-amber-600">Mock</span></>}
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
      <div className="grid grid-cols-3 gap-3">
        {[
          {l:'ทั้งหมด',       n:total,   bg:'border-gray-200 bg-gray-50 text-gray-700', k:'all'},
          {l:'รอกำหนดสิทธิ์', n:pending, bg:'border-amber-200 bg-amber-50 text-amber-700', k:'pending'},
          {l:'อนุมัติแล้ว',   n:approved,bg:'border-emerald-200 bg-emerald-50 text-emerald-700', k:'approved'},
        ].map(({l,n,bg,k})=>(
          <button key={k} onClick={()=>setFilterStatus(k)}
            className={`border-2 rounded-2xl p-4 text-center transition-all cursor-pointer hover:opacity-80 ${bg}
              ${filterStatus===k?'ring-2 ring-offset-1 ring-current':''}`}>
            <div className="text-2xl font-bold">{loading?'…':n}</div>
            <div className="text-xs font-semibold mt-0.5">{l}</div>
          </button>
        ))}
      </div>

      {/* Pending alert */}
      {pending > 0 && filterStatus !== 'pending' && (
        <button onClick={()=>setFilterStatus('pending')}
          className="w-full bg-amber-50 border-2 border-amber-300 rounded-2xl p-3 flex items-center gap-3 hover:bg-amber-100 transition-colors text-left">
          <span className="w-8 h-8 rounded-full bg-amber-500 text-white font-bold text-sm flex items-center justify-center flex-shrink-0">{pending}</span>
          <div>
            <div className="font-bold text-amber-800 text-sm">มี {pending} profile รอกำหนดสิทธิ์</div>
            <div className="text-xs text-amber-600">กดเพื่อกรองดูเฉพาะรายที่รอ →</div>
          </div>
        </button>
      )}

      {/* Filter bar */}
      <div className="flex gap-2 flex-wrap">
        {/* Role filter */}
        <select value={filterRole} onChange={e=>setFilterRole(e.target.value)}
          className="border-2 border-gray-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:border-emerald-500">
          <option value="all">ทุก role</option>
          {ALL_ROLES.map(r=><option key={r} value={r}>{ROLE_LABEL[r]} ({r})</option>)}
        </select>

        {/* Search */}
        <div className="relative flex-1 min-w-40">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"/>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="ค้นหาชื่อ เลขบัตร เบอร์"
            className="w-full pl-8 pr-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"/>
        </div>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="flex justify-center py-12"><RefreshCw className="w-6 h-6 text-emerald-600 animate-spin"/></div>
      ) : rows.length===0 ? (
        <div className="text-center py-14 text-gray-400">
          <div className="text-5xl mb-3">👤</div>
          <p className="font-medium">ไม่พบข้อมูล</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map(u => {
            const id   = String(u.id)
            const e    = edits[id] ?? {role:String(u.role??'member'), department:String(u.department??'')}
            const isA  = acting===id
            const isExp= expanded===id
            const st   = STATUS_CFG[String(u.status??'')] ?? null
            const rc   = ROLE_COLOR[e.role as AppRole] ?? 'bg-gray-100 text-gray-600'
            const isPending = String(u.status??'').includes('pending') || u.role==='member'
            const farmerObj = u.farmer as Record<string,unknown>|null

            return (
              <div key={id} className={`bg-white rounded-2xl shadow-sm overflow-hidden border-2 transition-all
                ${isPending ? 'border-amber-200' : 'border-gray-100'}`}>

                {/* Card summary row */}
                <button className="w-full p-4 text-left hover:bg-gray-50/50 transition-colors"
                  onClick={()=>setExpanded(isExp?null:id)}>
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-base flex-shrink-0 ${rc}`}>
                      {String(u.full_name??'?').charAt(0)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-900">{String(u.full_name??'-')}</span>
                        {/* Role badge */}
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${rc}`}>
                          {ROLE_LABEL[e.role as AppRole] ?? e.role}
                        </span>
                        {/* Platform */}
                        <span className="text-[10px] text-gray-400">{PLATFORM[String(u.role??'member')]}</span>
                        {/* Status */}
                        {st && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${st.bg} ${st.text}`}>
                            {st.label}
                          </span>
                        )}
                        {/* Pending indicator */}
                        {isPending && !st && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-amber-50 border border-amber-300 text-amber-700">
                            รอกำหนดสิทธิ์
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5 flex gap-3">
                        <span className="font-mono">{String(u.id_card??'')}</span>
                        {u.department ? <span>🏢 {DEPARTMENTS.find((d: {value:string})=>d.value===String(u.department))?.label ?? String(u.department)}</span> : null}
                        {farmerObj?.province ? <span>📍 {String(farmerObj.province)}</span> : null}
                      </div>
                    </div>

                    {isExp
                      ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0"/>
                      : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0"/>}
                  </div>
                </button>

                {/* Expanded — กำหนดสิทธิ์ */}
                {isExp && (
                  <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-4">

                    {/* Info quick view */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-white rounded-xl p-2.5">
                        <div className="text-gray-400">📞 เบอร์</div>
                        <div className="font-semibold mt-0.5">{String(u.phone??'-')}</div>
                      </div>
                      <div className="bg-white rounded-xl p-2.5">
                        <div className="text-gray-400">📍 พื้นที่</div>
                        <div className="font-semibold mt-0.5">
                          {[farmerObj?.province, farmerObj?.district].filter(Boolean).map(v=>String(v)).join(' / ') || '-'}
                        </div>
                      </div>
                    </div>

                    {/* Phone */}
                    {String(u.phone ?? '') !== '' && (
                      <a href={`tel:${u.phone}`}
                        className="flex items-center justify-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl py-2.5 text-sm font-semibold hover:bg-blue-100 transition-colors">
                        <Phone className="w-4 h-4"/>โทร {String(u.phone)}
                      </a>
                    )}

                    {/* ── กำหนด Role ── */}
                    <div>
                      <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">กำหนด Role (Platform)</div>
                      <div className="flex flex-wrap gap-2">
                        {ALL_ROLES.map(r=>(
                          <button key={r} onClick={()=>setEdit(id,{role:r})}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border-2 transition-all
                              ${e.role===r
                                ?'bg-gray-800 border-gray-800 text-white shadow-sm'
                                :'bg-white border-gray-200 text-gray-600 hover:border-gray-400'}`}>
                            <span>{PLATFORM[r]?.charAt(0)}</span>
                            <span>{ROLE_LABEL[r]}</span>
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1.5">
                        📱 LINE = member, farmer, leader, inspector, service_provider, field_staff &nbsp;·&nbsp; 💻 Web = admin
                      </p>
                    </div>

                    {/* ── กำหนด Department (เฉพาะ admin) ── */}
                    {(e.role==='admin' || e.role==='field_staff') && (
                      <div>
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Department (Web Admin)</div>
                        <div className="flex flex-wrap gap-2">
                          {(DEPARTMENTS as {value:string;label:string;icon:string}[]).map(d=>(
                            <button key={d.value} onClick={()=>setEdit(id,{department:d.value})}
                              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border-2 transition-all
                                ${e.department===d.value
                                  ?'bg-purple-600 border-purple-600 text-white shadow-sm'
                                  :'bg-white border-gray-200 text-gray-600 hover:border-purple-300'}`}>
                              <span>{d.icon}</span><span>{d.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ── Approve / Reject ── */}
                    {isPending && (
                      <div className="flex gap-2">
                        <button onClick={()=>act(id,()=>rejectMember(id),'❌ ปฏิเสธ')} disabled={isA}
                          className={`flex-1 border-2 border-red-200 text-red-600 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 transition-colors ${isA?'opacity-60':'hover:bg-red-50'}`}>
                          {isA?<RefreshCw className="w-4 h-4 animate-spin"/>:<X className="w-4 h-4"/>}ปฏิเสธ
                        </button>
                        <button onClick={()=>act(id,()=>approveMember(id),'✅ อนุมัติ')} disabled={isA}
                          className={`flex-1 bg-emerald-600 text-white py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 transition-colors ${isA?'opacity-60':'hover:bg-emerald-700'}`}>
                          {isA?<RefreshCw className="w-4 h-4 animate-spin"/>:<Check className="w-4 h-4"/>}อนุมัติ
                        </button>
                      </div>
                    )}

                    {/* ── Save role + department ── */}
                    <button onClick={()=>handleSave(u)} disabled={isA}
                      className={`w-full bg-gray-800 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all
                        ${isA?'opacity-60':'hover:bg-gray-700 active:scale-[.98]'}`}>
                      {isA?<><RefreshCw className="w-4 h-4 animate-spin"/>กำลังบันทึก...</>:<><Check className="w-4 h-4"/>บันทึก Role + Department</>}
                    </button>

                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="text-xs text-gray-400 text-center pt-2">
        แสดง {rows.length} จาก {total} profile
      </div>
    </div>
  )
}
