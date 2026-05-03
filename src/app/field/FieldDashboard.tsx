import React from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarCheck, Flame, MapPin, Sprout, Tractor, Truck, Users } from 'lucide-react'
import { useAuth } from '../../routes/AuthContext'

const menus = [
  { title: 'จองเมล็ดพันธุ์', sub: 'จองให้สมาชิก', icon: CalendarCheck, path: '/field/seed-booking', bg: 'bg-emerald-50', color: 'text-emerald-600' },
  { title: 'ตรวจแปลง', sub: 'GPS + รูปภาพ', icon: Sprout, path: '/field/farm-inspection', bg: 'bg-green-50', color: 'text-green-600' },
  { title: 'ตรวจไม่เผา', sub: 'หลักฐานกิจกรรม', icon: Flame, path: '/field/no-burn', bg: 'bg-orange-50', color: 'text-orange-600' },
  { title: 'รับสมัครสมาชิก', sub: 'เพิ่มสมาชิกภาคสนาม', icon: Users, path: '/field/member-register', bg: 'bg-blue-50', color: 'text-blue-600' },
  { title: 'เครื่องจักร', sub: 'รถไถ / รถเกี่ยว', icon: Tractor, path: '/field/machine-check', bg: 'bg-yellow-50', color: 'text-yellow-600' },
  { title: 'รถขนส่ง', sub: 'ตรวจรถขนส่ง', icon: Truck, path: '/field/transport-check', bg: 'bg-purple-50', color: 'text-purple-600' },
]

export default function FieldDashboard() {
  const nav = useNavigate()
  const { user } = useAuth()
  return (
    <div className="min-h-screen bg-gray-50 p-5 space-y-5">
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white rounded-3xl p-5 shadow-lg">
        <div className="text-sm text-emerald-100">ทีมภาคสนาม</div>
        <div className="text-2xl font-bold mt-1">สวัสดี {user?.name ?? 'ทีมงาน'}</div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/10 rounded-2xl p-3"><div className="text-xl font-bold">0</div><div className="text-[11px] text-emerald-100">งานวันนี้</div></div>
          <div className="bg-white/10 rounded-2xl p-3"><div className="text-xl font-bold">0</div><div className="text-[11px] text-emerald-100">ค้างส่ง</div></div>
          <div className="bg-white/10 rounded-2xl p-3"><div className="text-xl font-bold">0</div><div className="text-[11px] text-emerald-100">เสี่ยง</div></div>
        </div>
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
