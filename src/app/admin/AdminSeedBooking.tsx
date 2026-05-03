import React, { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Check, RefreshCw, Search, ShoppingCart, Wifi, WifiOff } from 'lucide-react'
import { isSupabaseReady, supabase } from '../../lib/supabase'
import SeedPOSProductGrid from './SeedPOSProductGrid'
import AdminSeedBookingCart from './AdminSeedBookingCart'
import SeedBookingSummary from './SeedBookingSummary'
import type { PosCartItem, PosFarmer, PosLot } from './seedPosTypes'
import { addDaysDate, fmtMoney, todayDate } from './seedPosTypes'
import { addLotToCart, calcCartTotal } from './seedPosLogic'
import AdminAssignLotPanel from './AdminAssignLotPanel'

const MOCK_FARMERS: PosFarmer[] = [
  { id: 'mock-f1', profileId: 'mock-p1', name: 'สมชาย ใจดี', phone: '0812345678', idCard: '1234567890123', district: 'สำโรง' },
]


const MOCK_LOTS: PosLot[] = [
  { id: 'mock-v1', supplierId: 'mock-s1', supplierName: 'Supplier A', varietyId: 'mock-v1', varietyName: 'ข้าวโพด A', lotNo: '', balance: 0, price: 850 },
  { id: 'mock-v2', supplierId: 'mock-s2', supplierName: 'Supplier B', varietyId: 'mock-v2', varietyName: 'ข้าวโพด B', lotNo: '', balance: 0, price: 900 },
]

type BookingRow = { id: string; booking_no: string; booking_date: string; receive_date: string; farmer_id: string; farmer_name: string; farmer_phone: string; total_amount: number; deposit_amount: number; status: string; note?: string }
type BookingItemRow = { id: string; booking_id: string; variety_name: string; quantity: number; sell_price_per_bag: number; total_amount: number }
type PickupLocation = { id: string; name: string; address?: string }
type PickupSlot = { id: string; location_id: string; pickup_date: string; pickup_time: string; capacity_qty: number; booked_qty: number; status: string }

function genBookingNo() {
  const d = new Date()
  const y = String(d.getFullYear()).slice(2)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const rand = Math.floor(Math.random() * 9999).toString().padStart(4, '0')
  return `BK-${y}${m}${day}-${rand}`
}

