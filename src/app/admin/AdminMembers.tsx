import { useEffect, useState, useCallback } from 'react'
import {
  fetchAdminMembers, approveMember, rejectMember, updateRoleGrade,
  type AdminMemberRow,
} from '../../lib/db'
import { isSupabaseReady } from '../../lib/supabase'
import { RefreshCw, Search, Wifi, WifiOff } from 'lucide-react'

// ── helpers ────────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; dot: string }> = {
  pending_leader: { label: 'รอ Leader',    dot: 'bg-amber-400' },
  pending_admin:  { label: 'รอ Admin',     dot: 'bg-orange-400' },
  approved:       { label: 'อนุมัติแล้ว', dot: 'bg-emerald-500' },
  rejected:       { label: 'ปฏิเสธ',      dot: 'bg-red-400' },
}

const ROLE_OPTIONS  = ['member','farmer','leader','inspector','admin']
const GRADE_OPTIONS = ['','A','B','C','D']

function farmer0(row: AdminMemberRow) { return row.farmers?.[0] ?? null }

// ── component ──────────────────────────────────────────────────────────────────

export default function MembersPage() {
  const [data, setData]         = useState<AdminMemberRow[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filter, setFilter]     = useState<'all'|'pending'|'approved'|'rejected'>('all')
  const [acting, setActing]     = useState<string|null>(null)
  const [toast, setToast]       = useState<{ok:boolean;msg:string}|null>(null)
  // inline role/grade edit
  const [editRole,  setEditRole]  = useState<Record<string,string>>({})
  const [editGrade, setEditGrade] = useState<Record<string,string>>({})

  const flash = (ok:boolean, msg:string) => {
    setToast({ok,msg}); setTimeout(()=>setToast(null),4000)
  }

  const load = useCallback(async () => {
    try {
      const res = await fetchAdminMembers()
      setData(res || [])
    } catch (e) {
      console.error(e)
      flash(false, 'โหลดข้อมูลไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const act = async (id:string, fn:()=>Promise<void>, msg:string) => {
    setActing(id)
    try { await fn(); flash(true,msg); await load() }
    catch(e) { flash(false, e instanceof Error ? e.message : 'ไม่สำเร็จ') }
    finally { setActing(null) }
  }

  // filter + search
  const rows = data
    .filter(u => {
      const s = farmer0(u)?.status ?? ''
      if (filter==='pending')  return s==='pending_leader'||s==='pending_admin'
      if (filter==='approved') return s==='approved'
      if (filter==='rejected') return s==='rejected'
      return true
    })
    .filter(u =>
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.id_card.includes(search) || u.phone.includes(search)
    )

  const pendingCount = data.filter(u=>{
    const s=farmer0(u)?.status??''
    return s==='pending_leader'||s==='pending_admin'
  }).length

  if (loading) return (
    <div className="flex items-center justify-center py-24 gap-3 text-gray-500">
      <RefreshCw className="w-6 h-6 animate-spin" />กำลังโหลด...
    </div>
  )

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">สมาชิก / อนุมัติสมาชิก</h1>
          <div className="flex items-center gap-1.5 mt-0.5 text-sm">
            {isSupabaseReady
              ? <><Wifi className="w-3.5 h-3.5 text-emerald-600"/><span className="text-emerald-600">Supabase</span></>
              : <><WifiOff className="w-3.5 h-3.5 text-amber-500"/><span className="text-amber-600">Mock data</span></>}
            <span className="text-gray-400">• {data.length} รายการ</span>
          </div>
        </div>
        <button onClick={()=>{setLoading(true);load()}}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 shadow-sm">
          <RefreshCw className="w-4 h-4"/>รีโหลด
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`rounded-xl px-4 py-3 flex items-center gap-2 text-sm font-medium border
          ${toast.ok
            ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
            : 'bg-red-50 border-red-300 text-red-700'}`}>
          <span>{toast.ok ? '✅' : '❌'}</span>{toast.msg}
          <button onClick={()=>setToast(null)} className="ml-auto opacity-60 hover:opacity-100 text-lg leading-none">×</button>
        </div>
      )}

      {/* Pending alert */}
      {pendingCount > 0 && (
        <button onClick={()=>setFilter('pending')}
          className="w-full flex items-center gap-3 bg-red-50 border-2 border-red-300 rounded-2xl px-4 py-3 hover:bg-red-100 transition-colors text-left">
          <span className="w-8 h-8 rounded-full bg-red-500 text-white font-bold flex items-center justify-center text-sm flex-shrink-0">{pendingCount}</span>
          <div>
            <div className="font-bold text-red-800 text-sm">มีคำขอสมัครรออนุมัติ {pendingCount} ราย</div>
            <div className="text-xs text-red-600">กดกรองดูเฉพาะรายที่รออนุมัติ →</div>
          </div>
        </button>
      )}

      {/* Filter tabs + search */}
      <div className="flex flex-wrap gap-2">
        {([
          ['all','ทั้งหมด',data.length],
          ['pending','รออนุมัติ',pendingCount],
          ['approved','อนุมัติแล้ว',data.filter(u=>farmer0(u)?.status==='approved').length],
          ['rejected','ปฏิเสธ',data.filter(u=>farmer0(u)?.status==='rejected').length],
        ] as [typeof filter,string,number][]).map(([k,label,n])=>(
          <button key={k} onClick={()=>setFilter(k)}
            className={`px-4 py-1.5 rounded-xl text-sm font-semibold border transition-all
              ${filter===k
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
            {label} <span className="opacity-70">({n})</span>
          </button>
        ))}
        <div className="relative flex-1 min-w-40">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"/>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="ค้นหาชื่อ บัตร เบอร์..."
            className="w-full pl-8 pr-3 py-1.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"/>
        </div>
      </div>

      {/* Empty */}
      {rows.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">👥</div>
          <p className="font-medium">ยังไม่มีสมาชิก</p>
        </div>
      )}

      {/* Table (desktop) */}
      {rows.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-semibold text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3">ชื่อ</th>
                  <th className="text-left px-3 py-3">บัตรประชาชน</th>
                  <th className="text-left px-3 py-3">โทร</th>
                  <th className="text-left px-3 py-3">พื้นที่</th>
                  <th className="text-center px-3 py-3">Role</th>
                  <th className="text-center px-3 py-3">Grade</th>
                  <th className="text-center px-3 py-3">Status</th>
                  <th className="text-center px-3 py-3">LINE</th>
                  <th className="text-center px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map(u => {
                  const f   = farmer0(u)
                  const st  = STATUS_CFG[f?.status??''] ?? {label:f?.status??'-', dot:'bg-gray-300'}
                  const isA = acting === u.id

                  return (
                    <tr key={u.id} className="hover:bg-gray-50/60 transition-colors">

                      {/* ชื่อ */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold text-sm flex items-center justify-center flex-shrink-0">
                            {u.full_name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 whitespace-nowrap">{u.full_name}</div>
                            <div className="text-xs text-gray-400">
                              {new Date(u.created_at).toLocaleDateString('th-TH',{month:'short',day:'numeric',year:'2-digit'})}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* บัตร */}
                      <td className="px-3 py-3 font-mono text-xs text-gray-600 whitespace-nowrap">{u.id_card}</td>

                      {/* โทร */}
                      <td className="px-3 py-3">
                        <a href={`tel:${u.phone}`} className="text-blue-600 hover:underline font-mono text-xs whitespace-nowrap">
                          {u.phone}
                        </a>
                      </td>

                      {/* พื้นที่ */}
                      <td className="px-3 py-3 text-gray-600 text-xs whitespace-nowrap">
                        {f?.province && f?.district
                          ? `${f.province} / ${f.district}`
                          : <span className="text-gray-300">-</span>}
                      </td>

                      {/* Role — inline edit */}
                      <td className="px-3 py-3 text-center">
                        <select
                          value={editRole[u.id] ?? u.role}
                          onChange={e=>setEditRole(r=>({...r,[u.id]:e.target.value}))}
                          className="border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:border-emerald-500 w-24">
                          {ROLE_OPTIONS.map(r=><option key={r} value={r}>{r}</option>)}
                        </select>
                      </td>

                      {/* Grade — inline edit */}
                      <td className="px-3 py-3 text-center">
                        <select
                          value={editGrade[u.id] ?? (u.grade??'')}
                          onChange={e=>setEditGrade(g=>({...g,[u.id]:e.target.value}))}
                          className="border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:border-emerald-500 w-16">
                          {GRADE_OPTIONS.map(g=><option key={g} value={g}>{g||'-'}</option>)}
                        </select>
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${st.dot}`}/>
                          <span className="text-xs font-medium text-gray-700">{st.label}</span>
                        </div>
                      </td>

                      {/* LINE */}
                      <td className="px-3 py-3 text-center text-xs">
                        {u.line_verify_status === 'verified'
                          ? <span className="text-emerald-600 font-semibold">✓ ยืนยัน</span>
                          : <span className="text-gray-400">{u.line_verify_status || '-'}</span>}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 justify-center flex-wrap">
                          {/* อนุมัติ */}
                          <button
                            onClick={() => act(u.id, ()=>approveMember(u.id), `✅ อนุมัติ ${u.full_name}`)}
                            disabled={isA || f?.status==='approved'}
                            title="อนุมัติ"
                            className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold transition-colors
                              ${f?.status==='approved'
                                ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                                : isA ? 'bg-emerald-100 text-emerald-300 cursor-wait'
                                : 'bg-emerald-500 text-white hover:bg-emerald-600'}`}>
                            {isA ? '…' : '✔'}
                          </button>

                          {/* ปฏิเสธ */}
                          <button
                            onClick={() => act(u.id, ()=>rejectMember(u.id), `❌ ปฏิเสธ ${u.full_name}`)}
                            disabled={isA || f?.status==='rejected'}
                            title="ปฏิเสธ"
                            className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold transition-colors
                              ${f?.status==='rejected'
                                ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                                : isA ? 'bg-red-100 text-red-300 cursor-wait'
                                : 'bg-red-500 text-white hover:bg-red-600'}`}>
                            ✖
                          </button>

                          {/* บันทึก Role/Grade */}
                          <button
                            onClick={() => act(u.id,
                              ()=>updateRoleGrade(u.id,
                                editRole[u.id]??u.role,
                                editGrade[u.id]??(u.grade??'')),
                              `🔐 อัปเดต ${u.full_name}`)}
                            disabled={isA}
                            title="บันทึก Role/Grade"
                            className={`px-2 h-7 rounded-lg text-xs font-bold whitespace-nowrap transition-colors
                              ${isA
                                ? 'bg-blue-100 text-blue-300 cursor-wait'
                                : 'bg-blue-500 text-white hover:bg-blue-600'}`}>
                            {isA ? '…' : '💾 บันทึก'}
                          </button>
                        </div>
                      </td>

                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 text-xs text-gray-500">
            แสดง {rows.length} จาก {data.length} รายการ
          </div>
        </div>
      )}
    </div>
  )
}
