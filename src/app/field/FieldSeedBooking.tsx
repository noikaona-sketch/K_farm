import React, { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, CalendarCheck, History, Minus, Package, Plus, RefreshCw, Search, ShoppingCart } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../routes/AuthContext'
import { isSupabaseReady, supabase } from '../../lib/supabase'

type FieldFarmer = { id: string; name: string; phone: string; idCard?: string; district?: string; village?: string }
type SeedItem = { id: string; varietyId: string; name: string; supplier: string; price: number }
type PickupLocation = { id: string; name: string; address?: string }
type PickupSlot = { id: string; location_id: string; pickup_date: string; pickup_time: string; capacity_qty: number; booked_qty: number; status: string }
type CartItem = SeedItem & { qty: number }
const money = (n: number) => Number(n || 0).toLocaleString('th-TH')
const today = () => new Date().toISOString().slice(0, 10)
const genBookingNo = () => `FB-${Date.now().toString().slice(-8)}`

export default function FieldSeedBooking() {
  const nav = useNavigate()
  const { user } = useAuth()
  const [farmers, setFarmers] = useState<FieldFarmer[]>([])
  const [farmerSearch, setFarmerSearch] = useState('')
  const [selectedFarmerId, setSelectedFarmerId] = useState('')
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

  const selectedFarmer = farmers.find((f) => f.id === selectedFarmerId)
  const selectedLocation = locations.find((x) => x.id === locationId)
  const availableSlots = useMemo(() => slots.filter((s) => s.location_id === locationId), [slots, locationId])
  const selectedSlot = availableSlots.find((s) => s.id === slotId)
  const total = cart.reduce((sum, x) => sum + x.qty * x.price, 0)
  const totalQty = cart.reduce((sum, x) => sum + x.qty, 0)
  const filteredFarmers = useMemo(() => { const kw = farmerSearch.trim().toLowerCase(); if (!kw) return farmers.slice(0, 20); return farmers.filter((f) => `${f.name} ${f.phone} ${f.idCard ?? ''} ${f.district ?? ''} ${f.village ?? ''}`.toLowerCase().includes(kw)).slice(0, 30) }, [farmers, farmerSearch])
  const groupedItems = useMemo(() => { const groups = new Map<string, SeedItem[]>(); items.forEach((item) => groups.set(item.supplier || '-', [...(groups.get(item.supplier || '-') ?? []), item])); return Array.from(groups.entries()).map(([supplier, rows]) => ({ supplier, rows })) }, [items])

  const load = async () => {
    setLoading(true); setError('')
    try {
      if (!isSupabaseReady || !supabase) return
      const [farmerRes, profileRes, varietyRes, supplierRes, locRes, slotRes] = await Promise.all([
        supabase.from('farmers').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('id,full_name,phone,id_card,role'),
        supabase.from('seed_varieties').select('id,variety_name,supplier_id,sell_price_per_bag,price,status').neq('status', 'inactive').order('variety_name'),
        supabase.from('seed_suppliers').select('id,supplier_name,status').neq('status', 'inactive').order('supplier_name'),
        supabase.from('pickup_locations').select('id,name,address,active').eq('active', true).order('name'),
        supabase.from('pickup_slots').select('id,location_id,pickup_date,pickup_time,capacity_qty,booked_qty,status').order('pickup_date', { ascending: true }),
      ])
      if (farmerRes.error) throw new Error(farmerRes.error.message)
      if (profileRes.error) throw new Error(profileRes.error.message)
      if (varietyRes.error) throw new Error(varietyRes.error.message)
      if (supplierRes.error) throw new Error(supplierRes.error.message)
      if (locRes.error) throw new Error(locRes.error.message)
      if (slotRes.error) throw new Error(slotRes.error.message)
      const profileMap = new Map((profileRes.data ?? []).map((p: any) => [String(p.id), p]))
      setFarmers((farmerRes.data ?? []).filter((f: any) => ['approved', 'active', 'farmer', 'member'].includes(String(f.status ?? 'approved'))).map((f: any) => { const p = profileMap.get(String(f.profile_id ?? '')); return { id: String(f.id), name: String(f.full_name ?? p?.full_name ?? f.name ?? '-'), phone: String(f.phone ?? p?.phone ?? ''), idCard: String(f.id_card ?? p?.id_card ?? ''), district: String(f.district ?? ''), village: String(f.village ?? '') } }))
      const supplierMap = new Map((supplierRes.data ?? []).map((s: any) => [String(s.id), String(s.supplier_name ?? '-')]))
      setItems((varietyRes.data ?? []).map((v: any) => { const price = Number(v?.sell_price_per_bag ?? 0) || Number(v?.price ?? 0); return { id: String(v.id), varietyId: String(v.id), name: String(v.variety_name ?? '-'), supplier: supplierMap.get(String(v.supplier_id ?? '')) ?? '-', price } }))
      setLocations((locRes.data ?? []).map((r: any) => ({ id: String(r.id), name: String(r.name ?? '-'), address: String(r.address ?? '') })))
      setSlots((slotRes.data ?? []).map((r: any) => ({ id: String(r.id), location_id: String(r.location_id ?? ''), pickup_date: String(r.pickup_date ?? ''), pickup_time: String(r.pickup_time ?? ''), capacity_qty: Number(r.capacity_qty ?? 0), booked_qty: Number(r.booked_qty ?? 0), status: String(r.status ?? 'open') })))
    } catch (e) { setError(e instanceof Error ? e.message : 'โหลดข้อมูลไม่สำเร็จ') } finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])
  useEffect(() => { if (availableSlots.length > 0 && !availableSlots.some((s) => s.id === slotId)) setSlotId(availableSlots[0].id) }, [availableSlots, slotId])

  const add = (item: SeedItem) => setCart((prev) => { const old = prev.find((x) => x.id === item.id); return old ? prev.map((x) => x.id === item.id ? { ...x, qty: x.qty + 1 } : x) : [...prev, { ...item, qty: 1 }] })
  const setQty = (id: string, qty: number) => setCart((prev) => prev.map((x) => x.id === id ? { ...x, qty: Math.max(1, qty) } : x))
  const remove = (id: string) => setCart((prev) => prev.filter((x) => x.id !== id))

  const submit = async () => {
    setSaving(true); setError(''); setOk('')
    try {
      if (!supabase) throw new Error('ยังไม่เชื่อมฐานข้อมูล')
      if (!selectedFarmer) throw new Error('กรุณาเลือกสมาชิก')
      if (cart.length === 0) throw new Error('กรุณาเลือกเมล็ดพันธุ์')
      if (!selectedLocation) throw new Error('กรุณาเลือกจุดรับสินค้า')
      if (!selectedSlot) throw new Error('กรุณาเลือกรอบรับสินค้า')
      const bookingNo = genBookingNo()
      const { data: booking, error: bErr } = await supabase.from('seed_bookings').insert({ booking_no: bookingNo, booking_date: today(), receive_date: selectedSlot.pickup_date, farmer_id: selectedFarmer.id, farmer_name: selectedFarmer.name, farmer_phone: selectedFarmer.phone, total_amount: total, deposit_amount: 0, balance_amount: total, status: 'pending', payment_status: 'unpaid', pickup_location_id: selectedLocation.id, pickup_slot_id: selectedSlot.id, pickup_location_name: selectedLocation.name, pickup_date: selectedSlot.pickup_date, pickup_time: selectedSlot.pickup_time, note, created_by: user?.id ?? '', created_by_name: user?.name ?? 'ทีมภาคสนาม', booking_source: 'field' }).select('id').single()
      if (bErr) throw new Error(bErr.message)
      const rows = cart.map((x) => ({ booking_id: booking.id, lot_id: null, lot_no: null, variety_id: x.varietyId, variety_name: x.name, quantity: x.qty, sell_price_per_bag: x.price, total_amount: x.qty * x.price, reserved_quantity: 0, status: 'pending' }))
      const { error: iErr } = await supabase.from('seed_booking_items').insert(rows)
      if (iErr) throw new Error(iErr.message)
      const nextBooked = Number(selectedSlot.booked_qty || 0) + totalQty
      await supabase.from('pickup_slots').update({ booked_qty: nextBooked, status: nextBooked >= Number(selectedSlot.capacity_qty || 0) ? 'full' : selectedSlot.status }).eq('id', selectedSlot.id)
      setCart([]); setNote(''); setOk(`จองสำเร็จ เลขที่ ${bookingNo}`); await load()
    } catch (e) { setError(e instanceof Error ? e.message : 'จองไม่สำเร็จ') } finally { setSaving(false) }
  }

  return <div className="min-h-screen bg-gray-50 p-4 space-y-4"><div className="flex items-center justify-between"><button onClick={() => nav('/farmer')} className="bg-white border rounded-xl p-2"><ArrowLeft className="w-5 h-5" /></button><button onClick={() => void load()} className="bg-white border rounded-xl p-2"><RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} /></button></div><div className="bg-emerald-600 text-white rounded-3xl p-5 shadow-lg"><div className="flex items-center gap-3"><Package className="w-8 h-8" /><div><h1 className="text-xl font-bold">จองเมล็ดพันธุ์</h1><p className="text-sm text-emerald-100">สำหรับทีมภาคสนาม</p></div></div></div>{ok && <div className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 text-sm">{ok}</div>}{error && <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 p-3 text-sm">{error}</div>}<div className="bg-white rounded-2xl border p-4 space-y-3"><div className="font-bold flex gap-2"><Search className="w-5 h-5" />เลือกสมาชิก</div><input value={farmerSearch} onChange={(e) => setFarmerSearch(e.target.value)} placeholder="ค้นหาชื่อ / เบอร์ / เลขบัตร" className="w-full border rounded-xl p-3" />{farmerSearch && <div className="max-h-52 overflow-y-auto border rounded-xl divide-y">{filteredFarmers.map((f) => <button key={f.id} onClick={() => { setSelectedFarmerId(f.id); setFarmerSearch(f.name) }} className={`w-full text-left p-3 ${selectedFarmerId === f.id ? 'bg-emerald-50' : 'bg-white'}`}><div className="font-semibold">{f.name}</div><div className="text-xs text-gray-500">{f.phone} | {f.idCard || '-'} | {f.district || '-'}</div></button>)}</div>}{selectedFarmer && <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-sm text-emerald-800">จองให้: <b>{selectedFarmer.name}</b> {selectedFarmer.phone}</div>}</div>{loading ? <div className="text-center text-gray-400 py-8">กำลังโหลด...</div> : <div className="space-y-4">{groupedItems.map((group) => <div key={group.supplier} className="space-y-2"><div className="font-bold text-sm text-gray-700 px-1">Supplier: {group.supplier}</div>{group.rows.map((x) => <div key={x.id} className="bg-white rounded-2xl border p-4"><div className="flex justify-between gap-3 items-start"><div className="min-w-0"><div className="font-bold text-gray-900">{x.name}</div></div><div className="flex items-center gap-3"><div className="text-right"><div className="font-bold text-emerald-700">{money(x.price)}</div><div className="text-xs text-gray-400">บาท/ถุง</div></div><button onClick={() => add(x)} className="rounded-full bg-emerald-600 text-white p-2 shadow-sm"><Plus className="w-5 h-5" /></button></div></div></div>)}</div>)}</div>}<div className="bg-white rounded-2xl border p-4 space-y-3"><div className="font-bold flex gap-2"><ShoppingCart className="w-5 h-5" />ตะกร้าจอง</div>{cart.length === 0 ? <div className="text-center text-gray-400 py-4">ยังไม่มีสินค้า</div> : cart.map((x) => <div key={x.id} className="border rounded-xl p-3"><div className="font-semibold">{x.name}</div><div className="text-xs text-gray-500">{money(x.price)} บาท/ถุง</div><div className="flex items-center justify-between mt-2"><div className="flex items-center gap-2"><button onClick={() => x.qty <= 1 ? remove(x.id) : setQty(x.id, x.qty - 1)} className="border rounded-lg p-1"><Minus className="w-4 h-4" /></button><span className="font-bold w-8 text-center">{x.qty}</span><button onClick={() => setQty(x.id, x.qty + 1)} className="border rounded-lg p-1"><Plus className="w-4 h-4" /></button></div><b>{money(x.qty * x.price)} บาท</b></div></div>)}<div className="border-t pt-3 space-y-2"><select value={locationId} onChange={(e) => { setLocationId(e.target.value); setSlotId('') }} className="w-full border rounded-xl p-3 bg-white"><option value="">เลือกจุดรับสินค้า</option>{locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select>{selectedLocation?.address && <div className="text-xs text-gray-500">{selectedLocation.address}</div>}<select value={slotId} onChange={(e) => setSlotId(e.target.value)} disabled={!locationId || availableSlots.length === 0} className="w-full border rounded-xl p-3 bg-white"><option value="">{locationId && availableSlots.length === 0 ? 'ยังไม่มีรอบรับของจุดนี้' : 'เลือกรอบรับ'}</option>{availableSlots.map((s) => <option key={s.id} value={s.id}>{s.pickup_date} {s.pickup_time} | เหลือ {money(Number(s.capacity_qty || 0) - Number(s.booked_qty || 0))}</option>)}</select><textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="หมายเหตุ" className="w-full border rounded-xl p-3" /><div className="flex justify-between text-lg"><span>รวม</span><b>{money(total)} บาท</b></div><button disabled={saving || cart.length === 0} onClick={submit} className="w-full rounded-xl bg-emerald-600 disabled:bg-gray-300 text-white py-3 font-bold flex justify-center gap-2"><CalendarCheck className="w-5 h-5" />{saving ? 'กำลังจอง...' : 'ยืนยันจอง'}</button></div></div></div>
}
