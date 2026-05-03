import React, { useMemo, useState } from 'react'
import type { PosSaleRow } from './seedPosTypes'
import { fmtMoney } from './seedPosTypes'

type Props = {
  sales: PosSaleRow[]
  startDate: string
  endDate: string
  onStartDateChange: (value: string) => void
  onEndDateChange: (value: string) => void
}

type GroupRow = {
  key: string
  quantity: number
  total: number
  paid: number
  pendingDelivery: number
  returned: number
}

function groupSales(sales: PosSaleRow[], mode: 'product' | 'date'): GroupRow[] {
  const map = new Map<string, GroupRow>()

  for (const s of sales) {
    const key = mode === 'product' ? (s.variety_name || '-') : (s.sale_date || '-')
    const row = map.get(key) ?? {
      key,
      quantity: 0,
      total: 0,
      paid: 0,
      pendingDelivery: 0,
      returned: 0,
    }

    row.quantity += Number(s.quantity || 0)
    row.total += Number(s.total_amount || 0)
    row.paid += Number(s.paid_amount || 0)
    row.pendingDelivery += Number(s.pending_delivery_qty || 0)
    row.returned += Number(s.returned_quantity || 0)
    map.set(key, row)
  }

  return Array.from(map.values()).sort((a, b) => {
    if (mode === 'date') return String(b.key).localeCompare(String(a.key))
    return b.total - a.total
  })
}

export default function SeedPOSSalesSummary({
  sales,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: Props) {
  const [expanded, setExpanded] = useState(true)
  const [mode, setMode] = useState<'product' | 'date'>('product')

  const totals = useMemo(() => {
    const total = sales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0)
    const paid = sales.reduce((sum, s) => sum + Number(s.paid_amount || 0), 0)
    const quantity = sales.reduce((sum, s) => sum + Number(s.quantity || 0), 0)
    const pendingDelivery = sales.reduce((sum, s) => sum + Number(s.pending_delivery_qty || 0), 0)
    const returned = sales.reduce((sum, s) => sum + Number(s.returned_quantity || 0), 0)
    const debt = Math.max(total - paid, 0)
    return { total, paid, debt, quantity, pendingDelivery, returned }
  }, [sales])

  const grouped = useMemo(() => groupSales(sales, mode), [sales, mode])

  return (
    <div className="bg-white rounded-2xl border p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-gray-900">สรุปยอดขาย</h2>
          <div className="text-xs text-gray-500">กรองตามช่วงวันที่ขาย</div>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="px-3 py-1.5 rounded-xl border text-sm"
        >
          {expanded ? 'ยุบสรุป' : 'แสดงสรุป'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-gray-500">วันที่เริ่ม</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="w-full border rounded-xl p-2"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">วันที่สิ้นสุด</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="w-full border rounded-xl p-2"
          />
        </div>
        <div className="flex items-end">
          <button
            type="button"
            onClick={() => {
              onStartDateChange('')
              onEndDateChange('')
            }}
            className="w-full border rounded-xl p-2 text-sm"
          >
            ล้างช่วงวันที่
          </button>
        </div>
      </div>

      {expanded && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="bg-emerald-50 rounded-2xl p-3 text-center">
              <div className="text-xl font-bold text-emerald-700">{fmtMoney(totals.total)}</div>
              <div className="text-xs text-gray-500">ยอดขาย</div>
            </div>
            <div className="bg-blue-50 rounded-2xl p-3 text-center">
              <div className="text-xl font-bold text-blue-700">{fmtMoney(totals.paid)}</div>
              <div className="text-xs text-gray-500">รับชำระ</div>
            </div>
            <div className="bg-red-50 rounded-2xl p-3 text-center">
              <div className="text-xl font-bold text-red-700">{fmtMoney(totals.debt)}</div>
              <div className="text-xs text-gray-500">ยอดค้าง</div>
            </div>
            <div className="bg-amber-50 rounded-2xl p-3 text-center">
              <div className="text-xl font-bold text-amber-700">{fmtMoney(totals.pendingDelivery)}</div>
              <div className="text-xs text-gray-500">ค้างส่ง</div>
            </div>
            <div className="bg-orange-50 rounded-2xl p-3 text-center">
              <div className="text-xl font-bold text-orange-700">{fmtMoney(totals.returned)}</div>
              <div className="text-xs text-gray-500">คืนแล้ว</div>
            </div>
            <div className="bg-gray-50 rounded-2xl p-3 text-center">
              <div className="text-xl font-bold text-gray-700">{fmtMoney(totals.quantity)}</div>
              <div className="text-xs text-gray-500">จำนวนขาย</div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode('product')}
              className={`px-3 py-1.5 rounded-xl text-sm border ${mode === 'product' ? 'bg-emerald-600 text-white' : 'bg-white'}`}
            >
              ตามสินค้า
            </button>
            <button
              type="button"
              onClick={() => setMode('date')}
              className={`px-3 py-1.5 rounded-xl text-sm border ${mode === 'date' ? 'bg-emerald-600 text-white' : 'bg-white'}`}
            >
              ตามวันที่
            </button>
          </div>

          <div className="overflow-x-auto border rounded-2xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500">
                  <th className="text-left p-3">{mode === 'product' ? 'สินค้า' : 'วันที่'}</th>
                  <th className="text-right p-3">จำนวน</th>
                  <th className="text-right p-3">ยอดขาย</th>
                  <th className="text-right p-3">รับชำระ</th>
                  <th className="text-right p-3">ค้างส่ง</th>
                  <th className="text-right p-3">คืนแล้ว</th>
                </tr>
              </thead>
              <tbody>
                {grouped.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-5 text-center text-gray-400">ไม่มีข้อมูลในช่วงวันที่นี้</td>
                  </tr>
                ) : grouped.map((g) => (
                  <tr key={g.key} className="border-t">
                    <td className="p-3 font-medium">{g.key}</td>
                    <td className="p-3 text-right">{fmtMoney(g.quantity)}</td>
                    <td className="p-3 text-right">{fmtMoney(g.total)}</td>
                    <td className="p-3 text-right">{fmtMoney(g.paid)}</td>
                    <td className="p-3 text-right text-red-600">{fmtMoney(g.pendingDelivery)}</td>
                    <td className="p-3 text-right text-orange-600">{fmtMoney(g.returned)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
