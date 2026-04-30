import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Check, X, MapPin } from 'lucide-react'
import { MOCK_FARMS, MOCK_FARMERS } from '../../data/mockData'

export default function FarmConfirmation() {
  const navigate = useNavigate()
  const [confirmed, setConfirmed] = useState<string[]>([])
  const [rejected, setRejected] = useState<string[]>([])
  const pending = MOCK_FARMS.filter(f => !f.confirmed && !confirmed.includes(f.id) && !rejected.includes(f.id))

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-emerald-600 text-white px-5 py-4 flex items-center gap-3 sticky top-0 z-40">
        <button onClick={() => navigate(-1)} className="p-1"><ChevronLeft className="w-6 h-6"/></button>
        <div className="flex-1"><div className="font-bold text-lg">ยืนยันแปลงเกษตร</div><div className="text-xs opacity-80">รอดำเนินการ {pending.length} แปลง</div></div>
      </div>
      <div className="p-5 space-y-4">
        {pending.length === 0 && (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4"><Check className="w-10 h-10 text-emerald-600"/></div>
            <div className="font-bold text-gray-900 text-lg mb-2">ดำเนินการครบแล้ว</div>
            <div className="text-gray-500 text-sm">ไม่มีแปลงที่รอยืนยัน</div>
          </div>
        )}
        {pending.map(farm => {
          const farmer = MOCK_FARMERS.find(f => f.id===farm.farmerId)
          return (
            <div key={farm.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="bg-amber-400 h-1.5"/>
              <div className="p-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-2xl flex-shrink-0">🌾</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900">{farm.name}</h3>
                    <p className="text-sm text-gray-500">{farmer?.name} • {farm.area} ไร่</p>
                    <p className="text-sm text-gray-400">{farm.village}, {farm.district}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                  <div className="bg-gray-50 rounded-xl p-3"><span className="text-gray-400">ดิน: </span><span className="font-medium">{farm.soilType}</span></div>
                  <div className="bg-gray-50 rounded-xl p-3"><span className="text-gray-400">น้ำ: </span><span className="font-medium">{farm.waterSource}</span></div>
                  <div className="bg-gray-50 rounded-xl p-3 col-span-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-600"/>
                    <span className="font-mono text-xs">{farm.lat.toFixed(4)}, {farm.lng.toFixed(4)}</span>
                    <a href={`https://www.google.com/maps?q=${farm.lat},${farm.lng}`} target="_blank" rel="noreferrer"
                      className="ml-auto text-xs text-blue-600 font-medium">🗺️ แผนที่</a>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setRejected(r => [...r, farm.id])}
                    className="flex-1 border-2 border-red-300 text-red-600 py-3 rounded-xl font-bold hover:bg-red-50 transition-colors flex items-center justify-center gap-2">
                    <X className="w-5 h-5"/>ปฏิเสธ
                  </button>
                  <button onClick={() => setConfirmed(c => [...c, farm.id])}
                    className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2">
                    <Check className="w-5 h-5"/>ยืนยัน
                  </button>
                </div>
              </div>
            </div>
          )
        })}
        {(confirmed.length>0||rejected.length>0)&&(
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center text-sm text-emerald-700 font-medium">
            ✅ ยืนยัน {confirmed.length} แปลง &nbsp;•&nbsp; ❌ ปฏิเสธ {rejected.length} แปลง
          </div>
        )}
      </div>
    </div>
  )
}