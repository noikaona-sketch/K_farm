import React, { useEffect, useMemo, useState } from 'react'
import { AlertCircle, CalendarDays, CheckCircle2, ChevronDown, ChevronUp, MapPin, Package, RefreshCw } from 'lucide-react'
import { isSupabaseReady, supabase } from '../../lib/supabase'
import { fmtMoney } from '../admin/seedPosTypes'

type BookingItem = {
  id: string
  variety_name: string
  quantity: number
  sell_price_per_bag: number
  total_amount: number
}

type BookingRow = {
  id: string
  booking_no: string
  booking_date: string
  pickup_location_name: string
  pickup_date: string
  pickup_time: string
  receive_date: string
  total_amount: number
  deposit_amount: number
  balance_amount: number
  status: string
  payment_status: string
  note?: string
  items: BookingItem[]
}

function getMemberProfile() {
  try {
    const raw = window.localStorage.getItem('member_profile')
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function statusText(status: string) {
  switch (status) {
    case 'pending': return 'รออนุมัติ'
    case 'approved': return 'อนุมัติแล้ว'
    case 'ready': return 'พร้อมรับของ'
    case 'converted': return 'ขายแล้ว'
    case 'cancelled': return 'ยกเลิก'
    default: return status || '-'
  }
}

function statusClass(status: string) {
  switch (status) {
    case 'pending': return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'approved': return 'bg-blue-50 text-blue-700 border-blue-200'
    case 'ready': return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'converted': return 'bg-gray-50 text-gray-700 border-gray-200'
    case 'cancelled': return 'bg-red-50 text-red-700 border-red-200'
    default: return 'bg-gray-50 text-gray-700 border-gray-200'
  }
}

export default function MemberSeedBookingHistory() {
  const [bookings, setBookings] = useState<BookingRow[]>([])
  const [expandedId, setExpandedId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const member = typeof window !== 'undefined' ? getMemberProfile() : null
  const memberId = String(member?.farmer_id ?? member?.id ?? '')
  const memberPhone = String(member?.phone ?? '')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      if (!isSupabaseReady || !supabase) {
        setBookings([])
        return
      }

      let query = supabase
        .from('seed_bookings')
        .select('*')
        .order('booking_date', { ascending: false })
        .limit(50)

      if (memberId) query = query.eq('farmer_id', memberId)
      else if (memberPhone) query = query.eq('farmer_phone', memberPhone)

      const { data: bookingRows, error: bookingErr } = await query
      if (bookingErr) throw new Error(bookingErr.message)

      const bookingIds = (bookingRows ?? []).map((b: any) => String(b.id))
      let itemRows: any[] = []
      if (bookingIds.length > 0) {
        const { data: items, error: itemErr } = await supabase
          .from('seed_booking_items')
          .select('*')
          .in('booking_id', bookingIds)
        if (itemErr) throw new Error(itemErr.message)
        itemRows = items ?? []
      }

      const itemMap = new Map<string, BookingItem[]>()
      for (const item of itemRows) {
        const bookingId = String(item.booking_id ?? '')
        const list = itemMap.get(bookingId) ?? []
        list.push({
          id: String(item.id),
          variety_name: String(item.variety_name ?? '-'),
          quantity: Number(item.quantity ?? 0),
          sell_price_per_bag: Number(item.sell_price_per_bag ?? 0),
          total_amount: Number(item.total_amount ?? 0),
        })
        itemMap.set(bookingId, list)
      }

      setBookings((bookingRows ?? []).map((r: any) => ({
        id: String(r.id),
        booking_no: String(r.booking_no ?? ''),
        booking_date: String(r.booking_date ?? ''),
        pickup_location_name: String(r.pickup_location_name ?? ''),
        pickup_date: String(r.pickup_date ?? ''),
        pickup_time: String(r.pickup_time ?? ''),
        receive_date: String(r.receive_date ?? ''),
        total_amount: Number(r.total_amount ?? 0),
        deposit_amount: Number(r.deposit_amount ?? 0),
        balance_amount: Number(r.balance_amount ?? 0),
        status: String(r.status ?? 'pending'),
        payment_status: String(r.payment_status ?? 'unpaid'),
        note: String(r.note ?? ''),
        items: itemMap.get(String(r.id)) ?? [],
      })))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดประวัติไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const totals = useMemo(() => {
    return bookings.reduce((sum, b) => sum + Number(b.total_amount || 0), 0)
  }, [bookings])

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="sticky top-0 z-20 bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-lg">ประวัติการจอง</h1>
            <div className="text-xs text-gray-500">ติดตามสถานะจองเมล็ดพันธุ์</div>
          </div>
          <button type="button" onClick={() => void load()} className="w-10 h-10 rounded-full border flex items-center justify-center">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {error && <div className="rounded-2xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm flex gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}

        <div className="bg-white rounded-2xl border p-4 grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-gray-500">จำนวนใบจอง</div>
            <div className="text-2xl font-bold text-gray-900">{fmtMoney(bookings.length)}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">ยอดจองรวม</div>
            <div className="text-2xl font-bold text-emerald-700">{fmtMoney(totals)}</div>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-10">กำลังโหลด...</div>
        ) : bookings.length === 0 ? (
          <div className="bg-white rounded-2xl border p-8 text-center text-gray-400">
            <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
            ยังไม่มีประวัติการจอง
          </div>
        ) : bookings.map((b) => {
          const expanded = expandedId === b.id
          return (
            <div key={b.id} className="bg-white rounded-2xl border shadow-sm overflow-hidden">
              <button type="button" onClick={() => setExpandedId(expanded ? '' : b.id)} className="w-full text-left p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-mono text-sm text-gray-500">{b.booking_no}</div>
                    <div className="font-bold text-gray-900 mt-1">{fmtMoney(b.total_amount)} บาท</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full border ${statusClass(b.status)}`}>{statusText(b.status)}</span>
                    {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </div>
                <div className="mt-3 space-y-1 text-sm text-gray-600">
                  <div className="flex items-center gap-2"><CalendarDays className="w-4 h-4" />รับ {b.pickup_date || b.receive_date || '-'} {b.pickup_time}</div>
                  <div className="flex items-center gap-2"><MapPin className="w-4 h-4" />{b.pickup_location_name || '-'}</div>
                </div>
              </button>

              {expanded && (
                <div className="border-t p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-gray-50 rounded-xl p-3"><div className="text-xs text-gray-500">วันที่จอง</div><div className="font-semibold">{b.booking_date || '-'}</div></div>
                    <div className="bg-gray-50 rounded-xl p-3"><div className="text-xs text-gray-500">การชำระ</div><div className="font-semibold">{b.payment_status === 'unpaid' ? 'เครดิต/ค้างชำระ' : b.payment_status}</div></div>
                    <div className="bg-gray-50 rounded-xl p-3"><div className="text-xs text-gray-500">ชำระแล้ว</div><div className="font-semibold">{fmtMoney(b.deposit_amount)}</div></div>
                    <div className="bg-gray-50 rounded-xl p-3"><div className="text-xs text-gray-500">ยอดค้าง</div><div className="font-semibold text-red-600">{fmtMoney(b.balance_amount)}</div></div>
                  </div>

                  <div className="space-y-2">
                    <div className="font-semibold text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />รายการสินค้า</div>
                    {b.items.length === 0 ? <div className="text-sm text-gray-400">ไม่มีรายการสินค้า</div> : b.items.map((item) => (
                      <div key={item.id} className="border rounded-xl p-3 text-sm">
                        <div className="flex justify-between gap-2">
                          <div className="font-medium">{item.variety_name}</div>
                          <div className="font-semibold">{fmtMoney(item.total_amount)}</div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{fmtMoney(item.quantity)} ถุง x {fmtMoney(item.sell_price_per_bag)} บาท</div>
                      </div>
                    ))}
                  </div>

                  {b.note && <div className="text-sm bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-800">หมายเหตุ: {b.note}</div>}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
