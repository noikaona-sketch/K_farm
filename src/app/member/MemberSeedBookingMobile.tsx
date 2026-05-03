import React, { useEffect, useMemo, useState } from 'react'
import { AlertCircle, CalendarDays, Check, MapPin, Package, Plus, Minus, ShoppingBag } from 'lucide-react'
import { isSupabaseReady, supabase } from '../../lib/supabase'
import { fmtMoney, todayDate } from '../admin/seedPosTypes'

type SeedVariety = {
  id: string
  supplierId?: string
  name: string
  supplierName?: string
  price: number
  cropDays?: number
  highlight?: string
  active?: boolean
}

type BookingItem = SeedVariety & {
  qty: number
}

type PickupLocation = {
  id: string
  name: string
  address?: string
}

type PickupSlot = {
  id: string
  location_id: string
  pickup_date: string
  pickup_time: string
  capacity_qty: number
  booked_qty: number
  status: string
}

const MOCK_VARIETIES: SeedVariety[] = [
  { id: 'mock-v1', name: 'ข้าวโพด A', supplierName: 'Supplier A', price: 850, cropDays: 110, highlight: 'ทนแล้ง ผลผลิตดี' },
  { id: 'mock-v2', name: 'ข้าวโพด B', supplierName: 'Supplier B', price: 900, cropDays: 115, highlight: 'เมล็ดใหญ่ แข็งแรง' },
]

const MOCK_LOCATIONS: PickupLocation[] = [
  { id: 'mock-loc-1', name: 'โรงงานหลัก', address: 'สำโรง อุบลราชธานี' },
]

const MOCK_SLOTS: PickupSlot[] = [
  { id: 'mock-slot-1', location_id: 'mock-loc-1', pickup_date: '2026-05-10', pickup_time: '09:00-12:00', capacity_qty: 500, booked_qty: 100, status: 'open' },
]

