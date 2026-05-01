import React, { useEffect, useState } from 'react'
import { Search, RefreshCw, Check, X, AlertCircle, Wifi, WifiOff, ChevronDown, ChevronUp, Phone } from 'lucide-react'
import {
  fetchAllFarmers, fetchPendingRegistrations,
  updateFarmerStatus,
  type PendingRegistration,
} from '../../lib/db'
import { isSupabaseReady } from '../../lib/supabase'

type TabKey = 'pending' | 'all'

export default function AdminFarmers() {
  const [tab, setTab] = useState<TabKey>('pending')
  const [farmers, setFarmers] = useState<PendingRegistration[]>([])
  const [pending, setPending] = useState<PendingRegistration[]>([])
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState<'supabase' | 'mock'>('mock')
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [actionNote, setActionNote] = useState<Record<string, string>>({})
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [actionResult, setActionResult] = useState<Record<string, { ok: boolean; msg: string }>>({})

  const load = async () => {
    setLoading(true); setLoadErr(null)
    const [allRes, pendRes] = await Promise.all([
      fetchAllFarmers(),
      fetchPendingRegistrations(),
    ])
    setFarmers(allRes.data ?? [])
    setPending(pendRes.data ?? [])
    setSource(allRes.source)
    if (allRes.error && isSupabaseReady) setLoadErr(allRes.error)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleApprove = async (farmerId: string, name: string) => {
    if (!farmerId) return
    setActionLoading(farmerId)
    const res = await updateFarmerStatus(farmerId, 'approved', actionNote[farmerId])
    setActionLoading(null)
    if (isSupabaseReady && res.error) {
      setActionResult(r => ({ ...r, [farmerId]: { ok: false, msg: `อนุมัติไม่สำเร็จ: ${res.error}` } }))
      return
    }
    setActionResult(r => ({ ...r, [farmerId]: { ok: true, msg: `อนุมัติ ${name} สำเร็จ${isSupabaseReady ? ' (Supabase)' : ' (Mock)'}` } }))
    await load()
  }

  const handleReject = async (farmerId: string, name: string) => {
    if (!farmerId) return
    setActionLoading(farmerId)
    const res = await updateFarmerStatus(farmerId, 'rejected', actionNote[farmerId])
    setActionLoading(null)
    if (isSupabaseReady && res.error) {
      setActionResult(r => ({ ...r, [farmerId]: { ok: false, msg: `ปฏิเสธไม่สำเร็จ: ${res.error}` } }))
      return
    }
    setActionResult(r => ({ ...r, [farmerId]: { ok: true, msg: `ปฏิเสธ ${name} แล้ว${isSupabaseReady ? ' (Supabase)' : ' (Mock)'}` } }))
    await load()
  }

  const displayList = tab === 'pending'
    ? pending.filter(f => !f.fullName || f.fullName.toLowerCase().includes(search.toLowerCase()) || f.phone?.includes(search) || f.code?.includes(search))
    : farmers.filter(f => f.fullName.toLowerCase().includes(search.toLowerCase()) || f.phone?.includes(search) || f.code?.includes(search))

  const statusCfg: Record<string, { label: string; c: string }> = {
    pending:  { label: 'รออนุมัติ', c: 'bg-amber-100 text-amber-700' },
    approved: { label: 'อนุมัติแล้ว', c: 'bg-emerald-100 text-emerald-700' },
    rejected: { label: 'ปฏิเสธ', c: 'bg-red-100 text-red-700' },
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">จัดการการสมัครสมาชิก</h2>
          <div className="flex items-center gap-1.5 mt-1">
            {source === 'supabase'
              ? <><Wifi className="w-3.5 h-3.5 text-emerald-600" /><span className="text-sm text-emerald-600 font-medium">Supabase: profiles + farmers</span></>
              : <><WifiOff className="w-3.5 h-3.5 text-amber-500" /><span className="text-sm text-amber-600 font-medium">Mock data — ตั้ง Supabase env เพื่อใช้งานจริง</span></>
            }
          </div>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          รีโหลด
        </button>
      </div>

      {/* Error */}
      {loadErr && (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div>
            <p className="font-bold text-red-700">โหลดข้อมูลไม่สำเร็จ</p>
            <p className="text-sm text-red-600 mt-0.5">{loadErr}</p>
          </div>
        </div>
      )}

      {/* Action results */}
      {Object.entries(actionResult).map(([id, r]) => (
        <div key={id} className={`border-2 rounded-xl p-3 flex items-center gap-2 text-sm font-semibold ${r.ok ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-red-50 border-red-300 text-red-700'}`}>
          {r.ok ? <Check className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          {r.msg}
          <button onClick={() => setActionResult(prev => { const n = { ...prev }; delete n[id]; return n })} className="ml-auto text-gray-400 hover:text-gray-600">✕</button>
        </div>
      ))}

      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'รออนุมัติ', value: pending.length, color: 'bg-amber-50 border-amber-200 text-amber-700' },
          { label: 'อนุมัติแล้ว', value: farmers.filter(f => f.status === 'approved').length, color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
          { label: 'ทั้งหมด', value: farmers.length, color: 'bg-gray-50 border-gray-200 text-gray-700' },
        ].map(s => (
          <div key={s.label} className={`${s.color} border-2 rounded-2xl p-4 text-center`}>
            <div className="text-3xl font-bold">{loading ? '…' : s.value}</div>
            <div className="text-sm font-medium mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-2xl p-1">
        {([['pending', `รออนุมัติ (${pending.length})`], ['all', `ทั้งหมด (${farmers.length})`]] as [TabKey, string][]).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === k ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500'}`}>
            {k === 'pending' && pending.length > 0 && <span className="inline-flex items-center justify-center w-5 h-5 bg-red-500 text-white text-xs rounded-full mr-1.5">{pending.length}</span>}
            {l}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="ค้นหาชื่อ เบอร์ หรือรหัส..."
          className="w-full pl-9 pr-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500" />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
        </div>
      ) : displayList.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-5xl mb-3">{tab === 'pending' ? '🎉' : '👥'}</div>
          <p className="font-medium">{tab === 'pending' ? 'ไม่มีคำขอรออนุมัติ' : 'ไม่พบข้อมูล'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayList.map(f => {
            const st = statusCfg[f.status] ?? { label: f.status, c: 'bg-gray-100 text-gray-600' }
            const isExp = expanded === f.id
            const isActing = actionLoading === f.farmerId

            return (
              <div key={f.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Card header */}
                <button className="w-full p-4 text-left" onClick={() => setExpanded(isExp ? null : f.id)}>
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-full bg-emerald-100 flex items-center justify-center font-bold text-emerald-700 text-lg flex-shrink-0">
                      {f.fullName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-900">{f.fullName}</div>
                      <div className="text-sm text-gray-500 mt-0.5">
                        {f.code && <span className="font-mono">{f.code}</span>}
                        {f.code && f.district && ' • '}
                        {f.district}
                        {f.village && `, ${f.village}`}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {f.createdAt ? new Date(f.createdAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs px-2.5 py-1.5 rounded-full font-semibold ${st.c}`}>{st.label}</span>
                      {isExp ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </div>
                </button>

                {/* Expanded detail + actions */}
                {isExp && (
                  <div className="border-t border-gray-100 p-4 space-y-4 bg-gray-50">
                    {/* Info grid */}
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {[
                        ['📞 เบอร์โทร', f.phone || '-'],
                        ['🪪 เลขบัตร', f.idCard || '-'],
                        ['📍 จังหวัด', f.province || '-'],
                        ['🏘️ อำเภอ', f.district || '-'],
                      ].map(([l, v]) => (
                        <div key={l} className="bg-white rounded-xl p-2.5">
                          <div className="text-xs text-gray-400">{l}</div>
                          <div className="font-semibold text-gray-800 mt-0.5">{v}</div>
                        </div>
                      ))}
                    </div>

                    {/* Phone call button */}
                    {f.phone && (
                      <a href={`tel:${f.phone}`}
                        className="flex items-center justify-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl py-2.5 font-semibold text-sm hover:bg-blue-100 transition-colors">
                        <Phone className="w-4 h-4" />โทร {f.phone}
                      </a>
                    )}

                    {/* Admin note */}
                    {f.status === 'pending' && (
                      <div>
                        <label className="text-xs font-semibold text-gray-600 block mb-1">หมายเหตุ (ถ้ามี)</label>
                        <textarea
                          value={actionNote[f.farmerId ?? f.id] ?? ''}
                          onChange={e => setActionNote(n => ({ ...n, [f.farmerId ?? f.id]: e.target.value }))}
                          placeholder="เช่น เอกสารไม่ครบ / ผ่านการตรวจสอบ..."
                          rows={2}
                          className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    )}

                    {/* Approve / Reject buttons */}
                    {f.status === 'pending' && f.farmerId && (
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleReject(f.farmerId!, f.fullName)}
                          disabled={isActing}
                          className={`flex-1 border-2 border-red-300 text-red-600 py-3 rounded-xl font-bold flex items-center justify-center gap-2 ${isActing ? 'opacity-60' : 'hover:bg-red-50'} transition-colors`}>
                          {isActing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                          ปฏิเสธ
                        </button>
                        <button
                          onClick={() => handleApprove(f.farmerId!, f.fullName)}
                          disabled={isActing}
                          className={`flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 ${isActing ? 'opacity-60' : 'hover:bg-emerald-700'} transition-colors`}>
                          {isActing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          อนุมัติ
                        </button>
                      </div>
                    )}

                    {f.status !== 'pending' && (
                      <div className={`text-center py-2.5 rounded-xl text-sm font-semibold ${f.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                        {f.status === 'approved' ? '✅ อนุมัติแล้ว' : '❌ ปฏิเสธแล้ว'}
                      </div>
                    )}
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
