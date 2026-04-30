import React from 'react'
import { useNavigate } from 'react-router-dom'
import { MOCK_FARMERS, MOCK_FARMS, MOCK_PRICES, MOCK_INSPECTIONS, MOCK_SALE_REQUESTS_EXTENDED, TIER_CONFIG } from '../../data/mockData'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const stats = [
    { label:'เกษตรกรทั้งหมด', value:MOCK_FARMERS.length, icon:'👥', color:'bg-blue-50 text-blue-700 border-blue-100', sub:'คน' },
    { label:'แปลงทั้งหมด', value:MOCK_FARMS.length, icon:'🌾', color:'bg-green-50 text-green-700 border-green-100', sub:'แปลง' },
    { label:'พื้นที่รวม', value:MOCK_FARMS.reduce((s,f)=>s+f.area,0).toFixed(0), icon:'📐', color:'bg-emerald-50 text-emerald-700 border-emerald-100', sub:'ไร่' },
    { label:'คำขอขาย', value:MOCK_SALE_REQUESTS_EXTENDED.length, icon:'🛒', color:'bg-yellow-50 text-yellow-700 border-yellow-100', sub:'รายการ' },
    { label:'รอตรวจสอบ', value:MOCK_INSPECTIONS.filter(i=>i.status==='pending').length, icon:'🔍', color:'bg-orange-50 text-orange-700 border-orange-100', sub:'แปลง' },
    { label:'ผ่านการตรวจ', value:MOCK_INSPECTIONS.filter(i=>i.status==='completed').length, icon:'✅', color:'bg-purple-50 text-purple-700 border-purple-100', sub:'แปลง' },
  ]

  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-bold text-gray-800">ภาพรวมระบบ</h2><p className="text-sm text-gray-500 mt-0.5">ข้อมูล ณ วันที่ 30 เม.ย. 2568</p></div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {stats.map(s => (
          <div key={s.label} className={`${s.color} border rounded-2xl p-4`}>
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs opacity-60">{s.sub}</div>
            <div className="text-xs font-semibold mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h3 className="font-bold text-gray-700 mb-4">🏆 การกระจายระดับสมาชิก</h3>
          {(Object.entries(TIER_CONFIG) as [keyof typeof TIER_CONFIG, typeof TIER_CONFIG['bronze']][]).map(([k, tier]) => {
            const count = MOCK_FARMERS.filter(f => f.tier === k).length
            const pct = Math.round((count / MOCK_FARMERS.length) * 100)
            return (
              <div key={k} className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium" style={{color:tier.color}}>{tier.label}</span>
                  <span className="text-gray-500">{count} คน ({pct}%)</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{width:`${pct}%`,backgroundColor:tier.color}}/>
                </div>
              </div>
            )
          })}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-700">🛒 คำขอขายล่าสุด</h3>
            <button onClick={() => navigate('/admin/farmers')} className="text-xs text-green-600 font-semibold">ดูทั้งหมด</button>
          </div>
          {MOCK_SALE_REQUESTS_EXTENDED.map(r => (
            <div key={r.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div><div className="text-sm font-medium text-gray-800">{r.farmerName}</div><div className="text-xs text-gray-500">{r.variety} {r.quantity} ตัน</div></div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${r.status==='approved'?'bg-green-100 text-green-700':r.status==='pending'?'bg-yellow-100 text-yellow-700':r.status==='completed'?'bg-blue-100 text-blue-700':'bg-red-100 text-red-700'}`}>
                {r.status==='approved'?'อนุมัติ':r.status==='pending'?'รออนุมัติ':r.status==='completed'?'สำเร็จ':'ปฏิเสธ'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label:'แผนที่แปลง', icon:'🗺️', to:'/admin/map', color:'bg-green-600' },
          { label:'ตารางเกษตรกร', icon:'👥', to:'/admin/farmers', color:'bg-blue-600' },
          { label:'จัดการราคา', icon:'💰', to:'/admin/prices', color:'bg-yellow-500' },
        ].map(({ label, icon, to, color }) => (
          <button key={to} onClick={() => navigate(to)}
            className={`${color} text-white rounded-2xl p-4 flex items-center gap-3 shadow-md active:scale-[.98] transition-transform`}>
            <span className="text-2xl">{icon}</span>
            <span className="font-semibold">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}