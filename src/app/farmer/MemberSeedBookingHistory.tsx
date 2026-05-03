import React, { useEffect, useState } from 'react'
import { ArrowLeft, CalendarCheck, Package, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../routes/AuthContext'
import { isSupabaseReady, supabase } from '../../lib/supabase'

type BookingItem = { id: string; variety_name: string; quantity: number; sell_price_per_bag: number; total_amount: number }
type Booking = { id: string; booking_no: string; booking_date: string; receive_date: string; pickup_date?: string; pickup_time?: string; pickup_location_name?: string; total_amount: number; deposit_amount: number; status: string; items: BookingItem[] }
const money = (n: number) => Number(n || 0).toLocaleString('th-TH')

export default function MemberSeedBookingHistory() {
  const nav = useNavigate()
  const { user } = useAuth()
  const [rows, setRows] = useState<Booking[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true); setError('')
    try {
      if (!isSupabaseReady || !supabase) { setRows([]); return }
      let q = supabase.from('seed_bookings').select('id,booking_no,booking_date,receive_date,pickup_date,pickup_time,pickup_location_name,total_amount,deposit_amount,status,farmer_id').order('booking_date', { ascending: false }).limit(100)
      if (user?.id) q = q.eq('farmer_id', user.id)
      const { data, error } = await q
      if (error) throw new Error(error.message)
      const bookingIds = (data ?? []).map((r: any) => String(r.id))
      let itemMap = new Map<string, BookingItem[]>()
      if (bookingIds.length > 0) {
        const { data: itemData, error: itemErr } = await supabase.from('seed_booking_items').select('id,booking_id,variety_name,quantity,sell_price_per_bag,total_amount').in('booking_id', bookingIds)
        if (itemErr) throw new Error(itemErr.message)
        ;(itemData ?? []).forEach((it: any) => {
          const key = String(it.booking_id)
          const row: BookingItem = { id: String(it.id), variety_name: String(it.variety_name ?? '-'), quantity: Number(it.quantity ?? 0), sell_price_per_bag: Number(it.sell_price_per_bag ?? 0), total_amount: Number(it.total_amount ?? 0) }
          itemMap.set(key, [...(itemMap.get(key) ?? []), row])
        })
      }
      setRows((data ?? []).map((r: any) => ({ id: String(r.id), booking_no: String(r.booking_no ?? ''), booking_date: String(r.booking_date ?? ''), receive_date: String(r.receive_date ?? ''), pickup_date: String(r.pickup_date ?? ''), pickup_time: String(r.pickup_time ?? ''), pickup_location_name: String(r.pickup_location_name ?? ''), total_amount: Number(r.total_amount ?? 0), deposit_amount: Number(r.deposit_amount ?? 0), status: String(r.status ?? 'pending'), items: itemMap.get(String(r.id)) ?? [] })))
    } catch (e) { setError(e instanceof Error ? e.message : 'โหลดประวัติไม่สำเร็จ') } finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])

  return <div className="min-h-screen bg-gray-50 p-5 space-y-4"><div className="flex items-center justify-between"><button onClick={() => nav('/farmer/seed-booking')} className="p-2 rounded-xl bg-white border"><ArrowLeft className="w-5 h-5" /></button><button onClick={() => void load()} className="p-2 rounded-xl bg-white border"><RefreshCw className="w-5 h-5" /></button></div><div className="bg-emerald-600 text-white rounded-3xl p-5"><div className="flex items-center gap-3"><CalendarCheck className="w-8 h-8" /><div><h1 className="text-xl font-bold">ประวัติการจองเมล็ดพันธุ์</h1><p className="text-sm text-emerald-100">รายการจองของสมาชิก</p></div></div></div>{error && <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 p-3 text-sm">{error}</div>}{loading ? <div className="text-center text-gray-400 py-8">กำลังโหลด...</div> : rows.length === 0 ? <div className="bg-white rounded-2xl border p-6 text-center text-gray-400">ยังไม่มีประวัติการจอง</div> : rows.map((b) => <div key={b.id} className="bg-white rounded-2xl border p-4 space-y-3"><div className="flex justify-between gap-3"><div className="font-bold">{b.booking_no || '-'}</div><div className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">{b.status}</div></div><div className="text-sm text-gray-500">วันที่จอง: {b.booking_date || '-'}</div><div className="text-sm text-gray-500">นัดรับ: {b.pickup_date || b.receive_date || '-'} {b.pickup_time || ''}</div><div className="text-sm text-gray-500">จุดรับ: {b.pickup_location_name || '-'}</div><div className="border rounded-2xl p-3 bg-gray-50 space-y-2"><div className="font-bold text-sm flex items-center gap-2"><Package className="w-4 h-4" />รายการที่จอง</div>{b.items.length === 0 ? <div className="text-sm text-gray-400">ไม่พบรายการสินค้า</div> : b.items.map((it) => <div key={it.id} className="flex justify-between gap-3 text-sm"><div><div className="font-semibold text-gray-800">{it.variety_name}</div><div className="text-xs text-gray-500">{money(it.quantity)} ถุง x {money(it.sell_price_per_bag)} บาท</div></div><b>{money(it.total_amount)} บาท</b></div>)}</div><div className="border-t pt-2 flex justify-between"><span>ยอดจอง</span><b>{money(b.total_amount)} บาท</b></div><div className="flex justify-between text-sm text-red-600"><span>ยอดค้าง</span><b>{money(Math.max(b.total_amount - b.deposit_amount, 0))} บาท</b></div></div>)}</div>
}
