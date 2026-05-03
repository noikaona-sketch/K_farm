import React, { useMemo, useState } from 'react'
import { fmtMoney } from './seedPosTypes'

type BookingItem = { id: string; booking_id: string; variety_name: string; quantity: number; sell_price_per_bag: number; total_amount: number }
type BookingRow = { id: string; booking_no: string; booking_date: string; total_amount: number; deposit_amount: number; status: string }

type Props = { bookings: BookingRow[]; items: BookingItem[]; startDate: string; endDate: string; onStartDateChange: (v: string) => void; onEndDateChange: (v: string) => void }
type GroupRow = { key: string; bookingQty: number; bookingAmount: number; convertedQty: number; convertedAmount: number; remainingQty: number; remainingAmount: number; bookingCount: number }
const isConverted = (s: string) => ['converted', 'completed', 'received'].includes(String(s || '').toLowerCase())

function groupRows(bookings: BookingRow[], items: BookingItem[], mode: 'product' | 'date'): GroupRow[] {
  const bmap = new Map(bookings.map((b) => [b.id, b]))
  const map = new Map<string, GroupRow>()
  items.forEach((it) => {
    const b = bmap.get(it.booking_id)
    if (!b) return
    const key = mode === 'product' ? (it.variety_name || '-') : (b.booking_date || '-')
    const row = map.get(key) ?? { key, bookingQty: 0, bookingAmount: 0, convertedQty: 0, convertedAmount: 0, remainingQty: 0, remainingAmount: 0, bookingCount: 0 }
    const qty = Number(it.quantity || 0)
    const amount = Number(it.total_amount || 0)
    row.bookingQty += qty
    row.bookingAmount += amount
    if (isConverted(b.status)) { row.convertedQty += qty; row.convertedAmount += amount } else { row.remainingQty += qty; row.remainingAmount += amount }
    row.bookingCount += 1
    map.set(key, row)
  })
  return Array.from(map.values()).sort((a, b) => mode === 'date' ? String(b.key).localeCompare(String(a.key)) : b.bookingAmount - a.bookingAmount)
}

