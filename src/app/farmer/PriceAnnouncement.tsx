import React from 'react'
import { MOCK_PRICES } from '../../data/mockData'

export default function PriceAnnouncement() {
  const varieties = [...new Set(MOCK_PRICES.map(p => p.variety))]
  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="font-bold text-gray-800">ราคาข้าวโพดประจำวัน</h1>
        <p className="text-xs text-gray-500">อัปเดตล่าสุด: 30 เม.ย. 2568</p>
      </div>
      <div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-2xl p-4 text-white">
        <div className="flex items-center gap-2 mb-1"><span className="text-2xl">📢</span><span className="font-bold">ประกาศราคาข้าวโพด ฤดูกาล 2567/68</span></div>
        <p className="text-green-200 text-xs">ราคากลาง: <span className="text-white font-bold text-lg">8,200</span> บาท/ตัน</p>
        <p className="text-green-200 text-xs mt-1">โดย: {MOCK_PRICES[0].announcedBy}</p>
      </div>
      {varieties.map(variety => (
        <div key={variety} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-green-50 px-4 py-2 border-b border-gray-100">
            <h3 className="font-bold text-green-800 text-sm">🌽 {variety}</h3>
          </div>
          {MOCK_PRICES.filter(p => p.variety === variety).map(p => (
            <div key={p.id} className="px-4 py-3 flex items-center justify-between border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${p.grade==='A'?'bg-yellow-100 text-yellow-700':p.grade==='B'?'bg-gray-100 text-gray-700':'bg-orange-100 text-orange-700'}`}>{p.grade}</div>
                <span className="text-sm text-gray-600">เกรด {p.grade}</span>
              </div>
              <div className="text-right"><div className="font-bold text-green-700 text-base">{p.price.toLocaleString()}</div><div className="text-xs text-gray-400">บาท/{p.unit}</div></div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}