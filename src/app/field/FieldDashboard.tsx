import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarCheck, Flame, MapPin, RefreshCw, Sprout, Tractor, Truck, Users } from 'lucide-react'
import { useAuth } from '../../routes/AuthContext'
import { isSupabaseReady, supabase } from '../../lib/supabase'

const menus = [
  { title: 'จองเมล็ดพันธุ์', sub: 'จองให้สมาชิก', icon: CalendarCheck, path: '/field/seed-booking', bg: 'bg-emerald-50', color: 'text-emerald-600' },
  { title: 'ตรวจแปลง', sub: 'GPS + รูปภาพ', icon: Sprout, path: '/field/farm-inspection', bg: 'bg-green-50', color: 'text-green-600' },
  { title: 'ตรวจไม่เผา', sub: 'หลักฐานกิจกรรม', icon: Flame, path: '/field/no-burn', bg: 'bg-orange-50', color: 'text-orange-600' },
  { title: 'รับสมัครสมาชิก', sub: 'เพิ่มสมาชิกภาคสนาม', icon: Users, path: '/field/member-register', bg: 'bg-blue-50', color: 'text-blue-600' },
  { title: 'เครื่องจักร', sub: 'รถไถ / รถเกี่ยว', icon: Tractor, path: '/field/machine-check', bg: 'bg-yellow-50', color: 'text-yellow-600' },
  { title: 'รถขนส่ง', sub: 'ตรวจรถขนส่ง', icon: Truck, path: '/field/transport-check', bg: 'bg-purple-50', color: 'text-purple-600' },
]

type Kpi = { todayJobs: number; pending: number; risk: number; bookingsToday: number; farmChecksToday: number; noBurnToday: number }
const today = () => new Date().toISOString().slice(0, 10)

export default function FieldDashboard() {
  const nav = useNavigate()
  const { user } = useAuth()
  const [kpi, setKpi] = useState<Kpi>({ todayJobs: 0, pending: 0, risk: 0, bookingsToday: 0, farmChecksToday: 0, noBurnToday: 0 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadKpi = async () => {
    setLoading(true); setError('')
    try {
      if (!isSupabaseReady || !supabase) return
      const d = today()
      const [bookingToday, bookingPending, farmToday, farmRisk, noBurnToday, noBurnRisk] = await Promise.all([
        supabase.from('seed_bookings').select('id', { count: 'exact', head: true }).eq('booking_source', 'field').eq('booking_date', d),
        supabase.from('seed_bookings').select('id', { count: 'exact', head: true }).eq('booking_source', 'field').in('status', ['pending', 'preparing', 'ready']),
        supabase.from('field_farm_inspections').select('id', { count: 'exact', head: true }).eq('inspection_date', d),
        supabase.from('field_farm_inspections').select('id', { count: 'exact', head: true }).in('risk_level', ['watch', 'risk', 'high']).neq('status', 'closed'),
        supabase.from('field_no_burn_checks').select('id', { count: 'exact', head: true }).eq('check_date', d),
        supabase.from('field_no_burn_checks').select('id', { count: 'exact', head: true }).in('activity_status', ['watch', 'burn_found']).neq('status', 'closed'),
      ])
      const anyErr = [bookingToday, bookingPending, farmToday, farmRisk, noBurnToday, noBurnRisk].find((r: any) => r.error)
      if (anyErr?.error) throw new Error(anyErr.error.message)
      const bookingsToday = bookingToday.count ?? 0
      const farmChecksToday = farmToday.count ?? 0
      const noBurnChecksToday = noBurnToday.count ?? 0
      const pending = bookingPending.count ?? 0
      const risk = (farmRisk.count ?? 0) + (noBurnRisk.count ?? 0)
      setKpi({ todayJobs: bookingsToday + farmChecksToday + noBurnChecksToday, pending, risk, bookingsToday, farmChecksToday, noBurnToday: noBurnChecksToday })
    } catch (e) { setError(e instanceof Error ? e.message : 'โหลด KPI ไม่สำเร็จ') } finally { setLoading(false) }
  }

  useEffect(() => { void loadKpi() }, [])

  return (
    <div className="min-h-screen bg-gray-50 p-5 space-y-5">
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white rounded-3xl p-5 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm text-emerald-100">ทีมภาคสนาม</div>
            <div className="text-2xl font-bold mt-1">สวัสดี {user?.name ?? 'ทีมงาน'}</div>
          </div>
          <button onClick={() => void loadKpi()} className="bg-white/10 rounded-xl p-2"><RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} /></button>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/10 rounded-2xl p-3"><div className="text-xl font-bold">{kpi.todayJobs}</div><div className="text-[11px] text-emerald-100">งานวันนี้</div></div>
          <div className="bg-white/10 rounded-2xl p-3"><div className="text-xl font-bold">{kpi.pending}</div><div className="text-[11px] text-emerald-100">ค้างส่ง/ค้างจอง</div></div>
          <div className="bg-white/10 rounded-2xl p-3"><div className="text-xl font-bold">{kpi.risk}</div><div className="text-[11px] text-emerald-100">เสี่ยง</div></div>
        </div>
      </div>

      {error && <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 p-3 text-sm">{error}</div>}

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-white rounded-2xl border p-3"><div className="font-bold text-emerald-700">{kpi.bookingsToday}</div><div className="text-xs text-gray-500">จองวันนี้</div></div>
        <div className="bg-white rounded-2xl border p-3"><div className="font-bold text-green-700">{kpi.farmChecksToday}</div><div className="text-xs text-gray-500">ตรวจแปลง</div></div>
        <div className="bg-white rounded-2xl border p-3"><div className="font-bold text-orange-700">{kpi.noBurnToday}</div><div className="text-xs text-gray-500">ไม่เผา</div></div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {menus.map((m) => {
          const Icon = m.icon
          return (
            <button key={m.title} onClick={() => nav(m.path)} className={`${m.bg} rounded-3xl p-4 text-left shadow-sm active:scale-[.98] transition`}>
              <Icon className={`w-9 h-9 ${m.color}`} />
              <div className="font-bold text-gray-900 mt-3">{m.title}</div>
              <div className="text-xs text-gray-500 mt-1">{m.sub}</div>
            </button>
          )
        })}
      </div>

      <div className="bg-white rounded-2xl border p-4">
        <div className="font-bold flex items-center gap-2"><MapPin className="w-5 h-5 text-emerald-600" />หมายเหตุ</div>
        <p className="text-sm text-gray-500 mt-2">ทุกงานภาคสนามควรบันทึก GPS รูปภาพ เวลา และผู้บันทึก เพื่อใช้ตรวจสอบย้อนหลัง</p>
      </div>
    </div>
  )
}