export default function SeedBookingSummary({ bookings, items, startDate, endDate, onStartDateChange, onEndDateChange }: Props) {
  const [expanded, setExpanded] = useState(true)
  const [mode, setMode] = useState<'product' | 'date'>('product')
  const totals = useMemo(() => {
    const bmap = new Map(bookings.map((b) => [b.id, b]))
    return items.reduce((acc, it) => { const b = bmap.get(it.booking_id); if (!b) return acc; const qty = Number(it.quantity || 0); const amount = Number(it.total_amount || 0); acc.bookingQty += qty; acc.bookingAmount += amount; if (isConverted(b.status)) { acc.convertedQty += qty; acc.convertedAmount += amount } else { acc.remainingQty += qty; acc.remainingAmount += amount } return acc }, { bookingQty: 0, bookingAmount: 0, convertedQty: 0, convertedAmount: 0, remainingQty: 0, remainingAmount: 0 })
  }, [bookings, items])
  const grouped = useMemo(() => groupRows(bookings, items, mode), [bookings, items, mode])

  return <div className="bg-white rounded-2xl border p-4 space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold text-gray-900">สรุปยอดจอง</h2><div className="text-xs text-gray-500">ยอดจอง / ขายจากจอง / เหลือจอง ตามช่วงวันที่</div></div><button type="button" onClick={() => setExpanded((v) => !v)} className="px-3 py-1.5 rounded-xl border text-sm">{expanded ? 'ยุบสรุป' : 'แสดงสรุป'}</button></div><div className="grid grid-cols-1 sm:grid-cols-3 gap-3"><div><label className="text-xs text-gray-500">วันที่เริ่ม</label><input type="date" value={startDate} onChange={(e) => onStartDateChange(e.target.value)} className="w-full border rounded-xl p-2" /></div><div><label className="text-xs text-gray-500">วันที่สิ้นสุด</label><input type="date" value={endDate} onChange={(e) => onEndDateChange(e.target.value)} className="w-full border rounded-xl p-2" /></div><div className="flex items-end"><button type="button" onClick={() => { onStartDateChange(''); onEndDateChange('') }} className="w-full border rounded-xl p-2 text-sm">ล้างช่วงวันที่</button></div></div>{expanded && <><div className="grid grid-cols-2 lg:grid-cols-6 gap-3"><div className="bg-emerald-50 rounded-2xl p-3 text-center"><div className="text-xl font-bold text-emerald-700">{fmtMoney(totals.bookingAmount)}</div><div className="text-xs text-gray-500">ยอดจองรวม</div></div><div className="bg-blue-50 rounded-2xl p-3 text-center"><div className="text-xl font-bold text-blue-700">{fmtMoney(totals.convertedAmount)}</div><div className="text-xs text-gray-500">ขายจากจองแล้ว</div></div><div className="bg-red-50 rounded-2xl p-3 text-center"><div className="text-xl font-bold text-red-700">{fmtMoney(totals.remainingAmount)}</div><div className="text-xs text-gray-500">ยอดเหลือจอง</div></div><div className="bg-gray-50 rounded-2xl p-3 text-center"><div className="text-xl font-bold text-gray-700">{fmtMoney(totals.bookingQty)}</div><div className="text-xs text-gray-500">ถุงจอง</div></div><div className="bg-amber-50 rounded-2xl p-3 text-center"><div className="text-xl font-bold text-amber-700">{fmtMoney(totals.convertedQty)}</div><div className="text-xs text-gray-500">ถุงขายแล้ว</div></div><div className="bg-orange-50 rounded-2xl p-3 text-center"><div className="text-xl font-bold text-orange-700">{fmtMoney(totals.remainingQty)}</div><div className="text-xs text-gray-500">ถุงเหลือจอง</div></div></div><div className="flex gap-2"><button type="button" onClick={() => setMode('product')} className={`px-3 py-1.5 rounded-xl text-sm border ${mode === 'product' ? 'bg-emerald-600 text-white' : 'bg-white'}`}>ตามเมล็ดพันธุ์</button><button type="button" onClick={() => setMode('date')} className={`px-3 py-1.5 rounded-xl text-sm border ${mode === 'date' ? 'bg-emerald-600 text-white' : 'bg-white'}`}>ตามวันที่</button></div><div className="overflow-x-auto border rounded-2xl"><table className="w-full text-sm"><thead><tr className="bg-gray-50 text-xs text-gray-500"><th className="text-left p-3">{mode === 'product' ? 'เมล็ดพันธุ์' : 'วันที่จอง'}</th><th className="text-right p-3">จำนวนจอง</th><th className="text-right p-3">ยอดจอง</th><th className="text-right p-3">ขายแล้ว</th><th className="text-right p-3">ยอดขายแล้ว</th><th className="text-right p-3">เหลือจอง</th><th className="text-right p-3">ยอดคงเหลือ</th></tr></thead><tbody>{grouped.length === 0 ? <tr><td colSpan={7} className="p-5 text-center text-gray-400">ไม่มีข้อมูลในช่วงวันที่นี้</td></tr> : grouped.map((g) => <tr key={g.key} className="border-t"><td className="p-3 font-medium">{g.key}</td><td className="p-3 text-right">{fmtMoney(g.bookingQty)}</td><td className="p-3 text-right">{fmtMoney(g.bookingAmount)}</td><td className="p-3 text-right text-blue-600">{fmtMoney(g.convertedQty)}</td><td className="p-3 text-right text-blue-600">{fmtMoney(g.convertedAmount)}</td><td className="p-3 text-right text-red-600">{fmtMoney(g.remainingQty)}</td><td className="p-3 text-right text-red-600">{fmtMoney(g.remainingAmount)}</td></tr>)}</tbody></table></div></>}</div>
}
