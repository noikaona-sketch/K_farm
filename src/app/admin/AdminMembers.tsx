import React, { useEffect, useState, useCallback } from 'react'
import {
  RefreshCw, Search, Check, X, ChevronDown, ChevronUp,
  Phone, AlertCircle, Wifi, WifiOff,
} from 'lucide-react'
import {
  fetchAdminMembers, approveMember, rejectMember, updateRoleGrade,
  type AdminMemberRow,
} from '../../lib/db'
import { isSupabaseReady } from '../../lib/supabase'

// ── helpers ────────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; bg: string; text: string }> = {
  pending_leader: { label: 'รอ Leader',  bg: 'bg-amber-100',   text: 'text-amber-700' },
  pending_admin:  { label: 'รอ Admin',   bg: 'bg-orange-100',  text: 'text-orange-700' },
  approved:       { label: 'อนุมัติแล้ว', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  rejected:       { label: 'ปฏิเสธ',    bg: 'bg-red-100',     text: 'text-red-700' },
}

const ROLE_OPTIONS = ['member', 'farmer', 'leader', 'inspector', 'admin']
const GRADE_OPTIONS = ['', 'A', 'B', 'C', 'D']

function farmerOf(row: AdminMemberRow) {
  return row.farmers?.[0] ?? null
}

// ── component ──────────────────────────────────────────────────────────────────