function genBookingNo() {
  const d = new Date()
  const y = String(d.getFullYear()).slice(2)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const rand = Math.floor(Math.random() * 9999).toString().padStart(4, '0')
  return `MBK-${y}${m}${day}-${rand}`
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

export default function MemberSeedBookingMobile() {
  const [varieties, setVarieties] = useState<SeedVariety[]>(MOCK_VARIETIES)
  const [cart, setCart] = useState<BookingItem[]>([])
  const [locations, setLocations] = useState<PickupLocation[]>(MOCK_LOCATIONS)
  const [slots, setSlots] = useState<PickupSlot[]>(MOCK_SLOTS)
  const [selectedLocationId, setSelectedLocationId] = useState('')
  const [selectedSlotId, setSelectedSlotId] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [ok, setOk] = useState('')
  const [error, setError] = useState('')

  const member = typeof window !== 'undefined' ? getMemberProfile() : null
  const selectedLocation = locations.find((l) => l.id === selectedLocationId)
  const filteredSlots = useMemo(() => slots.filter((s) => s.location_id === selectedLocationId && s.status === 'open'), [slots, selectedLocationId])
  const selectedSlot = filteredSlots.find((s) => s.id === selectedSlotId)
  const totalQty = cart.reduce((sum, item) => sum + Number(item.qty || 0), 0)
  const totalAmount = cart.reduce((sum, item) => sum + Number(item.qty || 0) * Number(item.price || 0), 0)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      if (!isSupabaseReady || !supabase) {
        setVarieties(MOCK_VARIETIES)
        setLocations(MOCK_LOCATIONS)
        setSlots(MOCK_SLOTS)
        return
      }

      const [varietyRes, supplierRes, locationRes, slotRes] = await Promise.all([
        supabase.from('seed_varieties').select('id,variety_name,supplier_id,sell_price_per_bag,sell_price,price,crop_days,highlight,status').neq('status', 'inactive').order('variety_name'),
        supabase.from('seed_suppliers').select('id,supplier_name'),
        supabase.from('pickup_locations').select('id,name,address,active').eq('active', true).order('name'),
        supabase.from('pickup_slots').select('id,location_id,pickup_date,pickup_time,capacity_qty,booked_qty,status').eq('status', 'open').order('pickup_date', { ascending: true }),
      ])
      if (varietyRes.error) throw new Error(varietyRes.error.message)
      if (locationRes.error) throw new Error(locationRes.error.message)
      if (slotRes.error) throw new Error(slotRes.error.message)

      const supplierMap = new Map((supplierRes.data ?? []).map((s: any) => [String(s.id), String(s.supplier_name ?? '')]))
      setVarieties((varietyRes.data ?? []).map((v: any) => ({
        id: String(v.id),
        supplierId: String(v.supplier_id ?? ''),
        name: String(v.variety_name ?? '-'),
        supplierName: supplierMap.get(String(v.supplier_id ?? '')) ?? '',
        price: Number(v.sell_price_per_bag ?? v.sell_price ?? v.price ?? 0),
        cropDays: Number(v.crop_days ?? 0),
        highlight: String(v.highlight ?? ''),
      })))
      setLocations((locationRes.data ?? []).map((r: any) => ({ id: String(r.id), name: String(r.name ?? '-'), address: String(r.address ?? '') })))
      setSlots((slotRes.data ?? []).map((r: any) => ({ id: String(r.id), location_id: String(r.location_id ?? ''), pickup_date: String(r.pickup_date ?? ''), pickup_time: String(r.pickup_time ?? ''), capacity_qty: Number(r.capacity_qty ?? 0), booked_qty: Number(r.booked_qty ?? 0), status: String(r.status ?? 'open') })))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดข้อมูลไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  useEffect(() => {
    if (locations.length > 0 && !selectedLocationId) setSelectedLocationId(locations[0].id)
  }, [locations, selectedLocationId])

  useEffect(() => {
    if (filteredSlots.length === 0) {
      setSelectedSlotId('')
      return
    }
    if (!filteredSlots.some((s) => s.id === selectedSlotId)) setSelectedSlotId(filteredSlots[0].id)
  }, [filteredSlots, selectedSlotId])

  const changeQty = (variety: SeedVariety, delta: number) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === variety.id)
      if (!existing && delta > 0) return [...prev, { ...variety, qty: 1 }]
      if (!existing) return prev
      const nextQty = Math.max(existing.qty + delta, 0)
      if (nextQty === 0) return prev.filter((item) => item.id !== variety.id)
      return prev.map((item) => item.id === variety.id ? { ...item, qty: nextQty } : item)
    })
  }

  const setQty = (variety: SeedVariety, qty: number) => {
    const safeQty = Math.max(Number(qty || 0), 0)
    setCart((prev) => {
      const existing = prev.find((item) => item.id === variety.id)
      if (!existing && safeQty > 0) return [...prev, { ...variety, qty: safeQty }]
      if (!existing) return prev
      if (safeQty === 0) return prev.filter((item) => item.id !== variety.id)
      return prev.map((item) => item.id === variety.id ? { ...item, qty: safeQty } : item)
    })
  }

  const submitBooking = async () => {
    setSaving(true)
    setError('')
    setOk('')
    try {
      if (cart.length === 0) throw new Error('กรุณาเลือกเมล็ดพันธุ์')
      if (!selectedLocation) throw new Error('กรุณาเลือกจุดรับสินค้า')
      if (!selectedSlot) throw new Error('กรุณาเลือกรอบรับสินค้า')
      const remain = Number(selectedSlot.capacity_qty || 0) - Number(selectedSlot.booked_qty || 0)
      if (totalQty > remain) throw new Error(`รอบนี้เหลือรับได้ ${fmtMoney(remain)} ถุง`)

      const bookingNo = genBookingNo()
      const farmerId = String(member?.farmer_id ?? member?.id ?? '')
      const farmerName = String(member?.name ?? member?.full_name ?? 'สมาชิกออนไลน์')
      const farmerPhone = String(member?.phone ?? '')

      if (!isSupabaseReady || !supabase) {
        setOk(`จองสำเร็จ เลขที่ ${bookingNo}`)
        setCart([])
        return
      }

      const { data: booking, error: bookingErr } = await supabase.from('seed_bookings').insert({
        booking_no: bookingNo,
        booking_date: todayDate(),
        receive_date: selectedSlot.pickup_date,
        farmer_id: farmerId || null,
        farmer_name: farmerName,
        farmer_phone: farmerPhone,
        total_amount: totalAmount,
        deposit_amount: 0,
        balance_amount: totalAmount,
        status: 'pending',
        payment_status: 'unpaid',
        pickup_location_id: selectedLocation.id,
        pickup_slot_id: selectedSlot.id,
        pickup_location_name: selectedLocation.name,
        pickup_date: selectedSlot.pickup_date,
        pickup_time: selectedSlot.pickup_time,
        note,
        source: 'member_mobile',
      }).select('id').single()
      if (bookingErr) throw new Error(bookingErr.message)

      const items = cart.map((item) => ({
        booking_id: booking.id,
        lot_id: null,
        lot_no: '',
        variety_id: item.id,
        variety_name: item.name,
        quantity: item.qty,
        sell_price_per_bag: item.price,
        total_amount: item.qty * item.price,
        reserved_quantity: 0,
        status: 'pending',
      }))
      const { error: itemErr } = await supabase.from('seed_booking_items').insert(items)
      if (itemErr) throw new Error(itemErr.message)

      const nextBookedQty = Number(selectedSlot.booked_qty || 0) + totalQty
      const { error: slotErr } = await supabase.from('pickup_slots').update({
        booked_qty: nextBookedQty,
        status: nextBookedQty >= Number(selectedSlot.capacity_qty || 0) ? 'full' : selectedSlot.status,
      }).eq('id', selectedSlot.id)
      if (slotErr) throw new Error(slotErr.message)

      setOk(`จองสำเร็จ เลขที่ ${bookingNo}`)
      setCart([])
      setNote('')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'จองไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <div className="sticky top-0 z-20 bg-white border-b px-4 py-3">
        <h1 className="font-bold text-lg">จองเมล็ดพันธุ์</h1>
        <div className="text-xs text-gray-500">เลือกพันธุ์ จำนวน จุดรับ และวันที่รับ</div>
      </div>

      <div className="p-4 space-y-4">
        {ok && <div className="rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 text-sm flex gap-2"><Check className="w-4 h-4" />{ok}</div>}
        {error && <div className="rounded-2xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm flex gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}

        <div className="space-y-3">
          <div className="flex items-center gap-2 font-semibold"><Package className="w-4 h-4" />เลือกพันธุ์</div>
          {loading ? <div className="text-center text-gray-400 py-8">กำลังโหลด...</div> : varieties.map((v) => {
            const item = cart.find((c) => c.id === v.id)
            return (
              <div key={v.id} className="bg-white rounded-2xl border p-4 shadow-sm">
                <div className="flex justify-between gap-3">
                  <div>
                    <div className="font-bold text-gray-900">{v.name}</div>
                    <div className="text-xs text-gray-500">{v.supplierName || '-'}</div>
                    <div className="text-sm text-emerald-700 font-semibold mt-1">{fmtMoney(v.price)} บาท/ถุง</div>
                    {!!v.cropDays && <div className="text-xs text-gray-500">อายุปลูก {v.cropDays} วัน</div>}
                    {!!v.highlight && <div className="text-xs text-gray-600 mt-1">{v.highlight}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => changeQty(v, -1)} className="w-10 h-10 rounded-full border flex items-center justify-center"><Minus className="w-4 h-4" /></button>
                    <input type="number" value={item?.qty ?? 0} onChange={(e) => setQty(v, Number(e.target.value))} className="w-16 h-10 border rounded-xl text-center font-bold" />
                    <button type="button" onClick={() => changeQty(v, 1)} className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center"><Plus className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="bg-white rounded-2xl border p-4 space-y-3">
          <div className="flex items-center gap-2 font-semibold"><MapPin className="w-4 h-4" />จุดรับสินค้า</div>
          <select value={selectedLocationId} onChange={(e) => setSelectedLocationId(e.target.value)} className="w-full border rounded-xl p-3 bg-white">
            <option value="">เลือกจุดรับสินค้า</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          {selectedLocation?.address && <div className="text-xs text-gray-500">{selectedLocation.address}</div>}
          <div className="flex items-center gap-2 font-semibold"><CalendarDays className="w-4 h-4" />วันที่/รอบรับ</div>
          <select value={selectedSlotId} onChange={(e) => setSelectedSlotId(e.target.value)} className="w-full border rounded-xl p-3 bg-white" disabled={!selectedLocationId}>
            <option value="">เลือกรอบรับสินค้า</option>
            {filteredSlots.map((s) => {
              const remain = Number(s.capacity_qty || 0) - Number(s.booked_qty || 0)
              return <option key={s.id} value={s.id}>{s.pickup_date} {s.pickup_time || ''} | เหลือ {fmtMoney(remain)} ถุง</option>
            })}
          </select>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="หมายเหตุ เช่น ให้หัวหน้าทีมรับแทน" className="w-full border rounded-xl p-3 min-h-[80px]" />
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 space-y-2">
        <div className="flex justify-between text-sm"><span>จำนวนรวม</span><b>{fmtMoney(totalQty)} ถุง</b></div>
        <div className="flex justify-between text-lg"><span>ยอดจอง</span><b>{fmtMoney(totalAmount)} บาท</b></div>
        <button type="button" disabled={saving || cart.length === 0} onClick={() => void submitBooking()} className="w-full rounded-2xl py-4 bg-emerald-600 disabled:bg-gray-300 text-white font-bold flex items-center justify-center gap-2">
          <ShoppingBag className="w-5 h-5" />{saving ? 'กำลังจอง...' : 'ยืนยันจอง'}
        </button>
      </div>
    </div>
  )
}
