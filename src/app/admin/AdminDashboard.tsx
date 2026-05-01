import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, MapPin, BarChart3, TrendingUp, DollarSign, RefreshCw, AlertCircle } from 'lucide-react'
import { MOCK_FARMS, MOCK_INSPECTIONS, TIER_CONFIG } from '../../data/mockData'
import { fetchAllFarmers, fetchPrices, type PendingRegistration } from '../../lib/db'
import { isSupabaseReady } from '../../lib/supabase'
import type { Price } from '../../data/mockData'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [farmers, setFarmers] = useState<PendingRegistration[]>([])
  const [prices, setPrices] = useState<Price[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const [fRes, pRes] = await Promise.all([fetchAllFarmers(), fetchPrices()])
    setFarmers(fRes.data ?? [])
    setPrices(pRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const pendingCount = farmers.filter(f => f.status === 'pending').length
  const approvedCount = farmers.filter(f => f.status === 'approved').length

  const stats = [
    { label: 'เกษตรกรทั้งหมด', value: loading ? '…' : String(farmers.length), Icon: Users, color: 'bg-blue-50 text-blue-700 border-blue-100', sub: 'คน' },
    { label: 'รออนุมัติ', value: loading ? '…' : String(pendingCount), Icon: AlertCircle, color: pendingCount > 0 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-gray-50 text-gray-500 border-gray-100', sub: 'คน', alert: pendingCount > 0 },
    { label: 'อนุมัติแล้ว', value: loading ? '…' : String(approvedCount), Icon: Users, color: 'bg-emerald-50 text-emerald-700 border-emerald-100', sub: 'คน' },
    { label: 'แปลงทั้งหมด', value: String(MOCK_FARMS.length), Icon: MapPin, color: 'bg-green-50 text-green-700 border-green-100', sub: 'แปลง' },
    { label: 'รอตรวจสอบ', value: String(MOCK_INSPECTIONS.filter(i => i.status === 'pending').length), Icon: BarChart3, color: 'bg-orange-50 text-orange-700 border-orange-100', sub: 'แปลง' },
    { label: 'ราคากลาง', value: prices.find(p => p.grade === 'A')?.price.toLocaleString() ?? '-', Icon: DollarSign, color: 'bg-amber-50 text-amber-700 border-amber-100', sub: 'บ./ตัน' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">ภาพรวมระบบ</h2>
          <p className="text-gray-500 mt-0.5 text-sm">{isSupabaseReady ? '🟢 Supabase' : '🟡 Mock data'}</p>
        </div>
        <button onClick={load} disabled={loading} className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors">
          <RefreshCw className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Pending alert banner */}
      {pendingCount > 0 && (
        <div onClick={() => navigate('/admin/farmers')}
          className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:bg-red-100 transition-colors">
          <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-lg">{pendingCount}</span>
          </div>
          <div className="flex-1">
            <div className="font-bold text-red-800">มีคำขอสมัครรออนุมัติ {pendingCount} รายการ</div>
            <div className="text-sm text-red-600">กดเพื่อตรวจสอบและอนุมัติ →</div>
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map(s => (
          <div key={s.label}
            onClick={s.label.includes('อนุมัติ') || s.label.includes('เกษตรกร') ? () => navigate('/admin/farmers') : undefined}
            className={`${s.color} border-2 rounded-2xl p-5 ${(s.label.includes('อนุมัติ') || s.label.includes('เกษตรกร')) ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-white/60`}>
              <s.Icon className="w-5 h-5" />
            </div>
            <div className="text-3xl font-bold">
              {s.value}
              {(s as { alert?: boolean }).alert && <span className="inline-block w-2.5 h-2.5 bg-red-500 rounded-full ml-1.5 mb-1" />}
            </div>
            <div className="text-sm opacity-60">{s.sub}</div>
            <div className="text-sm font-semibold mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tier distribution */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-bold text-gray-800 mb-4">🏆 สถานะสมาชิก</h3>
          {[
            { label: 'อนุมัติแล้ว', value: approvedCount, total: farmers.length, color: '#059669' },
            { label: 'รออนุมัติ', value: pendingCount, total: farmers.length, color: '#f59e0b' },
            { label: 'ปฏิเสธ', value: farmers.filter(f => f.status === 'rejected').length, total: farmers.length, color: '#ef4444' },
          ].map(({ label, value, total, color }) => {
            const pct = total > 0 ? Math.round((value / total) * 100) : 0
            return (
              <div key={label} className="mb-3">
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-semibold" style={{ color }}>{label}</span>
                  <span className="text-gray-500">{value} คน ({pct}%)</span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                </div>
              </div>
            )
          })}
        </div>

        {/* Recent farmers */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800">สมัครล่าสุด</h3>
            <button onClick={() => navigate('/admin/farmers')} className="text-sm text-emerald-600 font-semibold hover:underline">ดูทั้งหมด</button>
          </div>
          {loading ? (
            <div className="flex justify-center py-6"><RefreshCw className="w-5 h-5 text-emerald-600 animate-spin" /></div>
          ) : farmers.slice(0, 5).map(f => {
            const stMap: Record<string, string> = { pending: 'bg-amber-100 text-amber-700', approved: 'bg-emerald-100 text-emerald-700', rejected: 'bg-red-100 text-red-700' }
            const stLabel: Record<string, string> = { pending: 'รออนุมัติ', approved: 'อนุมัติ', rejected: 'ปฏิเสธ' }
            return (
              <div key={f.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                <div>
                  <div className="font-semibold text-gray-800 text-sm">{f.fullName}</div>
                  <div className="text-xs text-gray-400">{f.district || 'ไม่ระบุ'}</div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${stMap[f.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {stLabel[f.status] ?? f.status}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Quick nav */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { label: 'อนุมัติสมาชิก', icon: '👥', to: '/admin/farmers', bg: 'bg-red-500', badge: pendingCount },
          { label: 'แผนที่แปลง', icon: '🗺️', to: '/admin/map', bg: 'bg-emerald-600' },
          { label: 'จัดการราคา', icon: '💰', to: '/admin/prices', bg: 'bg-amber-500' },
        ].map(({ label, icon, to, bg, badge }) => (
          <button key={to} onClick={() => navigate(to)}
            className={`${bg} text-white rounded-2xl p-5 flex items-center gap-3 shadow-md hover:opacity-90 transition-opacity active:scale-[.98] relative`}>
            <span className="text-2xl">{icon}</span>
            <span className="font-bold text-lg">{label}</span>
            {badge ? (
              <span className="absolute top-2 right-2 w-6 h-6 bg-white text-red-500 rounded-full text-xs font-bold flex items-center justify-center shadow">
                {badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  )
}
