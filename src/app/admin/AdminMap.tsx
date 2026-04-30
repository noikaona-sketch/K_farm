import React, { useState } from 'react'
import { MOCK_FARMS, MOCK_FARMERS } from '../../data/mockData'

export default function AdminMap() {
  const [selected, setSelected] = useState<string|null>(null)
  return (
    <div className="space-y-4">
      <div><h2 className="text-xl font-bold text-gray-800">แผนที่แปลงเกษตร</h2><p className="text-sm text-gray-500">แปลงทั้งหมด {MOCK_FARMS.length} แปลง</p></div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="relative bg-gradient-to-br from-green-100 to-emerald-50 h-80">
          <div className="absolute inset-0 opacity-10" style={{backgroundImage:'linear-gradient(rgba(0,0,0,.1) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,.1) 1px,transparent 1px)',backgroundSize:'30px 30px'}}/>
          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur text-xs font-medium px-3 py-1.5 rounded-xl shadow text-gray-700">🗺️ จังหวัดบุรีรัมย์</div>
          <div className="absolute top-3 right-3 flex flex-col gap-1">
            <div className="bg-white/90 backdrop-blur text-xs px-2 py-1 rounded-lg flex items-center gap-1.5 shadow"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block"/>ยืนยันแล้ว</div>
            <div className="bg-white/90 backdrop-blur text-xs px-2 py-1 rounded-lg flex items-center gap-1.5 shadow"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block"/>รอยืนยัน</div>
          </div>
          {MOCK_FARMS.map((farm,i) => {
            const x=15+(i*17)%70; const y=20+(i*23)%55; const isSel=farm.id===selected
            return (
              <button key={farm.id} onClick={()=>setSelected(farm.id===selected?null:farm.id)}
                style={{left:`${x}%`,top:`${y}%`}}
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all ${isSel?'scale-150 z-10':'hover:scale-125'}`}>
                <div className={`w-8 h-8 rounded-full border-2 border-white shadow-md flex items-center justify-center text-sm ${farm.confirmed?'bg-green-500':'bg-yellow-400'}`}>🌾</div>
                {isSel && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-white rounded-xl shadow-xl p-2.5 w-44 text-xs z-20 border border-gray-100">
                    <div className="font-bold text-gray-800 truncate">{farm.name}</div>
                    <div className="text-gray-500 mt-0.5">{farm.area} ไร่ • {farm.district}</div>
                    <div className="text-gray-400 mt-0.5">📍 {farm.lat.toFixed(3)}, {farm.lng.toFixed(3)}</div>
                    <div className={`mt-1 font-medium ${farm.confirmed?'text-green-600':'text-yellow-600'}`}>{farm.confirmed?'✓ ยืนยันแล้ว':'⏳ รอยืนยัน'}</div>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <h3 className="font-bold text-gray-700 mb-3">รายการแปลง</h3>
        <div className="space-y-2">
          {MOCK_FARMS.map(farm => {
            const farmer = MOCK_FARMERS.find(f => f.id === farm.farmerId)
            return (
              <div key={farm.id} onClick={()=>setSelected(farm.id===selected?null:farm.id)}
                className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all ${selected===farm.id?'bg-green-50 border border-green-200':'hover:bg-gray-50'}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${farm.confirmed?'bg-green-100':'bg-yellow-100'}`}>🌾</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">{farm.name}</div>
                  <div className="text-xs text-gray-500">{farmer?.name} • {farm.area} ไร่</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${farm.confirmed?'bg-green-100 text-green-700':'bg-yellow-100 text-yellow-700'}`}>{farm.confirmed?'ยืนยัน':'รอ'}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}