export default function AdminSeedBooking() {
  const [farmers, setFarmers] = useState<PosFarmer[]>(MOCK_FARMERS)
  const [lots, setLots] = useState<PosLot[]>(MOCK_LOTS)
  const [cart, setCart] = useState<PosCartItem[]>([])
  const [bookings, setBookings] = useState<BookingRow[]>([])
  const [bookingItems, setBookingItems] = useState<BookingItemRow[]>([])
  const [assignBooking, setAssignBooking] = useState(null)
  const [pickupLocations, setPickupLocations] = useState<PickupLocation[]>([])
  const [pickupSlots, setPickupSlots] = useState<PickupSlot[]>([])
  const [selectedLocationId, setSelectedLocationId] = useState('')
  const [selectedSlotId, setSelectedSlotId] = useState('')
  const [selectedFarmerId, setSelectedFarmerId] = useState('')
  const [supplierFilter, setSupplierFilter] = useState('all')
  const [productSearch, setProductSearch] = useState('')
  const [historySearch, setHistorySearch] = useState('')
  const [bookingStartDate, setBookingStartDate] = useState('')
  const [bookingEndDate, setBookingEndDate] = useState('')
  const [bookingDate, setBookingDate] = useState(todayDate())
  const [receiveDate, setReceiveDate] = useState(addDaysDate(7))
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [ok, setOk] = useState('')
  const [error, setError] = useState('')

  const selectedFarmer = farmers.find((f) => f.id === selectedFarmerId)
  const selectedLocation = pickupLocations.find((p) => p.id === selectedLocationId)
  const filteredSlots = useMemo(() => pickupSlots.filter((s) => s.location_id === selectedLocationId), [pickupSlots, selectedLocationId])
  const selectedSlot = filteredSlots.find((s) => s.id === selectedSlotId)
  const total = calcCartTotal(cart)
  const totalQty = cart.reduce((sum, item) => sum + Number(item.qty || 0), 0)
  const debt = total

  const loadMembers = async (): Promise<PosFarmer[]> => {
    if (!supabase) return MOCK_FARMERS
    const [farmerRes, profileRes] = await Promise.all([
      supabase.from('farmers').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id,full_name,phone,id_card,role'),
    ])
    if (farmerRes.error) throw new Error(`โหลด farmers ไม่สำเร็จ: ${farmerRes.error.message}`)
    if (profileRes.error) throw new Error(`โหลด profiles ไม่สำเร็จ: ${profileRes.error.message}`)
    const profileMap = new Map((profileRes.data ?? []).map((p: any) => [String(p.id), p]))
    return (farmerRes.data ?? []).filter((f: any) => ['approved', 'active', 'farmer', 'member'].includes(String(f.status ?? 'approved'))).map((f: any) => {
      const p = profileMap.get(String(f.profile_id ?? ''))
      return { id: String(f.id), profileId: f.profile_id ? String(f.profile_id) : undefined, name: String(f.full_name ?? p?.full_name ?? f.name ?? '-'), phone: String(f.phone ?? p?.phone ?? ''), idCard: String(f.id_card ?? p?.id_card ?? ''), district: String(f.district ?? ''), village: String(f.village ?? '') }
    })
  }

  const load = async () => {
    setLoading(true); setError('')
    try {
      if (!isSupabaseReady || !supabase) {
        setFarmers(MOCK_FARMERS); setLots(MOCK_LOTS); setBookings([]); setBookingItems([])
        setPickupLocations([{ id: 'mock-pickup-1', name: 'โรงงานหลัก', address: 'สำโรง' }])
        setPickupSlots([{ id: 'mock-slot-1', location_id: 'mock-pickup-1', pickup_date: addDaysDate(7), pickup_time: '09:00-12:00', capacity_qty: 500, booked_qty: 0, status: 'open' }])
        return
      }
      const memberRows = await loadMembers()
      const [varietyRes, supplierRes, bookingRes, itemRes, locationRes, slotRes] = await Promise.all([
        supabase.from('seed_varieties').select('id,variety_name,supplier_id,sell_price_per_bag,price,status').neq('status', 'inactive').order('variety_name'),
        supabase.from('seed_suppliers').select('id,supplier_name,status').neq('status', 'inactive').order('supplier_name'),
        supabase.from('seed_bookings').select('*').order('booking_date', { ascending: false }).limit(200),
        supabase.from('seed_booking_items').select('id,booking_id,variety_name,quantity,sell_price_per_bag,total_amount'),
        supabase.from('pickup_locations').select('id,name,address,active').eq('active', true).order('name'),
        supabase.from('pickup_slots').select('id,location_id,pickup_date,pickup_time,capacity_qty,booked_qty,status').order('pickup_date', { ascending: true }),
      ])
      if (varietyRes.error) throw new Error(varietyRes.error.message)
      if (supplierRes.error) throw new Error(supplierRes.error.message)
      if (bookingRes.error) throw new Error(bookingRes.error.message)
      if (itemRes.error) throw new Error(itemRes.error.message)
      if (locationRes.error) throw new Error(locationRes.error.message)
      if (slotRes.error) throw new Error(slotRes.error.message)
      const supplierMap = new Map((supplierRes.data ?? []).map((s: any) => [String(s.id), String(s.supplier_name ?? '-')]))
      setFarmers(memberRows)
      setPickupLocations((locationRes.data ?? []).map((r: any) => ({ id: String(r.id), name: String(r.name ?? '-'), address: String(r.address ?? '') })))
      setPickupSlots((slotRes.data ?? []).map((r: any) => ({ id: String(r.id), location_id: String(r.location_id ?? ''), pickup_date: String(r.pickup_date ?? ''), pickup_time: String(r.pickup_time ?? ''), capacity_qty: Number(r.capacity_qty ?? 0), booked_qty: Number(r.booked_qty ?? 0), status: String(r.status ?? 'open') })))
      setLots((varietyRes.data ?? []).map((v: any) => { const supplierId = String(v.supplier_id ?? ''); const price = Number(v?.sell_price_per_bag ?? 0) || Number(v?.price ?? 0); return { id: String(v.id), supplierId, supplierName: supplierMap.get(supplierId) ?? '-', varietyId: String(v.id), varietyName: String(v.variety_name ?? '-'), lotNo: '', balance: 0, price } }))
      setBookings((bookingRes.data ?? []).map((r: any) => ({ id: String(r.id), booking_no: String(r.booking_no ?? ''), booking_date: String(r.booking_date ?? ''), receive_date: String(r.receive_date ?? r.pickup_date ?? ''), farmer_id: String(r.farmer_id ?? ''), farmer_name: String(r.farmer_name ?? '-'), farmer_phone: String(r.farmer_phone ?? ''), total_amount: Number(r.total_amount ?? 0), deposit_amount: Number(r.deposit_amount ?? 0), status: String(r.status ?? 'pending'), note: String(r.note ?? '') })))
      setBookingItems((itemRes.data ?? []).map((r: any) => ({ id: String(r.id), booking_id: String(r.booking_id ?? ''), variety_name: String(r.variety_name ?? '-'), quantity: Number(r.quantity ?? 0), sell_price_per_bag: Number(r.sell_price_per_bag ?? 0), total_amount: Number(r.total_amount ?? 0) })))
    } catch (e) { setError(e instanceof Error ? e.message : 'โหลดข้อมูลไม่สำเร็จ') } finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])
  useEffect(() => { if (filteredSlots.length === 0) { setSelectedSlotId(''); return }; if (!filteredSlots.some((s) => s.id === selectedSlotId)) setSelectedSlotId(filteredSlots[0].id) }, [filteredSlots, selectedSlotId])
  useEffect(() => { if (selectedSlot?.pickup_date) setReceiveDate(selectedSlot.pickup_date) }, [selectedSlot])

  const suppliers = useMemo(() => Array.from(new Map(lots.map((l) => [l.supplierId || '-', l.supplierName || '-'])).entries()).map(([id, name]) => ({ id, name })), [lots])
  const filteredLots = useMemo(() => { const kw = productSearch.trim().toLowerCase(); return lots.filter((l) => (supplierFilter === 'all' || (l.supplierId || '-') === supplierFilter) && (!kw || `${l.varietyName} ${l.supplierName}`.toLowerCase().includes(kw))) }, [lots, supplierFilter, productSearch])
  const filteredBookings = useMemo(() => { const kw = historySearch.trim().toLowerCase(); if (!kw) return bookings; return bookings.filter((b) => `${b.booking_no} ${b.farmer_name} ${b.farmer_phone} ${b.status} ${b.note ?? ''}`.toLowerCase().includes(kw)) }, [bookings, historySearch])
  const summaryBookings = useMemo(() => filteredBookings.filter((b) => (!bookingStartDate || b.booking_date >= bookingStartDate) && (!bookingEndDate || b.booking_date <= bookingEndDate)), [filteredBookings, bookingStartDate, bookingEndDate])
  const summaryBookingIds = useMemo(() => new Set(summaryBookings.map((b) => b.id)), [summaryBookings])
  const summaryItems = useMemo(() => bookingItems.filter((it) => summaryBookingIds.has(it.booking_id)), [bookingItems, summaryBookingIds])
  const summaryByStatus = useMemo(() => { const rows = new Map<string, { status: string; count: number; total: number }>(); summaryBookings.forEach((b) => { const key = b.status || 'pending'; const prev = rows.get(key) ?? { status: key, count: 0, total: 0 }; rows.set(key, { ...prev, count: prev.count + 1, total: prev.total + Number(b.total_amount || 0) }) }); return Array.from(rows.values()) }, [summaryBookings])

  const clearBooking = () => { setCart([]); setSelectedFarmerId(''); setNote(''); setReceiveDate(addDaysDate(7)); setError('') }
  const submitBooking = async () => { setSaving(true); setError(''); setOk(''); try { if (!selectedFarmer) throw new Error('กรุณาเลือกสมาชิก'); if (cart.length === 0) throw new Error('กรุณาเลือกสินค้า'); if (!selectedLocation) throw new Error('กรุณาเลือกจุดรับสินค้า'); if (!selectedSlot) throw new Error('กรุณาเลือกรอบรับสินค้า'); const bookingNo = genBookingNo(); if (!isSupabaseReady || !supabase) { setBookings((prev) => [{ id: `mock-${Date.now()}`, booking_no: bookingNo, booking_date: bookingDate, receive_date: receiveDate, farmer_id: selectedFarmer.id, farmer_name: selectedFarmer.name, farmer_phone: selectedFarmer.phone, total_amount: total, deposit_amount: 0, status: 'pending', note }, ...prev]); clearBooking(); setOk(`สร้างใบจอง ${bookingNo} แล้ว`); return } const { data: booking, error: bookingErr } = await supabase.from('seed_bookings').insert({ booking_no: bookingNo, booking_date: bookingDate, receive_date: receiveDate, farmer_id: selectedFarmer.id, farmer_name: selectedFarmer.name, farmer_phone: selectedFarmer.phone, total_amount: total, deposit_amount: 0, balance_amount: debt, status: 'pending', payment_status: 'unpaid', pickup_location_id: selectedLocation.id, pickup_slot_id: selectedSlot.id, pickup_location_name: selectedLocation.name, pickup_date: selectedSlot.pickup_date, pickup_time: selectedSlot.pickup_time, note }).select('id').single(); if (bookingErr) throw new Error(bookingErr.message); const items = cart.map((item) => ({ booking_id: booking.id, lot_id: null, lot_no: null, variety_id: item.varietyId, variety_name: item.varietyName, quantity: item.qty, sell_price_per_bag: item.price, total_amount: item.qty * item.price, reserved_quantity: 0, status: 'pending' })); const { error: itemErr } = await supabase.from('seed_booking_items').insert(items); if (itemErr) throw new Error(itemErr.message); const nextBookedQty = Number(selectedSlot.booked_qty || 0) + totalQty; const { error: slotErr } = await supabase.from('pickup_slots').update({ booked_qty: nextBookedQty, status: nextBookedQty >= Number(selectedSlot.capacity_qty || 0) ? 'full' : selectedSlot.status }).eq('id', selectedSlot.id); if (slotErr) throw new Error(slotErr.message); await load(); clearBooking(); setOk(`สร้างใบจอง ${bookingNo} แล้ว`) } catch (e) { setError(e instanceof Error ? e.message : 'จองไม่สำเร็จ') } finally { setSaving(false) } }
  const convertToPOS = async (booking: BookingRow) => { setSaving(true); setError(''); try { if (!isSupabaseReady || !supabase) throw new Error('ต้องเชื่อม Supabase ก่อนแปลงเป็นขาย'); const { data, error: itemErr } = await supabase.from('seed_booking_items').select('*').eq('booking_id', booking.id); if (itemErr) throw new Error(itemErr.message); const items = (data ?? []).map((item: any) => ({ id: String(item.lot_id ?? item.variety_id ?? ''), supplierName: '', varietyId: String(item.variety_id ?? ''), varietyName: String(item.variety_name ?? '-'), lotNo: String(item.lot_no ?? ''), balance: Number(item.quantity_balance ?? 0), price: Number(item.sell_price_per_bag ?? 0), qty: Number(item.quantity ?? 0) })); if (items.length === 0) throw new Error('ไม่พบรายการสินค้าในใบจอง'); const { error: updateErr } = await supabase.from('seed_bookings').update({ status: 'converted' }).eq('id', booking.id).neq('status', 'converted'); if (updateErr) throw new Error(updateErr.message); window.localStorage.setItem('seed_booking_to_pos', JSON.stringify({ bookingId: booking.id, bookingNo: booking.booking_no, farmerId: booking.farmer_id, farmerName: booking.farmer_name, farmerPhone: booking.farmer_phone, depositAmount: booking.deposit_amount, items })); window.location.href = '/admin/seed-invoice' } catch (e) { setError(e instanceof Error ? e.message : 'แปลงเป็นขายไม่สำเร็จ') } finally { setSaving(false) } }

  return <div className="space-y-5"><div className="flex items-center justify-between flex-wrap gap-3"><div><h1 className="text-xl font-bold text-gray-900">POS จองเมล็ดพันธุ์</h1><div className="flex items-center gap-1.5 mt-0.5 text-sm">{isSupabaseReady ? <><Wifi className="w-3.5 h-3.5 text-emerald-600" /><span className="text-emerald-600">Booking + Cart</span></> : <><WifiOff className="w-3.5 h-3.5 text-amber-500" /><span className="text-amber-600">Mock data</span></>}</div></div><button onClick={() => void load()} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm"><RefreshCw className="w-4 h-4" />รีโหลด</button></div>{ok && <div className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 text-sm flex gap-2"><Check className="w-4 h-4" />{ok}</div>}{error && <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm flex gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}<div className="grid grid-cols-1 xl:grid-cols-3 gap-5"><div className="xl:col-span-2"><SeedPOSProductGrid lots={filteredLots} suppliers={suppliers} supplierFilter={supplierFilter} productSearch={productSearch} onSupplierFilterChange={setSupplierFilter} onProductSearchChange={setProductSearch} onAddToCart={(lot) => setCart((prev) => addLotToCart(prev, lot))} /></div><AdminSeedBookingCart cart={cart} farmers={farmers} selectedFarmerId={selectedFarmerId} selectedLocationId={selectedLocationId} selectedSlotId={selectedSlotId} pickupLocations={pickupLocations} pickupSlots={pickupSlots} bookingDate={bookingDate} receiveDate={receiveDate} note={note} saving={saving} total={total} debt={debt} onCartChange={setCart} onFarmerChange={setSelectedFarmerId} onLocationChange={setSelectedLocationId} onSlotChange={setSelectedSlotId} onBookingDateChange={setBookingDate} onReceiveDateChange={setReceiveDate} onNoteChange={setNote} onClear={clearBooking} onSubmit={submitBooking} /></div><SeedBookingSummary bookings={summaryBookings} items={summaryItems} startDate={bookingStartDate} endDate={bookingEndDate} onStartDateChange={setBookingStartDate} onEndDateChange={setBookingEndDate} /><div className="bg-white rounded-2xl border p-4 space-y-3"><div className="flex items-center justify-between gap-3 flex-wrap"><div className="font-bold">สรุปประวัติจอง</div><div className="relative w-full md:w-96"><Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" /><input value={historySearch} onChange={(e) => setHistorySearch(e.target.value)} placeholder="ค้นหาชื่อสมาชิก / เบอร์ / เลขจอง / สถานะ" className="w-full border rounded-xl pl-9 pr-3 py-2" /></div></div>{summaryByStatus.length > 0 && <div className="flex flex-wrap gap-2 text-xs">{summaryByStatus.map((s) => <span key={s.status} className="px-3 py-1 rounded-full bg-gray-100 text-gray-700">{s.status}: {s.count} ใบ / {fmtMoney(s.total)}</span>)}</div>}</div><div className="bg-white rounded-2xl border overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-gray-50 text-xs text-gray-500"><th className="text-left p-3">เลขจอง</th><th className="text-left p-3">วันที่จอง</th><th className="text-left p-3">นัดรับ</th><th className="text-left p-3">สมาชิก</th><th className="text-right p-3">ยอดจอง</th><th className="text-right p-3">มัดจำ</th><th className="text-right p-3">ค้าง</th><th className="text-center p-3">สถานะ</th><th className="text-left p-3">หมายเหตุ</th><th className="text-center p-3">จัดการ</th></tr></thead><tbody>{loading ? <tr><td colSpan={10} className="p-6 text-center text-gray-400">กำลังโหลด...</td></tr> : filteredBookings.length === 0 ? <tr><td colSpan={10} className="p-6 text-center text-gray-400">ยังไม่มีรายการจอง</td></tr> : filteredBookings.map((b) => <tr key={b.id} className="border-t"><td className="p-3 font-mono">{b.booking_no}</td><td className="p-3">{b.booking_date}</td><td className="p-3">{b.receive_date}</td><td className="p-3"><div>{b.farmer_name}</div><div className="text-xs text-gray-400">{b.farmer_phone}</div></td><td className="p-3 text-right">{fmtMoney(b.total_amount)}</td><td className="p-3 text-right text-emerald-600">{fmtMoney(b.deposit_amount)}</td><td className="p-3 text-right text-red-600">{fmtMoney(Math.max(Number(b.total_amount || 0) - Number(b.deposit_amount || 0), 0))}</td><td className="p-3 text-center">{b.status}</td><td className="p-3">{b.note || '-'}</td><td className="p-3 text-center"><button type="button" disabled={saving || b.status === 'converted'} onClick={() => void convertToPOS(b)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold disabled:bg-gray-300"><ShoppingCart className="w-3 h-3" />แปลงเป็นขาย</button></td></tr>)}</tbody></table></div></div>
}
