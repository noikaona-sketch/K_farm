import React, { useMemo, useState } from 'react'
import { CalendarCheck, CreditCard, MapPin, Package, Search, ShoppingCart, Trash2 } from 'lucide-react'
import type { PosCartItem, PosFarmer } from './seedPosTypes'
import { fmtMoney } from './seedPosTypes'
import { removeCartItem, updateCartQty } from './seedPosLogic'

type PickupLocation = { id: string; name: string; address?: string }
type PickupSlot = { id: string; location_id: string; pickup_date: string; pickup_time: string; capacity_qty: number; booked_qty: number; status: string }

type Props = {
  cart: PosCartItem[]
  farmers: PosFarmer[]
  selectedFarmerId: string
  selectedLocationId: string
  selectedSlotId: string
  pickupLocations: PickupLocation[]
  pickupSlots: PickupSlot[]
  bookingDate: string
  receiveDate: string
  note: string
  saving: boolean
  total: number
  debt: number
  onCartChange: (cart: PosCartItem[]) => void
  onFarmerChange: (id: string) => void
  onLocationChange: (id: string) => void
  onSlotChange: (id: string) => void
  onBookingDateChange: (value: string) => void
  onReceiveDateChange: (value: string) => void
  onNoteChange: (value: string) => void
  onClear: () => void
  onSubmit: () => void
}

