import React, { useEffect, useState } from 'react'
import { RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { fetchPrices } from '../../lib/db'
import { isSupabaseReady } from '../../lib/supabase'
import type { Price } from '../../data/mockData'

export default function PriceAnnouncement() {
  const [prices, setPrices] = useState<Price[]>([])
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState<'supabase' | 'mock'>('mock')
  const [lastUpdate, setLastUpdate] = useState('')
  const [err, setErr] = useState<string | null>(null)

  const load = async () => {
    setLoading(true); setErr(null)
    const res = await fetchPrices()
    if (res.data) {
      setPrices(res.data)
      setSource(res.source)
      setLastUpdate(new Date().toLocaleTimeString('th-TH'))
    }
    if (res.error) setErr(res.error)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const varieties = [...new Set(prices.map(p => p.variety))]
  const topPrice = prices.find(p => p.grade === 'A')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-gray-900 text-xl">ราคาข้าวโพดวันนี้</h1>
            <div className="flex items-center gap-1.5 mt-1">
              {source === 'supabase'
                ? <><Wifi className="w-3 h-3 text-emerald-600" /><span className="text-xs text-emerald-600 font-medium">ข้อมูลจาก Supabase</span></>
                : <><WifiOff className="w-3 h-3 text-amber-500" /><span className="text-xs text-amber-600 font-medium">ข้อมูล Mock</span></>}
              {lastUpdate && <span className="text-xs text-gray-400">• {lastUpdate}</span>}
            </div>
          </div>
          <button onClick={load} disabled={loading}
            className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 transition-colors">
            <RefreshCw className={`w-5 h-5 text-emerald-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Error banner */}
        {err && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
            ⚠️ {err} — แสดงข้อมูล Mock แทน
          </div>
        )}

        {/* Today's highlight */}
        {!loading && topPrice && (
          <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-800 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-28 h-28 bg-white/10 rounded-full -mr-14 -mt-14" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">📢</span>
                <div>
                  <div className="font-bold text-lg">ประกาศราคาข้าวโพด</div>
                  <div className="text-emerald-200 text-xs">
                    {topPrice.effectiveDate ? `มีผล ${topPrice.effectiveDate}` : 'ฤดูกาล 2567/68'}
                  </div>
                </div>
              </div>
              <div className="bg-white/15 rounded-2xl p-4 flex items-center justify-between mt-3">
                <div>
                  <div className="text-emerald-100 text-xs mb-1">ราคากลาง (เกรด A)</div>
                  <div className="text-3xl font-bold">{topPrice.price.toLocaleString()}</div>
                  <div className="text-emerald-200 text-sm">บาท/{topPrice.unit}</div>
                </div>
                <div className="text-right">
                  <div className="text-emerald-100 text-xs mb-1">ประกาศโดย</div>
                  <div className="text-sm font-medium leading-snug max-w-32 text-right">{topPrice.announcedBy || 'สมาคมส่งเสริม'}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center py-12 gap-3">
            <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
            <p className="text-gray-500 text-sm">กำลังโหลดราคา...</p>
          </div>
        )}

        {/* Price tables */}
        {!loading && varieties.map(variety => (
          <div key={variety} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-emerald-50 px-4 py-3 border-b border-gray-100">
              <h3 className="font-bold text-emerald-800 text-sm">🌽 {variety}</h3>
            </div>
            {prices.filter(p => p.variety === variety).map(p => (
              <div key={p.id} className="px-4 py-3 flex items-center justify-between border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${p.grade === 'A' ? 'bg-yellow-100 text-yellow-700' : p.grade === 'B' ? 'bg-gray-100 text-gray-700' : 'bg-orange-100 text-orange-700'}`}>
                    {p.grade}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-700">เกรด {p.grade}</div>
                    {p.effectiveDate && <div className="text-xs text-gray-400">มีผล {p.effectiveDate}</div>}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-emerald-700 text-lg">{p.price.toLocaleString()}</div>
                  <div className="text-xs text-gray-400">บาท/{p.unit}</div>
                </div>
              </div>
            ))}
          </div>
        ))}

        {!loading && prices.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <div className="text-5xl mb-3">💰</div>
            <p className="font-medium">ยังไม่มีประกาศราคา</p>
          </div>
        )}
      </div>
    </div>
  )
}
