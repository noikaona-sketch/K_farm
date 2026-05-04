import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../routes/AuthContext'
import { RefreshCw } from 'lucide-react'
import { fetchGroupBookings, type SeedBooking } from '../../lib/db'

interface StatCard { label: string; n: number; icon: string; color: string; path: string }

export default function FieldDashboard() {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const [bookings, setBookings] = useState<SeedBooking[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    fetchGroupBookings(user?.id ?? '').then(res => {
      setBookings(res.data ?? [])
      setLoading(false)
    })
  }, [user?.id])

  const pendingBookings  = bookings.filter(b => b.status === 'pending').length
  const confirmedBookings= bookings.filter(b => b.status === 'confirmed').length

  const menus = [
    { label: 'จองเมล็ดพันธุ์',   icon: '🌾', color: 'bg-emerald-50 border-emerald-200', path: '/field/seed-booking',    sub: 'ดูและจัดการการจอง' },
    { label: 'ตรวจแปลง',         icon: '🔍', color: 'bg-blue-50 border-blue-200',      path: '/field/farm-inspection',  sub: 'บันทึกผลการตรวจ' },
    { label: 'กิจกรรมไม่เผา',   icon: '🚫', color: 'bg-amber-50 border-amber-200',    path: '/field/no-burn',          sub: 'ตรวจสอบ รับรอง' },
    { label: 'ปฏิทินงาน',       icon: '📅', color: 'bg-purple-50 border-purple-200',  path: '/field/calendar',         sub: 'งานวันนี้และสัปดาห์นี้' },
  ]

  const today = new Date().toLocaleDateString('th-TH', { weekday:'long', year:'numeric', month:'long', day:'numeric' })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero card */}
      <div className="px-5 pt-5 pb-4">
        <div className="bg-gradient-to-br from-cyan-600 via-cyan-700 to-teal-800 rounded-3xl shadow-xl p-5 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"/>
          <div className="relative">
            <div className="text-[10px] text-cyan-200 uppercase tracking-widest font-semibold mb-1">ทีมภาคสนาม</div>
            <div className="font-bold text-xl mb-0.5">{user?.name}</div>
            <div className="text-cyan-200 text-xs">{today}</div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              {[
                { l: 'จองรออนุมัติ',  n: loading ? '…' : String(pendingBookings),   icon: '⏳' },
                { l: 'ยืนยันแล้ว',     n: loading ? '…' : String(confirmedBookings), icon: '✅' },
              ].map(s => (
                <div key={s.l} className="bg-white/15 rounded-2xl p-3">
                  <div className="text-lg">{s.icon}</div>
                  <div className="text-2xl font-bold mt-0.5">{s.n}</div>
                  <div className="text-cyan-200 text-xs">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Menu grid */}
      <div className="px-5 pb-6">
        <div className="grid grid-cols-2 gap-3">
          {menus.map(m => (
            <button key={m.path} onClick={() => navigate(m.path)}
              className={`${m.color} border-2 rounded-2xl p-5 flex flex-col items-start gap-2 shadow-sm hover:shadow-md active:scale-[.97] transition-all text-left`}>
              <span className="text-3xl">{m.icon}</span>
              <div>
                <div className="font-bold text-gray-900 text-sm">{m.label}</div>
                <div className="text-[11px] text-gray-500 mt-0.5">{m.sub}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Today's bookings preview */}
      {!loading && bookings.length > 0 && (
        <div className="px-5 pb-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-800 text-sm">📦 การจองล่าสุด</h3>
              <button onClick={() => navigate('/field/seed-booking')}
                className="text-xs text-cyan-600 font-semibold">ดูทั้งหมด →</button>
            </div>
            <div className="space-y-2">
              {bookings.slice(0, 3).map(b => (
                <div key={b.id} className="flex items-center gap-3 text-sm">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    b.status==='pending'?'bg-amber-400':b.status==='confirmed'?'bg-emerald-500':'bg-gray-300'}`}/>
                  <span className="flex-1 text-gray-700 truncate">{b.member_name || '-'}</span>
                  <span className="text-gray-500 text-xs whitespace-nowrap">{b.variety_name} {b.quantity_kg}กก.</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
