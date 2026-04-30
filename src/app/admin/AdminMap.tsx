import React, { useState } from 'react'
import { MOCK_FARMS, MOCK_FARMERS } from '../../data/mockData'

export default function AdminMap() {
  const [sel, setSel] = useState<string|null>(null)
  return (
    <div className="space-y-5">
      <div><h2 className="text-2xl font-bold text-gray-900">แผนที่แปลงเกษตร</h2><p className="text-gray-500 mt-1">แปลงทั้งหมด {MOCK_FARMS.length} แปลง</p></div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="relative bg-gradient-to-br from-emerald-100 via-green-50 to-lime-100 h-96">
          <div className="absolute inset-0 opacity-10" style={{backgroundImage:'linear-gradient(rgba(0,0,0,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,.08) 1px,transparent 1px)',backgroundSize:'30px 30px'}}/>
          <div className="absolute top-4 left-4 bg-white/95 shadow-lg text-sm font-semibold px-4 py-2 rounded-xl text-gray-700">📍 จังหวัดบุรีรัมย์</div>
          <div className="absolute top-4 right-4 bg-white/95 shadow-lg rounded-xl p-3 space-y-1.5">
            <div className="flex items-center gap-2 text-xs"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"/>ยืนยันแล้ว</div>
            <div className="flex items-center gap-2 text-xs"><span className="w-3 h-3 rounded-full bg-amber-400 inline-block"/>รอยืนยัน</div>
          </div>
          {MOCK_FARMS.map((farm,i)=>{
            const x=15+(i*17)%70; const y=20+(i*23)%60; const isSel=farm.id===sel
            return (
              <button key={farm.id} onClick={()=>setSel(farm.id===sel?null:farm.id)}
                style={{left:`${x}%`,top:`${y}%`}}
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all ${isSel?'scale-150 z-10':'hover:scale-125'}`}>
                <div className={`w-10 h-10 rounded-full border-3 border-white shadow-xl flex items-center justify-center ${farm.confirmed?'bg-emerald-500':'bg-amber-400'}`}>
                  <span className="text-base">🌾</span>
                </div>
                {isSel&&(
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white rounded-2xl shadow-2xl p-3 w-48 z-20 border border-gray-100">
                    <div className="font-bold text-gray-900 truncate">{farm.name}</div>
                    <div className="text-sm text-gray-500 mt-0.5">{farm.area} ไร่ • {farm.district}</div>
                    <div className="text-xs text-gray-400 font-mono mt-1">📍 {farm.lat.toFixed(3)}, {farm.lng.toFixed(3)}</div>
                    <div className={`mt-2 text-xs font-semibold ${farm.confirmed?'text-emerald-600':'text-amber-600'}`}>{farm.confirmed?'✅ ยืนยันแล้ว':'⏳ รอยืนยัน'}</div>
                    <a href={`https://www.google.com/maps?q=${farm.lat},${farm.lng}`} target="_blank" rel="noreferrer"
                      className="mt-2 flex items-center justify-center text-xs text-blue-600 font-medium">🗺️ Google Maps</a>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-bold text-gray-800 mb-4">รายการแปลง</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {MOCK_FARMS.map(farm=>{
            const farmer=MOCK_FARMERS.find(f=>f.id===farm.farmerId)
            return (
              <div key={farm.id} onClick={()=>setSel(farm.id===sel?null:farm.id)}
                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${sel===farm.id?'bg-emerald-50 border-2 border-emerald-300':'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${farm.confirmed?'bg-emerald-100':'bg-amber-100'}`}>🌾</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-gray-900 truncate">{farm.name}</div>
                  <div className="text-xs text-gray-500">{farmer?.name} • {farm.area} ไร่</div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-lg font-semibold ${farm.confirmed?'bg-emerald-100 text-emerald-700':'bg-amber-100 text-amber-700'}`}>{farm.confirmed?'✓':'⏳'}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}