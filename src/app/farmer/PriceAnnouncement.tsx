import React, { useEffect, useState } from 'react'
import { getPriceAnnouncements } from '../../lib/dataService'

export default function PriceAnnouncement() {
  const [prices, setPrices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  useEffect(() => {
    ;(async () => {
      try { setLoading(true); setPrices(await getPriceAnnouncements()) }
      catch { setErr('โหลดประกาศราคาไม่สำเร็จ กรุณาลองใหม่อีกครั้ง') }
      finally { setLoading(false) }
    })()
  }, [])

  const varieties = [...new Set(prices.map(p => p.variety))]
  if (loading) return <div className="p-4">กำลังโหลดข้อมูลราคา...</div>
  return (
    <div className="p-4 space-y-4">
      {err && <p className="text-sm text-red-600">{err}</p>}
      <div>
        <h1 className="font-bold text-gray-800">ราคาข้าวโพดประจำวัน</h1>
      </div>
      {varieties.map(variety => (
        <div key={variety} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-green-50 px-4 py-2 border-b border-gray-100"><h3 className="font-bold text-green-800 text-sm">🌽 {variety}</h3></div>
          {prices.filter(p => p.variety === variety).map(p => (
            <div key={p.id} className="px-4 py-3 flex items-center justify-between border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-3"><div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${p.grade==='A'?'bg-yellow-100 text-yellow-700':p.grade==='B'?'bg-gray-100 text-gray-700':'bg-orange-100 text-orange-700'}`}>{p.grade}</div><span className="text-sm text-gray-600">เกรด {p.grade}</span></div>
              <div className="text-right"><div className="font-bold text-green-700 text-base">{Number(p.price).toLocaleString()}</div><div className="text-xs text-gray-400">บาท/{p.unit}</div></div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
