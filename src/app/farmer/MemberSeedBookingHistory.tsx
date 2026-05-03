import React, { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, CalendarCheck, ChevronDown, ChevronUp, MapPin, Package, RefreshCw, Wallet } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../routes/AuthContext'
import { isSupabaseReady, supabase } from '../../lib/supabase'

type BookingItem = { id: string; variety_name: string; quantity: number; sell_price_per_bag: number; total_amount: number }
type Booking = { id: string; booking_no: string; booking_date: string; receive_date: string; pickup_date?: string; pickup_time?: string; pickup_location_name?: string; total_amount: number; deposit_amount: number; status: string; items: BookingItem[] }
const money = (n: number) => Number(n || 0).toLocaleString('th-TH')
const statusText = (s: string) => s === 'converted' ? 'แปลงเป็นขายแล้ว' : s === 'cancelled' ? 'ยกเลิก' : s === 'completed' ? 'เสร็จสิ้น' : 'รอดำเนินการ'
const statusClass = (s: string) => s === 'converted' || s === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : s === 'cancelled' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-amber-50 text-amber-700 border-amber-100'

export default function MemberSeedBookingHistory() {
  const nav = useNavigate()
  const { user } = useAuth()
  const [rows, setRows] = useState<Booking[]>([])
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const summary = useMemo(() => ({ count: rows.length, qty: rows.reduce((s, b) => s + b.items.reduce((x, it) => x + Number(it.quantity || 0), 0), 0), debt: rows.reduce((s, b) => s + Math.max(b.total_amount - b.deposit_amount, 0), 0) }), [rows])

  const load = async () => {
    setLoading(true); setError('')
    try {
      if (!isSupabaseReady || !supabase) { setRows([]); return }
      let q = supabase.from('seed_bookings').select('id,booking_no,booking_date,receive_date,pickup_date,pickup_time,pickup_location_name,total_amount,deposit_amount,status,farmer_id').order('booking_date', { ascending: false }).limit(100)
      if (user?.id) q = q.eq('farmer_id', user.id)
      const { data, error } = await q
      if (error) throw new Error(error.message)
      const bookingIds = (data ?? []).map((r: any) => String(r.id))
      const itemMap = new Map<string, BookingItem[]>()
      if (bookingIds.length > 0) {
        const { data: itemData, error: itemErr } = await supabase.from('seed_booking_items').select('id,booking_id,variety_name,quantity,sell_price_per_bag,total_amount').in('booking_id', bookingIds)
        if (itemErr) throw new Error(itemErr.message)
        ;(itemData ?? []).forEach((it: any) => { const key = String(it.booking_id); const row: BookingItem = { id: String(it.id), variety_name: String(it.variety_name ?? '-'), quantity: Number(it.quantity ?? 0), sell_price_per_bag: Number(it.sell_price_per_bag ?? 0), total_amount: Number(it.total_amount ?? 0) }; itemMap.set(key, [...(itemMap.get(key) ?? []), row]) })
      }
      setRows((data ?? []).map((r: any) => ({ id: String(r.id), booking_no: String(r.booking_no ?? ''), booking_date: String(r.booking_date ?? ''), receive_date: String(r.receive_date ?? ''), pickup_date: String(r.pickup_date ?? ''), pickup_time: String(r.pickup_time ?? ''), pickup_location_name: String(r.pickup_location_name ?? ''), total_amount: Number(r.total_amount ?? 0), deposit_amount: Number(r.deposit_amount ?? 0), status: String(r.status ?? 'pending'), items: itemMap.get(String(r.id)) ?? [] })))
    } catch (e) { setError(e instanceof Error ? e.message : 'โหลดประวัติไม่สำเร็จ') } finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])

  return <div className="min-h-screen bg-gray-50 p-5 space-y-4"><div className="flex items-center justify-between"><button onClick={() => nav('/farmer/seed-booking')} className="p-2 rounded-xl bg-white border shadow-sm"><ArrowLeft className="w-5 h-5" /></button><button onClick={() => void load()} className="p-2 rounded-xl bg-white border shadow-sm"><RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} /></button></div><div className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white rounded-3xl p-5 shadow-lg"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center"><CalendarCheck className="w-7 h-7" /></div><div><h1 className="text-xl font-bold">ประวัติการจองเมล็ดพันธุ์</h1><p className="text-sm text-emerald-100">รายการจองของสมาชิก</p></div></div><div className="mt-4 grid grid-cols-3 gap-2 text-center"><div className="bg-white/10 rounded-2xl p-2"><div className="text-lg font-bold">{summary.count}</div><div className="text-[11px] text-emerald-100">ใบจอง</div></div><div className="bg-white/10 rounded-2xl p-2"><div className="text-lg font-bold">{money(summary.qty)}</div><div className="text-[11px] text-emerald-100">ถุง</div></div><div className="bg-white/10 rounded-2xl p-2"><div className="text-lg font-bold">{money(summary.debt)}</div><div className="text-[11px] text-emerald-100">ค้าง</div></div></div></div>{error && <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 p-3 text-sm">{error}</div>}{loading ? <div className="bg-white rounded-2xl border p-8 text-center text-gray-400">กำลังโหลด...</div> : rows.length === 0 ? <div className="bg-white rounded-2xl border p-8 text-center text-gray-400"><Package className="w-10 h-10 mx-auto mb-2 opacity-40" />ยังไม่มีประวัติการจอง</div> : rows.map((b) => { const open = expanded[b.id] ?? true; const qty = b.items.reduce((s, it) => s + Number(it.quantity || 0), 0); return <div key={b.id} className="bg-white rounded-3xl border shadow-sm overflow-hidden"><div className="p-4 space-y-3"><div className="flex justify-between gap-3 items-start"><div><div className="text-xs text-gray-400">เลขที่จอง</div><div className="font-bold text-lg">{b.booking_no || '-'}</div></div><div className={`text-xs px-3 py-1 rounded-full border font-semibold ${statusClass(b.status)}`}>{statusText(b.status)}</div></div><div className="grid grid-cols-2 gap-2 text-sm"><div className="rounded-2xl bg-gray-50 p-3"><div className="text-gray-400 text-xs">วันที่จอง</div><div className="font-semibold">{b.booking_date || '-'}</div></div><div className="rounded-2xl bg-gray-50 p-3"><div className="text-gray-400 text-xs">จำนวน</div><div className="font-semibold">{money(qty)} ถุง</div></div></div><div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-3 text-sm"><div className="flex items-start gap-2"><MapPin className="w-4 h-4 text-emerald-700 mt-0.5" /><div><div className="font-semibold text-emerald-900">{b.pickup_location_name || '-'}</div><div className="text-emerald-700">{b.pickup_date || b.receive_date || '-'} {b.pickup_time || ''}</div></div></div></div><button type="button" onClick={() => setExpanded((p) => ({ ...p, [b.id]: !open }))} className="w-full flex items-center justify-between border rounded-2xl p-3 font-semibold"><span className="flex items-center gap-2"><Package className="w-4 h-4" />รายการที่จอง</span>{open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</button>{open && <div className="space-y-2">{b.items.length === 0 ? <div className="text-sm text-gray-400 text-center py-2">ไม่พบรายการสินค้า</div> : b.items.map((it) => <div key={it.id} className="rounded-2xl bg-gray-50 p-3 flex justify-between gap-3"><div><div className="font-semibold text-gray-800">{it.variety_name}</div><div className="text-xs text-gray-500">{money(it.quantity)} ถุง x {money(it.sell_price_per_bag)} บาท</div></div><b>{money(it.total_amount)} บาท</b></div>)}</div>}</div><div className="border-t bg-gray-50 p-4 space-y-2"><div className="flex justify-between"><span className="flex items-center gap-2 text-gray-600"><Wallet className="w-4 h-4" />ยอดจอง</span><b>{money(b.total_amount)} บาท</b></div><div className="flex justify-between text-red-600"><span>ยอดค้างเครดิต</span><b>{money(Math.max(b.total_amount - b.deposit_amount, 0))} บาท</b></div></div></div> })}</div>
}