export default function AdminSeedBookingCart({ cart, farmers, selectedFarmerId, selectedLocationId, selectedSlotId, pickupLocations, pickupSlots, bookingDate, receiveDate, note, saving, total, debt, onCartChange, onFarmerChange, onLocationChange, onSlotChange, onBookingDateChange, onReceiveDateChange, onNoteChange, onClear, onSubmit }: Props) {
  const [farmerSearch, setFarmerSearch] = useState('')
  const filteredFarmers = useMemo(() => {
    const kw = farmerSearch.trim().toLowerCase()
    if (!kw) return farmers
    return farmers.filter((f) => `${f.name} ${f.phone} ${f.idCard ?? ''} ${f.district ?? ''} ${f.village ?? ''}`.toLowerCase().includes(kw))
  }, [farmers, farmerSearch])
  const selectedLocation = pickupLocations.find((p) => p.id === selectedLocationId)
  const filteredSlots = useMemo(() => pickupSlots.filter((s) => s.location_id === selectedLocationId), [pickupSlots, selectedLocationId])
  const selectedSlot = filteredSlots.find((s) => s.id === selectedSlotId)

  return (
    <div className="bg-white rounded-2xl border p-4 space-y-4 h-fit sticky top-4">
      <div className="flex items-center gap-2 font-bold text-lg"><CalendarCheck className="w-5 h-5" />ตะกร้าจอง</div>
      <div className="space-y-2">
        <div className="relative"><Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" /><input value={farmerSearch} onChange={(e) => setFarmerSearch(e.target.value)} placeholder="ค้นหา ชื่อ / เบอร์ / เลขบัตร" className="w-full border rounded-xl p-2 pl-9" /></div>
        <select value={selectedFarmerId} onChange={(e) => { onFarmerChange(e.target.value); const f = farmers.find((x) => x.id === e.target.value); if (f) setFarmerSearch(f.name) }} className="w-full border rounded-xl p-2 bg-white"><option value="">เลือกสมาชิก</option>{filteredFarmers.map((f) => <option key={f.id} value={f.id}>{f.name} | {f.phone} | {f.idCard ?? '-'}</option>)}</select>
      </div>
      <div className="space-y-2 max-h-72 overflow-y-auto">
        {cart.length === 0 ? <div className="text-center text-gray-400 py-8"><Package className="w-8 h-8 mx-auto mb-2 opacity-40" />ยังไม่มีสินค้า</div> : cart.map((item) => <div key={item.id} className="border rounded-xl p-3"><div className="flex justify-between gap-2"><div><div className="font-semibold">{item.varietyName}</div><div className="text-xs text-gray-500">{fmtMoney(item.price)} บาท/ถุง</div></div><button type="button" onClick={() => onCartChange(removeCartItem(cart, item.id))} className="text-red-500"><Trash2 className="w-4 h-4" /></button></div><div className="mt-2 grid grid-cols-3 gap-2 items-center"><input type="number" min="1" value={item.qty} onChange={(e) => onCartChange(updateCartQty(cart, item.id, Number(e.target.value)))} className="border rounded-lg p-1 text-center" /><div className="text-right text-sm">x {fmtMoney(item.price)}</div><div className="text-right font-bold">{fmtMoney(item.qty * item.price)}</div></div></div>)}
      </div>
      <div className="border-t pt-3 space-y-2">
        <div className="flex justify-between text-lg"><span>รวม</span><b>{fmtMoney(total)} บาท</b></div>
        <div className="flex justify-between text-red-600"><span>ยอดค้างเครดิต</span><b>{fmtMoney(debt)} บาท</b></div>
        <input type="date" value={bookingDate} onChange={(e) => onBookingDateChange(e.target.value)} className="w-full border rounded-xl p-2" />
      </div>
      <div className="border-2 border-emerald-200 bg-emerald-50 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2 font-bold text-base text-emerald-800"><MapPin className="w-5 h-5" />จุดนัดรับสินค้า</div>
        <select value={selectedLocationId} onChange={(e) => { onLocationChange(e.target.value); onSlotChange('') }} className="w-full border-2 border-emerald-300 rounded-xl p-3 bg-white text-base font-medium"><option value="">เลือกจุดรับสินค้า</option>{pickupLocations.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        {selectedLocation?.address && <div className="text-xs text-emerald-700">{selectedLocation.address}</div>}
        <select value={selectedSlotId} onChange={(e) => { onSlotChange(e.target.value); const s = filteredSlots.find((x) => x.id === e.target.value); if (s?.pickup_date) onReceiveDateChange(s.pickup_date) }} className="w-full border-2 border-emerald-300 rounded-xl p-3 bg-white text-base font-medium" disabled={!selectedLocationId || filteredSlots.length === 0}><option value="">{selectedLocationId && filteredSlots.length === 0 ? 'ยังไม่มีรอบรับของจุดนี้' : 'เลือกรอบรับสินค้า'}</option>{filteredSlots.map((s) => { const remain = Number(s.capacity_qty || 0) - Number(s.booked_qty || 0); return <option key={s.id} value={s.id}>{s.pickup_date} {s.pickup_time || ''} | เหลือ {fmtMoney(remain)} ถุง</option> })}</select>
        {selectedSlot && <div className="grid grid-cols-2 gap-2 text-sm"><div className="rounded-xl bg-white/70 border p-2"><div className="text-gray-500">ความจุ</div><div className="font-bold">{fmtMoney(selectedSlot.capacity_qty)} ถุง</div></div><div className="rounded-xl bg-white/70 border p-2"><div className="text-gray-500">เหลือ</div><div className="font-bold text-emerald-700">{fmtMoney(Number(selectedSlot.capacity_qty || 0) - Number(selectedSlot.booked_qty || 0))} ถุง</div></div></div>}
      </div>
      <textarea value={note} onChange={(e) => onNoteChange(e.target.value)} placeholder="หมายเหตุการจอง" className="w-full border rounded-xl p-3 min-h-[90px]" />
      <div className="grid grid-cols-2 gap-2"><button type="button" onClick={onClear} className="border rounded-xl py-3 font-semibold">ล้าง</button><button type="button" disabled={saving || cart.length === 0} onClick={onSubmit} className="bg-emerald-600 disabled:bg-gray-300 text-white rounded-xl py-3 font-bold flex items-center justify-center gap-2"><CreditCard className="w-4 h-4" />{saving ? 'จอง...' : 'จอง'}</button></div>
    </div>
  )
}
