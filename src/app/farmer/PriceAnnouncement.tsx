import React, { useEffect, useState } from 'react'
import { MOCK_PRICES } from '../../data/mockData'
import { db, isSupabaseEnabled } from '../../lib/supabase'

export default function PriceAnnouncement() {
  const [prices, setPrices] = useState(MOCK_PRICES)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      const { data } = await db.select('price_announcements')
      if (isSupabaseEnabled && data.length === 0) setError('ยังไม่มีข้อมูลราคาในระบบ')
      if (data.length) setPrices(data as any)
      setLoading(false)
    })()
  }, [])

  const varieties = [...new Set(prices.map(p => p.variety))]
  return <div className="p-4 space-y-4">{loading && <p>กำลังโหลด...</p>}{error && <p className='text-red-600'>{error}</p>}{varieties.map(v => <div key={v}>{v}</div>)}</div>
}
