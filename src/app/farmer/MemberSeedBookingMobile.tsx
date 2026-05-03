import React from 'react'
import { Package } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function MemberSeedBookingMobile() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-gray-50 p-5 space-y-4">
      <div className="bg-emerald-600 text-white rounded-3xl p-5 shadow-lg">
        <div className="flex items-center gap-3">
          <Package className="w-8 h-8" />
          <div>
            <h1 className="text-xl font-bold">จองเมล็ดพันธุ์</h1>
            <p className="text-sm text-emerald-100">หน้าจองสำหรับสมาชิก</p>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-2xl border p-5 space-y-3">
        <div className="font-bold text-gray-900">เลือกเมล็ดพันธุ์</div>
        <p className="text-sm text-gray-500">หน้านี้เป็นหน้าสมาชิก ไม่ใช่หน้า Admin แล้ว</p>
        <button onClick={() => navigate('/farmer/seeds')} className="w-full rounded-xl bg-emerald-600 text-white py-3 font-bold">ดูพันธุ์เมล็ด</button>
        <button onClick={() => navigate('/farmer/seed-booking-history')} className="w-full rounded-xl border py-3 font-bold">ประวัติการจอง</button>
      </div>
    </div>
  )
}
