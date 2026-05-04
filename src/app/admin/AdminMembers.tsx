import { useEffect, useState, useCallback } from 'react'
import {
  fetchAdminMembers, approveMember, rejectMember,
  updateMemberAdminFields, fetchLeaders, assignLeader,
  type LeaderOption,
} from '../../lib/db'
import { isSupabaseReady } from '../../lib/supabase'
import { RefreshCw, Search, Wifi, WifiOff } from 'lucide-react'

const roles    = ['member','farmer','leader']  // สมาชิกเกษตร
const grades   = ['C','B','A','VIP','Premium']
const statuses = ['pending_leader','pending_admin','approved','rejected']

const STATUS_DOT: Record<string, string> = {
  pending_leader: 'bg-amber-400',
  pending_admin:  'bg-orange-400',
  approved:       'bg-emerald-500',
  rejected:       'bg-red-400',
}

interface RowEdit { role: string; grade: string; status: string }

export default function MembersPage() {
  const [data, setData]       = useState<unknown[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [edits, setEdits]     = useState<Record<string, RowEdit>>({})
  const [acting, setActing]   = useState<string|null>(null)
  const [toast, setToast]     = useState<{ok:boolean;msg:string}|null>(null)
  const [leaders, setLeaders]   = useState<LeaderOption[]>([])
  // leader/can_inspect per row: key = farmer.id (from merged row)
  const [editLeader, setEditLeader]     = useState<Record<string, string>>({})
  const [editInspect, setEditInspect]   = useState<Record<string, boolean>>({})

  const flash = (ok:boolean, msg:string) => {
    setToast({ok,msg}); setTimeout(()=>setToast(null),4000)
  }

  const setEdit = (id: string, patch: Partial<RowEdit>) =>
    setEdits(prev => ({...prev, [id]: {...prev[id], ...patch}}))

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [res, lRes] = await Promise.all([fetchAdminMembers(), fetchLeaders()])
      console.log('[AdminMembers] data:', res)  // debug
      setLeaders(lRes)
      setData(res as unknown[])
      // seed edit state
      const init: Record<string,RowEdit> = {}
      ;(res as unknown as Record<string,unknown>[]).forEach((u) => {
        const uid = u.id as string
        init[uid] = {
          role:   String(u.role   ?? 'member'),
          grade:  String(u.grade  ?? 'C'),
          status: String(u.status ?? 'pending_leader'),
        }
        // seed leader/can_inspect from DB row
        if (u.leader_id) setEditLeader(prev => ({ ...prev, [uid]: String(u.leader_id) }))
        setEditInspect(prev => ({ ...prev, [uid]: Boolean(u.can_inspect ?? false) }))
      })
      setEdits(init)
    } catch (e) {
      console.error(e)
      flash(false, 'โหลดข้อมูลไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // summary — ใช้ u.status ตรงๆ (ไม่ผ่าน farmers)
  const rows2 = data as Record<string,unknown>[]
  const farmerRows = rows2.filter(u => u.role === 'farmer' || u.role === 'member')
  const total    = farmerRows.length
  const approved = farmerRows.filter(x => x.status === 'approved').length
  const pending  = farmerRows.filter(x => String(x.status ?? '').includes('pending')).length
  const rejected = farmerRows.filter(x => x.status === 'rejected').length

  // filter + search
  const filtered = rows2.filter(u => {
    const matchSearch =
      String(u.full_name ?? '').includes(search) ||
      String(u.id_card   ?? '').includes(search) ||
      String(u.phone     ?? '').includes(search)
    const matchRole = filterRole === 'all' || u.role === filterRole
    return matchSearch && matchRole
  })

  const act = async (id:string, fn:()=>Promise<void>, msg:string) => {
    setActing(id)
    try   { await fn(); flash(true,msg); await load() }
    catch (e) { flash(false, e instanceof Error ? e.message : 'ไม่สำเร็จ') }
    finally   { setActing(null) }
  }

  const handleAssignLeader = async (u: Record<string, unknown>) => {
    const id       = String(u.id)
    const farmerObj = u.farmer as Record<string,unknown> | null
    const farmerId = String(farmerObj?.id ?? u.id)  // farmers.id
    const leaderId = editLeader[id] || null
    const inspect  = editInspect[id] ?? false
    setActing(id)
    try {
      await assignLeader(farmerId, leaderId, inspect)
      flash(true, `✅ บันทึกหัวหน้ากลุ่ม${inspect ? ' + สิทธิ์ตรวจแปลง' : ''}`)
      await load()
    } catch (e) { flash(false, e instanceof Error ? e.message : 'ไม่สำเร็จ') }
    finally { setActing(null) }
  }

    if (loading) return (
    <div className="flex items-center justify-center py-24 gap-3 text-gray-500">
      <RefreshCw className="w-6 h-6 animate-spin"/>กำลังโหลด...
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
          ${toast.ok
            ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
            : 'bg-red-50 border-red-300 text-red-700'}`}>
          {toast.ok ? '✅' : '❌'} {toast.msg}
          <button onClick={()=>setToast(null)} className="ml-auto text-lg leading-none opacity-60">×</button>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {l:'ทั้งหมด',   n:total,    bg:'bg-gray-50    border-gray-200   text-gray-700'},
          {l:'รออนุมัติ', n:pending,  bg:'bg-amber-50   border-amber-200  text-amber-700'},
          {l:'อนุมัติแล้ว',n:approved,bg:'bg-emerald-50 border-emerald-200 text-emerald-700'},
          {l:'ปฏิเสธ',    n:rejected, bg:'bg-red-50     border-red-200    text-red-700'},
        ].map(({l,n,bg})=>(
          <div key={l} className={`border-2 rounded-2xl p-4 text-center ${bg}`}>
            <div className="text-3xl font-bold">{n}</div>
            <div className="text-sm font-semibold mt-0.5">{l}</div>
          </div>
        ))}
      </div>

      {/* Pending alert */}
      {pending > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border-2 border-red-300 rounded-2xl px-4 py-3">
          <span className="w-8 h-8 rounded-full bg-red-500 text-white font-bold text-sm flex items-center justify-center flex-shrink-0">{pending}</span>
          <span className="font-semibold text-red-800 text-sm">มีคำขอสมัครรออนุมัติ {pending} ราย</span>
        </div>
      )}

      {/* Filter + Search */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-40">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"/>
          <input placeholder="ค้นหา" value={search} onChange={e=>setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"/>
        </div>
        <select value={filterRole} onChange={e=>setFilterRole(e.target.value)}
          className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-emerald-500">
          <option value="all">ทุก role</option>
          {roles.map(r=><option key={r}>{r}</option>)}
        </select>
      </div>

      {/* Empty */}
      {filtered.length === 0 && !loading && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">👥</div>
          <p className="font-medium">ยังไม่มีสมาชิก</p>
          <p className="text-xs mt-1 text-gray-300">เปิด console เพื่อ debug</p>
        </div>
      )}

      {/* Table */}
      {filtered.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase tracking-wide font-semibold">
                  <th className="text-left px-4 py-3">ชื่อ</th>
                  <th className="text-left px-3 py-3">บัตรประชาชน</th>
                  <th className="text-left px-3 py-3">โทร</th>
                  <th className="text-center px-3 py-3">Role</th>
                  <th className="text-center px-3 py-3">Grade</th>
                  <th className="text-center px-3 py-3">Status</th>
                  <th className="text-center px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(u => {
                  const id  = String(u.id)
                  const e   = edits[id] ?? { role: String(u.role ?? 'member'), grade: String(u.grade ?? 'C'), status: String(u.status ?? 'pending_leader') }
                  const isA = acting === id
                  const dot = STATUS_DOT[e.status] ?? 'bg-gray-300'

                  return (
                    <tr key={id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold text-sm flex items-center justify-center flex-shrink-0">
                            {String(u.full_name ?? '?').charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 whitespace-nowrap">{String(u.full_name ?? '-')}</div>
                            <div className="text-xs text-gray-400">
                              {u.created_at ? new Date(String(u.created_at)).toLocaleDateString('th-TH',{month:'short',day:'numeric',year:'2-digit'}) : ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 font-mono text-xs text-gray-600 whitespace-nowrap">{String(u.id_card ?? '-')}</td>
                      <td className="px-3 py-3">
                        <a href={`tel:${u.phone}`} className="text-blue-600 hover:underline font-mono text-xs whitespace-nowrap">{String(u.phone ?? '-')}</a>
                      </td>

                      {/* ROLE */}
                      <td className="px-3 py-3 text-center">
                        <select value={e.role} onChange={ev=>setEdit(id,{role:ev.target.value})}
                          className="border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:border-emerald-500">
                          {roles.map(r=><option key={r}>{r}</option>)}
                        </select>
                      </td>

                      {/* GRADE */}
                      <td className="px-3 py-3 text-center">
                        <select value={e.grade} onChange={ev=>setEdit(id,{grade:ev.target.value})}
                          className="border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:border-emerald-500 w-20">
                          <option value="">-</option>
                          {grades.map(g=><option key={g}>{g}</option>)}
                        </select>
                      </td>

                      {/* STATUS */}
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`}/>
                          <select value={e.status} onChange={ev=>setEdit(id,{status:ev.target.value})}
                            className="border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:border-emerald-500">
                            {statuses.map(s=><option key={s}>{s}</option>)}
                          </select>
                        </div>
                      </td>

                      {/* ACTIONS */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 justify-center flex-wrap">
                          {/* 💾 save role+grade+status */}
                          <button onClick={()=>act(id, ()=>updateMemberAdminFields(id,{role:e.role,grade:e.grade,status:e.status}), `💾 บันทึก`)}
                            disabled={isA}
                            className={`px-2.5 h-7 rounded-lg text-xs font-bold transition-colors ${isA?'bg-blue-100 text-blue-300 cursor-wait':'bg-blue-500 text-white hover:bg-blue-600'}`}>
                            {isA?'…':'💾'}
                          </button>
                          {/* ✔ approve */}
                          <button onClick={()=>act(id, ()=>approveMember(id), `✅ อนุมัติ`)}
                            disabled={isA||e.status==='approved'}
                            className={`w-7 h-7 rounded-lg text-sm font-bold transition-colors
                              ${e.status==='approved'?'bg-gray-100 text-gray-300 cursor-not-allowed':isA?'bg-emerald-100 text-emerald-300 cursor-wait':'bg-emerald-500 text-white hover:bg-emerald-600'}`}>
                            ✔
                          </button>
                          {/* ✖ reject */}
                          <button onClick={()=>act(id, ()=>rejectMember(id), `❌ ปฏิเสธ`)}
                            disabled={isA||e.status==='rejected'}
                            className={`w-7 h-7 rounded-lg text-sm font-bold transition-colors
                              ${e.status==='rejected'?'bg-gray-100 text-gray-300 cursor-not-allowed':isA?'bg-red-100 text-red-300 cursor-wait':'bg-red-500 text-white hover:bg-red-600'}`}>
                            ✖
                          </button>
                          {/* 👑 leader quick action */}
                          <button onClick={()=>act(id, ()=>updateMemberAdminFields(id,{role:'leader',grade:'A',status:'approved'}), `👑 ตั้งหัวหน้า`)}
                            disabled={isA}
                            title="ตั้งหัวหน้ากลุ่ม"
                            className={`px-2.5 h-7 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${isA?'bg-amber-100 text-amber-300 cursor-wait':'bg-amber-500 text-white hover:bg-amber-600'}`}>
                            👑
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 bg-gray-50 border-t text-xs text-gray-500">
            แสดง {filtered.length} จาก {total} รายการ
          </div>
        </div>
      )}
    </div>
  )
}
