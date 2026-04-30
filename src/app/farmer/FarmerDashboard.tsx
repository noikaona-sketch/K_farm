import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../routes/AuthContext'
import { MOCK_FARMS, MOCK_PLANTING_RECORDS, MOCK_PRICES, TIER_CONFIG } from '../../data/mockData'

export default function FarmerDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const uid = user?.id ?? 'f1'
  const farms = MOCK_FARMS.filter(f => f.farmerId === uid)
  const records = MOCK_PLANTING_RECORDS.filter(r => r.farmerId === uid)
  const activeRecord = records.find(r => r.status === 'growing')
  const latestPrice = MOCK_PRICES.find(p => p.grade === 'A')
  const tier = TIER_CONFIG[uid === 'f1' ? 'gold' : 'bronze']
  const ageDays = activeRecord
    ? Math.max(0, Math.round((Date.now() - new Date(activeRecord.plantDate).getTime()) / 86400000))
    : null

  const quick = [
    { icon:'🌿', label:'แปลงของฉัน',   to:'/farmer/farms',    c:'bg-green-50 border-green-200 text-green-700' },
    { icon:'🌽', label:'บันทึกการปลูก', to:'/farmer/planting', c:'bg-lime-50 border-lime-200 text-lime-700' },
    { icon:'💰', label:'ราคาข้าวโพด',   to:'/farmer/prices',   c:'bg-yellow-50 border-yellow-200 text-yellow-700' },
    { icon:'⭐', label:'ระดับสมาชิก',   to:'/farmer/tier',     c:'bg-purple-50 border-purple-200 text-purple-700' },
  ]

  return (
    <div className="p-4 space-y-4">
      <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-2xl p-4 text-white shadow-lg">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-green-200 text-sm">ยินดีต้อนรับ</p>
            <h2 className="text-xl font-bold">{user?.name}</h2>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs bg-white/20 rounded-full px-2 py-0.5">{user?.code}</span>
              <span className="text-xs font-bold" style={{ color: tier.color }}>🏆 {tier.label}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-yellow-300">1,240</div>
            <div className="text-green-200 text-xs">คะแนนสะสม</div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 pt-3 border-t border-white/20 text-center">
          <div><div className="text-lg font-bold">{farms.length}</div><div className="text-green-200 text-xs">แปลง</div></div>
          <div><div className="text-lg font-bold">{farms.reduce((s,f)=>s+f.area,0).toFixed(1)}</div><div className="text-green-200 text-xs">ไร่</div></div>
          <div><div className="text-lg font-bold">{records.length}</div><div className="text-green-200 text-xs">ฤดูกาล</div></div>
        </div>
      </div>

      {activeRecord && ageDays !== null && (
        <button className="w-full bg-lime-50 border border-lime-200 rounded-2xl p-4 flex items-center justify-between text-left active:scale-[.98] transition-all"
          onClick={() => navigate('/farmer/planting')}>
          <div className="flex items-center gap-3">
            <span className="text-3xl">🌽</span>
            <div>
              <div className="text-xs text-lime-600 font-semibold">ข้าวโพดที่กำลังปลูก</div>
              <div className="font-bold text-lime-800 text-sm">{activeRecord.variety}</div>
              <div className="text-xs text-lime-500">ลงเมล็ด {activeRecord.plantDate}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-lime-700">{ageDays}</div>
            <div className="text-xs text-lime-500">วัน</div>
          </div>
        </button>
      )}

      {latestPrice && (
        <button className="w-full bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex items-center justify-between text-left"
          onClick={() => navigate('/farmer/prices')}>
          <div className="flex items-center gap-2">
            <span className="text-xl">📢</span>
            <div>
              <div className="text-xs text-yellow-600 font-medium">ราคาวันนี้ (เกรด A)</div>
              <div className="text-sm font-bold text-yellow-800">{latestPrice.variety}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-green-700">{latestPrice.price.toLocaleString()}</div>
            <div className="text-xs text-gray-400">บาท/{latestPrice.unit}</div>
          </div>
        </button>
      )}

      <div>
        <h3 className="text-sm font-semibold text-gray-600 mb-2">เมนูด่วน</h3>
        <div className="grid grid-cols-2 gap-3">
          {quick.map(a => (
            <button key={a.to} onClick={() => navigate(a.to)}
              className={`${a.c} border rounded-2xl p-4 flex flex-col items-center gap-2 transition-all active:scale-[.97]`}>
              <span className="text-3xl">{a.icon}</span>
              <span className="text-xs font-semibold text-center">{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-semibold text-gray-600">แปลงของฉัน</h3>
          <button onClick={() => navigate('/farmer/farms')} className="text-xs text-green-600 font-semibold">ดูทั้งหมด →</button>
        </div>
        <div className="space-y-2">
          {farms.slice(0,2).map(farm => (
            <div key={farm.id} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-xl">🌾</div>
                <div>
                  <div className="font-semibold text-sm text-gray-800">{farm.name}</div>
                  <div className="text-xs text-gray-400">{farm.area} ไร่ • {farm.district}</div>
                </div>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${farm.confirmed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {farm.confirmed ? '✓ ยืนยัน' : '⏳ รอยืนยัน'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}