export default function AdminMembers() {
  const [rows, setRows]       = useState<AdminMemberRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [filter, setFilter]   = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [expanded, setExpanded]       = useState<string | null>(null)
  const [actionNote, setActionNote]   = useState<Record<string, string>>({})
  const [acting, setActing]           = useState<string | null>(null)  // profileId being processed
  const [toast, setToast]             = useState<{ ok: boolean; msg: string } | null>(null)
  // role/grade edit state per row
  const [editRole, setEditRole]   = useState<Record<string, string>>({})
  const [editGrade, setEditGrade] = useState<Record<string, string>>({})

  const showToast = (ok: boolean, msg: string) => {
    setToast({ ok, msg })
    setTimeout(() => setToast(null), 4000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchAdminMembers()
      setRows(data)
    } catch (e: unknown) {
      showToast(false, e instanceof Error ? e.message : 'โหลดข้อมูลไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleApprove = async (row: AdminMemberRow) => {
    setActing(row.id)
    try {
      await approveMember(row.id)
      showToast(true, `✅ อนุมัติ ${row.full_name} สำเร็จ${isSupabaseReady ? ' (Supabase)' : ' (Mock)'}`)
      await load()
    } catch (e: unknown) {
      showToast(false, e instanceof Error ? e.message : 'อนุมัติไม่สำเร็จ')
    } finally { setActing(null) }
  }

  const handleReject = async (row: AdminMemberRow) => {
    setActing(row.id)
    try {
      await rejectMember(row.id)
      showToast(true, `❌ ปฏิเสธ ${row.full_name} แล้ว`)
      await load()
    } catch (e: unknown) {
      showToast(false, e instanceof Error ? e.message : 'ปฏิเสธไม่สำเร็จ')
    } finally { setActing(null) }
  }

  const handleRoleGrade = async (row: AdminMemberRow) => {
    const role  = editRole[row.id]  ?? row.role
    const grade = editGrade[row.id] ?? row.grade ?? ''
    setActing(row.id)
    try {
      await updateRoleGrade(row.id, role, grade)
      showToast(true, `🔐 อัปเดต ${row.full_name} → role: ${role}, grade: ${grade || '-'}`)
      await load()
    } catch (e: unknown) {
      showToast(false, e instanceof Error ? e.message : 'อัปเดตไม่สำเร็จ')
    } finally { setActing(null) }
  }

  // filter + search
  const displayed = rows.filter(r => {
    const f = farmerOf(r)
    if (filter === 'pending')  return f?.status === 'pending_leader' || f?.status === 'pending_admin'
    if (filter === 'approved') return f?.status === 'approved'
    if (filter === 'rejected') return f?.status === 'rejected'
    return true
  }).filter(r =>
    r.full_name.toLowerCase().includes(search.toLowerCase()) ||
    r.id_card.includes(search) ||
    r.phone.includes(search)
  )

  const pendingCount = rows.filter(r => {
    const s = farmerOf(r)?.status ?? ''
    return s === 'pending_leader' || s === 'pending_admin'
  }).length

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">สมาชิก / อนุมัติสมาชิก</h1>
          <div className="flex items-center gap-1.5 mt-1">
            {isSupabaseReady
              ? <><Wifi className="w-3.5 h-3.5 text-emerald-600" /><span className="text-sm text-emerald-600">Supabase: profiles + farmers</span></>
              : <><WifiOff className="w-3.5 h-3.5 text-amber-500" /><span className="text-sm text-amber-600">Mock data</span></>}
          </div>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />รีโหลด
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`border-2 rounded-xl px-4 py-3 flex items-center gap-2 text-sm font-semibold
          ${toast.ok ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-red-50 border-red-300 text-red-700'}`}>
          {toast.ok ? <Check className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          {toast.msg}
          <button onClick={() => setToast(null)} className="ml-auto opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {([
          ['all',      'ทั้งหมด',       rows.length,    'border-gray-200 bg-gray-50 text-gray-700'],
          ['pending',  'รออนุมัติ',     pendingCount,   'border-amber-200 bg-amber-50 text-amber-700'],
          ['approved', 'อนุมัติแล้ว',   rows.filter(r => farmerOf(r)?.status === 'approved').length, 'border-emerald-200 bg-emerald-50 text-emerald-700'],
          ['rejected', 'ปฏิเสธ',       rows.filter(r => farmerOf(r)?.status === 'rejected').length, 'border-red-200 bg-red-50 text-red-700'],
        ] as [typeof filter, string, number, string][]).map(([k, label, count, cls]) => (
          <button key={k} onClick={() => setFilter(k)}
            className={`border-2 rounded-2xl p-4 text-center transition-all cursor-pointer hover:opacity-80 ${cls}
              ${filter === k ? 'ring-2 ring-offset-1 ring-current' : ''}`}>
            <div className="text-2xl font-bold">{loading ? '…' : count}</div>
            <div className="text-sm font-semibold mt-0.5">{label}</div>
          </button>
        ))}
      </div>

      {/* Pending alert */}
      {pendingCount > 0 && (
        <div onClick={() => setFilter('pending')}
          className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 flex items-center gap-3 cursor-pointer hover:bg-red-100 transition-colors">
          <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0">{pendingCount}</div>
          <div>
            <div className="font-bold text-red-800">มีคำขอสมัครรออนุมัติ {pendingCount} ราย</div>
            <div className="text-sm text-red-600">กดเพื่อกรองดูเฉพาะรายที่รออนุมัติ →</div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="ค้นหาชื่อ เลขบัตร หรือเบอร์โทร..."
          className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500" />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">👥</div>
          <p className="font-semibold">ไม่พบข้อมูล</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map(row => {
            const farmer    = farmerOf(row)
            const status    = farmer?.status ?? 'unknown'
            const stCfg     = STATUS_CFG[status] ?? { label: status, bg: 'bg-gray-100', text: 'text-gray-600' }
            const isExp     = expanded === row.id
            const isActing  = acting === row.id
            const isPending = status === 'pending_leader' || status === 'pending_admin'

            return (
              <div key={row.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Card header */}
                <button className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
                  onClick={() => setExpanded(isExp ? null : row.id)}>
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-full bg-emerald-100 flex items-center justify-center font-bold text-emerald-700 text-base flex-shrink-0">
                      {row.full_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="font-bold text-gray-900">{row.full_name}</div>
                      <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                        <span className="font-mono">{row.id_card}</span>
                        <span>{row.phone}</span>
                        {farmer?.district && <span>📍 {farmer.district}</span>}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {new Date(row.created_at).toLocaleDateString('th-TH', {
                          year: 'numeric', month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${stCfg.bg} ${stCfg.text}`}>
                        {stCfg.label}
                      </span>
                      {isExp
                        ? <ChevronUp className="w-4 h-4 text-gray-400" />
                        : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </div>
                </button>

                {/* Expanded detail */}
                {isExp && (
                  <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-4">

                    {/* Info grid */}
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {[
                        ['role ปัจจุบัน', row.role],
                        ['grade', row.grade || '-'],
                        ['LINE verify', row.line_verify_status || '-'],
                        ['จังหวัด', farmer?.province || '-'],
                        ['อำเภอ', farmer?.district || '-'],
                        ['หมู่บ้าน', farmer?.village || '-'],
                        ['ธนาคาร', farmer?.bank_name || '-'],
                        ['เลขบัญชี', farmer?.bank_account_no || '-'],
                        ['ชื่อบัญชี', farmer?.bank_account_name || '-'],
                      ].map(([l, v]) => (
                        <div key={l} className="bg-white rounded-xl p-2.5">
                          <div className="text-xs text-gray-400">{l}</div>
                          <div className="font-semibold text-gray-800 truncate">{v}</div>
                        </div>
                      ))}
                    </div>

                    {/* Phone call */}
                    <a href={`tel:${row.phone}`}
                      className="flex items-center justify-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl py-2.5 text-sm font-semibold hover:bg-blue-100 transition-colors">
                      <Phone className="w-4 h-4" />โทร {row.phone}
                    </a>

                    {/* Approve / Reject */}
                    {isPending && (
                      <div className="space-y-2">
                        <textarea
                          rows={2}
                          placeholder="หมายเหตุสำหรับผู้สมัคร (ถ้ามี)"
                          value={actionNote[row.id] ?? ''}
                          onChange={e => setActionNote(n => ({ ...n, [row.id]: e.target.value }))}
                          className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:border-emerald-500"
                        />
                        <div className="flex gap-3">
                          <button onClick={() => handleReject(row)} disabled={isActing}
                            className={`flex-1 border-2 border-red-300 text-red-600 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors
                              ${isActing ? 'opacity-60 cursor-not-allowed' : 'hover:bg-red-50'}`}>
                            {isActing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                            ปฏิเสธ
                          </button>
                          <button onClick={() => handleApprove(row)} disabled={isActing}
                            className={`flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors
                              ${isActing ? 'opacity-60 cursor-not-allowed' : 'hover:bg-emerald-700'}`}>
                            {isActing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            อนุมัติ
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Role / Grade editor */}
                    <div className="border-t border-gray-200 pt-3">
                      <div className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">🔐 แก้ไข Role / Grade</div>
                      <div className="flex gap-2">
                        <select
                          value={editRole[row.id] ?? row.role}
                          onChange={e => setEditRole(r => ({ ...r, [row.id]: e.target.value }))}
                          className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 bg-white">
                          {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <select
                          value={editGrade[row.id] ?? (row.grade ?? '')}
                          onChange={e => setEditGrade(g => ({ ...g, [row.id]: e.target.value }))}
                          className="w-24 border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 bg-white">
                          {GRADE_OPTIONS.map(g => <option key={g} value={g}>{g || '(ไม่มี)'}</option>)}
                        </select>
                        <button onClick={() => handleRoleGrade(row)} disabled={isActing}
                          className={`px-4 py-2 bg-gray-800 text-white rounded-xl text-sm font-bold transition-colors flex items-center gap-1
                            ${isActing ? 'opacity-60 cursor-not-allowed' : 'hover:bg-gray-700'}`}>
                          {isActing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : '💾'}
                          บันทึก
                        </button>
                      </div>
                    </div>

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
