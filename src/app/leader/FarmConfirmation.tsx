import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MOCK_FARMS, MOCK_FARMERS } from '../../data/mockData'

export default function FarmConfirmation() {
  const navigate = useNavigate()
  const [confirmed, setConfirmed] = useState<string[]>([])
  const [rejected, setRejected] = useState<string[]>([])
  const pending = MOCK_FARMS.filter(f => !f.confirmed && !confirmed.includes(f.id) && !rejected.includes(f.id))

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-gray-100">←</button>
        <div><h1 className="font-bold text-gray-800">ยืนยันแปลงเกษตร</h1><p className="text-xs text-gray-500">รอดำเนินการ {pending.length} แปลง</p></div>
      </div>
      {pending.length === 0 && (
        <div className="text-center py-12 text-gray-400"><div className="text-5xl mb-3">✅</div><p className="font-medium">ดำเนินการครบแล้ว</p></div>
      )}
      {pending.map(farm => {
        const farmer = MOCK_FARMERS.find(f => f.id === farm.farmerId)
        return (
          <div key={farm.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-yellow-400 h-1.5"/>
            <div className="p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center text-2xl flex-shrink-0">🌾</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-800">{farm.name}</h3>
                  <p className="text-xs text-gray-500">{farmer?.name} • {farm.area} ไร่</p>
                  <p className="text-xs text-gray-400">{farm.village}, {farm.district}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div className="bg-gray-50 rounded-lg p-2"><span className="text-gray-400">ดิน: </span><span className="font-medium">{farm.soilType}</span></div>
                <div className="bg-gray-50 rounded-lg p-2"><span className="text-gray-400">น้ำ: </span><span className="font-medium">{farm.waterSource}</span></div>
                <div className="bg-gray-50 rounded-lg p-2 col-span-2"><span className="text-gray-400">พิกัด: </span><span className="font-medium">{farm.lat.toFixed(4)}, {farm.lng.toFixed(4)}</span></div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setRejected(r => [...r, farm.id])} className="flex-1 border-2 border-red-200 text-red-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-50">✗ ปฏิเสธ</button>
                <button onClick={() => setConfirmed(c => [...c, farm.id])} className="flex-1 bg-green-600 text-white py-2.5 rounded-xl text-sm font-semibold">✓ ยืนยัน</button>
              </div>
            </div>
          </div>
        )
      })}
      {(confirmed.length > 0 || rejected.length > 0) && (
        <div className="bg-gray-50 rounded-2xl p-3 text-xs text-gray-600 text-center">ยืนยัน {confirmed.length} แปลง • ปฏิเสธ {rejected.length} แปลง</div>
      )}
    </div>
  )
}