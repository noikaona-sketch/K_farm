import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../routes/AuthContext'
import { MOCK_FARMS } from '../../data/mockData'

export default function MyFarms() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const farms = MOCK_FARMS.filter(f => f.farmerId === (user?.id ?? 'f1'))

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-gray-800">แปลงของฉัน</h1>
          <p className="text-xs text-gray-500">{farms.length} แปลง • {farms.reduce((s,f)=>s+f.area,0).toFixed(1)} ไร่</p>
        </div>
        <button onClick={() => navigate('/farmer/farms/add')}
          className="bg-green-600 text-white text-xs px-3 py-2 rounded-xl font-semibold shadow-sm">+ เพิ่มแปลง</button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label:'ทั้งหมด', value:farms.length, color:'bg-green-50 text-green-700' },
          { label:'ยืนยันแล้ว', value:farms.filter(f=>f.confirmed).length, color:'bg-blue-50 text-blue-700' },
          { label:'รอยืนยัน', value:farms.filter(f=>!f.confirmed).length, color:'bg-yellow-50 text-yellow-700' },
        ].map(s => (
          <div key={s.label} className={`${s.color} rounded-xl p-3 text-center`}>
            <div className="text-xl font-bold">{s.value}</div>
            <div className="text-xs mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {farms.map(farm => (
          <div key={farm.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-green-600 h-1.5" />
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center text-2xl">🌾</div>
                  <div>
                    <h3 className="font-bold text-gray-800">{farm.name}</h3>
                    <p className="text-xs text-gray-500">{farm.village}, {farm.district}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${farm.confirmed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {farm.confirmed ? '✓ ยืนยันแล้ว' : '⏳ รอยืนยัน'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  ['📐 พื้นที่', `${farm.area} ไร่`],
                  ['🌍 ดิน', farm.soilType],
                  ['💧 น้ำ', farm.waterSource],
                  ['📍 พิกัด', `${farm.lat.toFixed(3)}, ${farm.lng.toFixed(3)}`],
                ].map(([l, v]) => (
                  <div key={l as string} className="bg-gray-50 rounded-lg p-2">
                    <span className="text-gray-400">{l}: </span>
                    <span className="font-medium text-gray-700">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}