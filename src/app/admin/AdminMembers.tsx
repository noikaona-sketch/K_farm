import { useEffect, useState, useCallback } from 'react'
import {
  fetchAdminMembers, approveMember, rejectMember,
  updateMemberAdminFields, type AdminMemberRow,
} from '../../lib/db'
import { isSupabaseReady } from '../../lib/supabase'
import { RefreshCw, Search, Wifi, WifiOff } from 'lucide-react'

// ── constants (from spec) ───────────────────────────────────────────────────────
const roles    = ['member','farmer','leader','inspector','service_provider','admin']
const grades   = ['C','B','A','VIP','Premium']
const statuses = ['pending_leader','pending_admin','approved','rejected']

// ── row edit state (replaces useState inside map — violates Rules of Hooks) ────
interface RowEdit { role: string; grade: string; status: string }

function initEdit(u: AdminMemberRow): RowEdit {
  return {
    role:   u.role ?? 'member',
    grade:  u.grade ?? '',
    status: u.farmers?.[0]?.status ?? 'pending_leader',
  }
}

// ── status dot color ────────────────────────────────────────────────────────────
const STATUS_DOT: Record<string, string> = {
  pending_leader: 'bg-amber-400',
  pending_admin:  'bg-orange-400',
  approved:       'bg-emerald-500',
  rejected:       'bg-red-400',
}

