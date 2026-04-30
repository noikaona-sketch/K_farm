import React from 'react'
import { useNavigate } from 'react-router-dom'
import { MOCK_FARMERS, MOCK_FARMS, MOCK_INSPECTIONS } from '../../data/mockData'

export default function LeaderDashboard() {
  const navigate = useNavigate()
  const pending = MOCK_FARMS.filter(f => !f.confirmed)
  return (
    <div className="p-4 space-y-4">
      <div><h1 className="font-bold text-gray-800 text-lg">แดชบอร์ดหัวหน้ากลุ่ม</h1><p className="text-xs text-gray-500">กลุ่มเกษตรกร บุรีรัมย์เขต 1</p></div>
      <div className="grid grid-cols-2 gap-3">
        {[
          { label:'เกษตรกร', value:MOCK_FARMERS.filter(f=>f.status==='active').length, icon:'👥', color:'bg-blue-50 text-blue-700', sub:'คน' },
          { label:'พื้นที่รวม', value:MOCK_FARMS.reduce((s,f)=>s+f.area,0).toFixed(0), icon:'🌾', color:'bg-green-50 text-green-700', sub:'ไร่' },
          { label:'รอยืนยันแปลง', value:pending.length, icon:'⏳', color:'bg-yellow-50 text-yellow-700', sub:'แปลง' },
          { label:'ตรวจแล้ว', value:MOCK_INSPECTIONS.filter(i=>i.status==='completed').length, icon:'✅', color:'bg-emerald-50 text-emerald-700', sub:'ครั้ง' },
        ].map(s => (
          <div key={s.label} className={`${s.color} rounded-2xl p-4`}>
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs opacity-70">{s.sub}</div>
            <div className="text-xs font-medium mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>
      {pending.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2"><span className="text-lg">⚠️</span><span className="font-semibold text-yellow-800 text-sm">รอการยืนยัน {pending.length} แปลง</span></div>
            <button onClick={() => navigate('/leader/confirm')} className="text-xs text-yellow-700 font-bold bg-yellow-100 px-3 py-1.5 rounded-lg">ดำเนินการ →</button>
          </div>
          {pending.slice(0,2).map(f => {
            const farmer = MOCK_FARMERS.find(m => m.id === f.farmerId)
            return (
              <div key={f.id} className="flex items-center gap-2 text-xs py-1.5 border-t border-yellow-200">
                <span className="text-yellow-600">📍</span>
                <span className="text-yellow-800 font-medium">{f.name}</span>
                <span className="text-yellow-600">• {farmer?.name}</span>
                <span className="text-yellow-600 ml-auto">{f.area} ไร่</span>
              </div>
            )
          })}
        </div>
      )}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <h3 className="font-bold text-gray-700 text-sm mb-3">สมาชิกกลุ่ม</h3>
        {MOCK_FARMERS.slice(0,4).map(f => (
          <div key={f.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
            <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center font-bold text-green-700">{f.name.charAt(0)}</div>
            <div className="flex-1 min-w-0"><div className="text-sm font-medium text-gray-800 truncate">{f.name}</div><div className="text-xs text-gray-500">{f.totalArea} ไร่ • {f.district}</div></div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${f.status==='active'?'bg-green-100 text-green-700':'bg-yellow-100 text-yellow-700'}`}>{f.status==='active'?'ใช้งาน':'รออนุมัติ'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}