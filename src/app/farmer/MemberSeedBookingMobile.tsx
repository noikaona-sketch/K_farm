import React, { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, CalendarCheck, History, Minus, Package, Plus, RefreshCw, ShoppingCart } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../routes/AuthContext'
import { isSupabaseReady, supabase } from '../../lib/supabase'

type SeedItem = { id: string; varietyId: string; name: string; lotNo: string; supplier: string; price: number; stock: number }
type PickupLocation = { id: string; name: string; address?: string }
type PickupSlot = { id: string; location_id: string; pickup_date: string; pickup_time: string; capacity_qty: number; booked_qty: number; status: string }
type CartItem = SeedItem & { qty: number }
const money = (n: number) => Number(n || 0).toLocaleString('th-TH')
const today = () => new Date().toISOString().slice(0, 10)
const genBookingNo = () => `MB-${Date.now().toString().slice(-8)}`

export default function MemberSeedBookingMobile() {
  const nav = useNavigate()
  const { user } = useAuth()
  const [items, setItems] = useState<SeedItem[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [locations, setLocations] = useState<PickupLocation[]>([])
  const [slots, setSlots] = useState<PickupSlot[]>([])
  const [locationId, setLocationId] = useState('')
  const [slotId, setSlotId] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  const selectedLocation = locations.find((x) => x.id === locationId)
  const availableSlots = useMemo(() => slots.filter((s) => s.location_id === locationId && s.status === 'open'), [slots, locationId])
  const selectedSlot = availableSlots.find((s) => s.id === slotId)
  const total = cart.reduce((sum, x) => sum + x.qty * x.price, 0)
  const totalQty = cart.reduce((sum, x) => sum + x.qty, 0)
  const debt = total
  const groupedItems = useMemo(() => {
    const groups = new Map<string, SeedItem[]>()
    items.forEach((item) => groups.set(item.supplier || '-', [...(groups.get(item.supplier || '-') ?? []), item]))
    return Array.from(groups.entries()).map(([supplier, rows]) => ({ supplier, rows }))
  }, [items])

  const load = async () => {
    setLoading(true); setError('')
    try {
      if (!isSupabaseReady || !supabase) { setItems([]); return }
      const [varietyRes, lotRes, locRes, slotRes] = await Promise.all([
        supabase.from('seed_varieties').select('id,variety_name,supplier_id,sell_price_per_bag,price,status').neq('status', 'inactive').order('variety_name'),
        supabase.from('seed_stock_lots').select('id,variety_id,variety_name,lot_no,supplier_name,quantity_balance,status').neq('status', 'inactive').order('created_at', { ascending: true }),
        supabase.from('pickup_locations').select('id,name,address,active').eq('active', true).order('name'),
        supabase.from('pickup_slots').select('id,location_id,pickup_date,pickup_time,capacity_qty,booked_qty,status').in('status', ['open', 'full']).order('pickup_date', { ascending: true }),
      ])
      if (varietyRes.error) throw new Error(varietyRes.error.message)
      if (lotRes.error) throw new Error(lotRes.error.message)
      if (locRes.error) throw new Error(locRes.error.message)
      if (slotRes.error) throw new Error(slotRes.error.message)
      const vmap = new Map((varietyRes.data ?? []).map((v: any) => [String(v.id), v]))
      setItems((lotRes.data ?? []).map((l: any) => { const v: any = vmap.get(String(l.variety_id)); const price = Number(v?.sell_price_per_bag ?? 0) || Number(v?.price ?? 0); return { id: String(l.id), varietyId: String(l.variety_id ?? ''), name: String(l.variety_name ?? v?.variety_name ?? '-'), lotNo: String(l.lot_no ?? '-'), supplier: String(l.supplier_name ?? '-'), price, stock: Number(l.quantity_balance ?? 0) } }))
      setLocations((locRes.data ?? []).map((r: any) => ({ id: String(r.id), name: String(r.name ?? '-'), address: String(r.address ?? '') })))
      setSlots((slotRes.data ?? []).map((r: any) => ({ id: String(r.id), location_id: String(r.location_id ?? ''), pickup_date: String(r.pickup_date ?? ''), pickup_time: String(r.pickup_time ?? ''), capacity_qty: Number(r.capacity_qty ?? 0), booked_qty: Number(r.booked_qty ?? 0), status: String(r.status ?? 'open') })))
    } catch (e) { setError(e instanceof Error ? e.message : 'โหลดข้อมูลไม่สำเร็จ') } finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])
  useEffect(() => { if (availableSlots.length > 0 && !availableSlots.some((s) => s.id === slotId)) setSlotId(availableSlots[0].id) }, [availableSlots, slotId])

  const add = (item: SeedItem) => setCart((prev) => { const old = prev.find((x) => x.id === item.id); return old ? prev.map((x) => x.id === item.id ? { ...x, qty: x.qty + 1 } : x) : [...prev, { ...item, qty: 1 }] })
  const setQty = (id: string, qty: number) => setCart((prev) => prev.map((x) => x.id === id ? { ...x, qty: Math.max(1, qty) } : x).filter((x) => x.qty > 0))
  const remove = (id: string) => setCart((prev) => prev.filter((x) => x.id !== id))

  const submit = async () => {
    setSaving(true); setError(''); setOk('')
    try {
      if (!supabase) throw new Error('ยังไม่เชื่อมฐานข้อมูล')
      if (cart.length === 0) throw new Error('กรุณาเลือกเมล็ดพันธุ์')
      if (!selectedLocation) throw new Error('กรุณาเลือกจุดรับสินค้า')
      if (!selectedSlot) throw new Error('กรุณาเลือกรอบรับสินค้า')
      const bookingNo = genBookingNo()
      const { data: booking, error: bErr } = await supabase.from('seed_bookings').insert({ booking_no: bookingNo, booking_date: today(), receive_date: selectedSlot.pickup_date, farmer_id: user?.id ?? null, farmer_name: user?.name ?? 'สมาชิก', farmer_phone: user?.phone ?? '', total_amount: total, deposit_amount: 0, balance_amount: debt, status: 'pending', payment_status: 'unpaid', pickup_location_id: selectedLocation.id, pickup_slot_id: selectedSlot.id, pickup_location_name: selectedLocation.name, pickup_date: selectedSlot.pickup_date, pickup_time: selectedSlot.pickup_time, note }).select('id').single()
      if (bErr) throw new Error(bErr.message)
      const rows = cart.map((x) => ({ booking_id: booking.id, lot_id: x.id, lot_no: x.lotNo, variety_id: x.varietyId, variety_name: x.name, quantity: x.qty, sell_price_per_bag: x.price, total_amount: x.qty * x.price, reserved_quantity: 0, status: 'pending' }))
      const { error: iErr } = await supabase.from('seed_booking_items').insert(rows)
      if (iErr) throw new Error(iErr.message)
      const nextBooked = Number(selectedSlot.booked_qty || 0) + totalQty
      await supabase.from('pickup_slots').update({ booked_qty: nextBooked, status: nextBooked >= Number(selectedSlot.capacity_qty || 0) ? 'full' : selectedSlot.status }).eq('id', selectedSlot.id)
      setCart([]); setNote(''); setOk(`จองสำเร็จ เลขที่ ${bookingNo}`); await load()
    } catch (e) { setError(e instanceof Error ? e.message : 'จองไม่สำเร็จ') } finally { setSaving(false) }
  }

  return <div className="min-h-screen bg-gray-50 p-4 space-y-4"><div className="flex items-center justify-between"><button onClick={() => nav('/farmer')} className="bg-white border rounded-xl p-2"><ArrowLeft className="w-5 h-5" /></button><button onClick={() => nav('/farmer/seed-booking-history')} className="bg-white border rounded-xl px-3 py-2 text-sm flex gap-1"><History className="w-4 h-4" />ประวัติ</button></div><div className="bg-emerald-600 text-white rounded-3xl p-5 shadow-lg"><div className="flex items-center gap-3"><Package className="w-8 h-8" /><div><h1 className="text-xl font-bold">จองเมล็ดพันธุ์</h1><p className="text-sm text-emerald-100">จองแบบเครดิต / ลูกหนี้</p></div></div></div>{ok && <div className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 text-sm">{ok}</div>}{error && <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 p-3 text-sm">{error}</div>}{loading ? <div className="text-center text-gray-400 py-8"><RefreshCw className="w-6 h-6 mx-auto animate-spin" />กำลังโหลด...</div> : <div className="space-y-4">{groupedItems.map((group) => <div key={group.supplier} className="space-y-2"><div className="font-bold text-sm text-gray-700 px-1">Supplier: {group.supplier}</div>{group.rows.map((x) => <div key={x.id} className="bg-white rounded-2xl border p-4"><div className="flex justify-between gap-3 items-start"><div className="min-w-0"><div className="font-bold text-gray-900">{x.name}</div><div className="text-xs text-gray-500">LOT {x.lotNo}</div><div className="text-xs text-gray-500">คงเหลือ {money(x.stock)} ถุง</div></div><div className="flex items-center gap-3"><div className="text-right"><div className="font-bold text-emerald-700">{money(x.price)}</div><div className="text-xs text-gray-400">บาท/ถุง</div></div><button onClick={() => add(x)} className="rounded-full bg-emerald-600 text-white p-2 shadow-sm"><Plus className="w-5 h-5" /></button></div></div></div>)}</div>)}</div>}<div className="bg-white rounded-2xl border p-4 space-y-3"><div className="font-bold flex gap-2"><ShoppingCart className="w-5 h-5" />ตะกร้าจอง</div>{cart.length === 0 ? <div className="text-center text-gray-400 py-4">ยังไม่มีสินค้า</div> : cart.map((x) => <div key={x.id} className="border rounded-xl p-3"><div className="font-semibold">{x.name}</div><div className="text-xs text-gray-500">{x.lotNo} | {money(x.price)} บาท/ถุง</div><div className="flex items-center justify-between mt-2"><div className="flex items-center gap-2"><button onClick={() => x.qty <= 1 ? remove(x.id) : setQty(x.id, x.qty - 1)} className="border rounded-lg p-1"><Minus className="w-4 h-4" /></button><span className="font-bold w-8 text-center">{x.qty}</span><button onClick={() => setQty(x.id, x.qty + 1)} className="border rounded-lg p-1"><Plus className="w-4 h-4" /></button></div><b>{money(x.qty * x.price)} บาท</b></div></div>)}<div className="border-t pt-3 space-y-2"><select value={locationId} onChange={(e) => { setLocationId(e.target.value); setSlotId('') }} className="w-full border rounded-xl p-3 bg-white"><option value="">เลือกจุดรับสินค้า</option>{locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select>{selectedLocation?.address && <div className="text-xs text-gray-500">{selectedLocation.address}</div>}<select value={slotId} onChange={(e) => setSlotId(e.target.value)} disabled={!locationId} className="w-full border rounded-xl p-3 bg-white"><option value="">เลือกรอบรับ</option>{availableSlots.map((s) => <option key={s.id} value={s.id}>{s.pickup_date} {s.pickup_time} | เหลือ {money(Number(s.capacity_qty || 0) - Number(s.booked_qty || 0))}</option>)}</select><textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="หมายเหตุ" className="w-full border rounded-xl p-3" /><div className="flex justify-between text-lg"><span>รวม</span><b>{money(total)} บาท</b></div><div className="flex justify-between text-red-600"><span>ยอดค้างเครดิต</span><b>{money(debt)} บาท</b></div><button disabled={saving || cart.length === 0} onClick={submit} className="w-full rounded-xl bg-emerald-600 disabled:bg-gray-300 text-white py-3 font-bold flex justify-center gap-2"><CalendarCheck className="w-5 h-5" />{saving ? 'กำลังจอง...' : 'ยืนยันจอง'}</button></div></div></div>
}