// ── component ───────────────────────────────────────────────────────────────────
export default function MembersPage() {
  const [data, setData]         = useState<AdminMemberRow[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filterRole, setFilterRole] = useState('all')
  // row-level edit state keyed by profile id
  const [edits, setEdits]       = useState<Record<string, RowEdit>>({})
  const [acting, setActing]     = useState<string | null>(null)
  const [toast, setToast]       = useState<{ ok: boolean; msg: string } | null>(null)

  const flash = (ok: boolean, msg: string) => {
    setToast({ ok, msg }); setTimeout(() => setToast(null), 4000)
  }

  const setEdit = (id: string, patch: Partial<RowEdit>) =>
    setEdits(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }))

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchAdminMembers()
      setData(res || [])
      // seed edit state from fresh data
      const init: Record<string, RowEdit> = {}
      res.forEach(u => { init[u.id] = initEdit(u) })
      setEdits(init)
    } catch (e) {
      console.error(e)
      flash(false, 'โหลดข้อมูลไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // ── summary (spec §6) ─────────────────────────────────────────────────────────
  const total    = data.length
  const approved = data.filter(x => x.farmers?.[0]?.status === 'approved').length
  // profiles ที่ไม่มี farmers row ถือว่า pending ด้วย
  const pending  = data.filter(x => {
    const s = x.farmers?.[0]?.status
    return !s || s.includes('pending')
  }).length
  const rejected = data.filter(x => x.farmers?.[0]?.status === 'rejected').length

  // ── filter + search (spec §3) ─────────────────────────────────────────────────
  const filtered = data.filter(u => {
    const matchSearch =
      u.full_name?.includes(search) ||
      (u.id_card ?? '').includes(search) ||
      u.phone?.includes(search)
    const matchRole = filterRole === 'all' || u.role === filterRole
    return matchSearch && matchRole
  })

  // ── action helpers ─────────────────────────────────────────────────────────────
  const act = async (id: string, fn: () => Promise<void>, msg: string) => {
    setActing(id)
    try   { await fn(); flash(true, msg); await load() }
    catch (e) { flash(false, e instanceof Error ? e.message : 'ไม่สำเร็จ') }
    finally   { setActing(null) }
  }

  // ── render ─────────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center py-24 gap-3 text-gray-500">
      <RefreshCw className="w-6 h-6 animate-spin" /> กำลังโหลด...
    </div>
  )

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">สมาชิก / อนุมัติสมาชิก</h1>
          <span className="flex items-center gap-1.5 text-sm mt-0.5">
            {isSupabaseReady
              ? <><Wifi className="w-3.5 h-3.5 text-emerald-600" /><span className="text-emerald-600">Supabase</span></>
              : <><WifiOff className="w-3.5 h-3.5 text-amber-500" /><span className="text-amber-600">Mock</span></>}
          </span>
        </div>
        <button onClick={() => { setLoading(true); load() }}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm hover:bg-gray-50 shadow-sm">
          <RefreshCw className="w-4 h-4" /> รีโหลด
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`rounded-xl px-4 py-3 flex items-center gap-2 text-sm font-medium border
          ${toast.ok
            ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
            : 'bg-red-50 border-red-300 text-red-700'}`}>
          {toast.ok ? '✅' : '❌'} {toast.msg}
          <button onClick={() => setToast(null)} className="ml-auto text-lg leading-none opacity-60 hover:opacity-100">×</button>
        </div>
      )}

      {/* Summary (spec §6) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'ทั้งหมด',       n: total,    bg: 'bg-gray-50    border-gray-200   text-gray-700'    },
          { label: 'รออนุมัติ',     n: pending,  bg: 'bg-amber-50   border-amber-200  text-amber-700'   },
          { label: 'อนุมัติแล้ว',   n: approved, bg: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
          { label: 'ปฏิเสธ',       n: rejected, bg: 'bg-red-50     border-red-200    text-red-700'     },
        ].map(({ label, n, bg }) => (
          <div key={label} className={`border-2 rounded-2xl p-4 text-center ${bg}`}>
            <div className="text-3xl font-bold">{n}</div>
            <div className="text-sm font-semibold mt-0.5">{label}</div>
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

      {/* Filter + Search (spec §3) */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-40">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            placeholder="ค้นหา"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>
        <select
          value={filterRole}
          onChange={e => setFilterRole(e.target.value)}
          className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 bg-white">
          <option value="all">ทุก role</option>
          {roles.map(r => <option key={r}>{r}</option>)}
        </select>
      </div>

      {/* Empty */}
      {filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">👥</div>
          <p className="font-medium">ยังไม่มีสมาชิก</p>
        </div>
      )}

      {/* Table (spec §4) */}
      {filtered.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide font-semibold">
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
                  // per-row edit state (no useState in loop — uses edits map)
                  const e    = edits[u.id] ?? initEdit(u)
                  const isA  = acting === u.id
                  const dot  = STATUS_DOT[e.status] ?? 'bg-gray-300'

                  return (
                    <tr key={u.id} className="hover:bg-gray-50/60 transition-colors">

                      {/* ชื่อ */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold text-sm flex items-center justify-center flex-shrink-0">
                            {u.full_name?.charAt(0)}
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
                        <a href={`tel:${u.phone}`} className="text-blue-600 hover:underline font-mono text-xs whitespace-nowrap">{u.phone}</a>
                      </td>

                      {/* ROLE dropdown (spec §4) */}
                      <td className="px-3 py-3 text-center">
                        <select
                          value={e.role}
                          onChange={ev => setEdit(u.id, { role: ev.target.value })}
                          className="border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:border-emerald-500">
                          {roles.map(r => <option key={r}>{r}</option>)}
                        </select>
                      </td>

                      {/* GRADE dropdown */}
                      <td className="px-3 py-3 text-center">
                        <select
                          value={e.grade}
                          onChange={ev => setEdit(u.id, { grade: ev.target.value })}
                          className="border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:border-emerald-500 w-20">
                          <option value="">-</option>
                          {grades.map(g => <option key={g}>{g}</option>)}
                        </select>
                      </td>

                      {/* STATUS dropdown */}
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
                          <select
                            value={e.status}
                            onChange={ev => setEdit(u.id, { status: ev.target.value })}
                            className="border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:border-emerald-500">
                            {statuses.map(s => <option key={s}>{s}</option>)}
                          </select>
                        </div>
                      </td>

                      {/* ACTION (spec §4 + §5) */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 justify-center flex-wrap">

                          {/* 💾 บันทึก role+grade+status */}
                          <button
                            onClick={() => act(u.id,
                              () => updateMemberAdminFields(u.id, { role: e.role, grade: e.grade, status: e.status }),
                              `💾 บันทึก ${u.full_name}`)}
                            disabled={isA}
                            className={`px-2.5 h-7 rounded-lg text-xs font-bold transition-colors whitespace-nowrap
                              ${isA ? 'bg-blue-100 text-blue-300 cursor-wait' : 'bg-blue-500 text-white hover:bg-blue-600'}`}>
                            {isA ? '…' : '💾'}
                          </button>

                          {/* ✔ อนุมัติ */}
                          <button
                            onClick={() => act(u.id, () => approveMember(u.id), `✅ อนุมัติ ${u.full_name}`)}
                            disabled={isA || e.status === 'approved'}
                            title="อนุมัติ"
                            className={`w-7 h-7 rounded-lg text-sm font-bold transition-colors
                              ${e.status === 'approved'
                                ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                                : isA ? 'bg-emerald-100 text-emerald-300 cursor-wait'
                                : 'bg-emerald-500 text-white hover:bg-emerald-600'}`}>
                            ✔
                          </button>

                          {/* ✖ ปฏิเสธ */}
                          <button
                            onClick={() => act(u.id, () => rejectMember(u.id), `❌ ปฏิเสธ ${u.full_name}`)}
                            disabled={isA || e.status === 'rejected'}
                            title="ปฏิเสธ"
                            className={`w-7 h-7 rounded-lg text-sm font-bold transition-colors
                              ${e.status === 'rejected'
                                ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                                : isA ? 'bg-red-100 text-red-300 cursor-wait'
                                : 'bg-red-500 text-white hover:bg-red-600'}`}>
                            ✖
                          </button>

                          {/* ตั้งหัวหน้า (quick action spec §5) */}
                          <button
                            onClick={() => act(u.id,
                              () => updateMemberAdminFields(u.id, { role: 'leader', grade: 'A', status: 'approved' }),
                              `👑 ตั้ง ${u.full_name} เป็นหัวหน้า`)}
                            disabled={isA}
                            title="ตั้งหัวหน้ากลุ่ม"
                            className={`px-2.5 h-7 rounded-lg text-xs font-bold whitespace-nowrap transition-colors
                              ${isA ? 'bg-amber-100 text-amber-300 cursor-wait' : 'bg-amber-500 text-white hover:bg-amber-600'}`}>
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
