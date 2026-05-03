import React, { useMemo, useState } from 'react'
import { CreditCard, Package, Search, ShoppingCart, Trash2 } from 'lucide-react'
import type { PosCartItem, PosFarmer, PosLot, PosPaymentType } from './seedPosTypes'
import { fmtMoney } from './seedPosTypes'
import { removeCartItem, updateCartQty } from './seedPosLogic'

type Props = {
  cart: PosCartItem[]
  farmers: PosFarmer[]
  availableLots?: PosLot[]
  selectedFarmerId: string
  paymentType: PosPaymentType
  cashReceived: string
  creditPaid: string
  dueDate: string
  saleDate: string
  saving: boolean
  total: number
  change: number
  debt: number
  submitLabel?: string
  submitLoadingLabel?: string
  cartTitle?: string
  onCartChange: (cart: PosCartItem[]) => void
  onFarmerChange: (id: string) => void
  onPaymentTypeChange: (type: PosPaymentType) => void
  onCashReceivedChange: (value: string) => void
  onCreditPaidChange: (value: string) => void
  onDueDateChange: (value: string) => void
  onSaleDateChange: (value: string) => void
  onClear: () => void
  onSubmit: () => void
}

function changeCartItemLot(cart: PosCartItem[], oldLotId: string, newLot: PosLot): PosCartItem[] {
  return cart.map((item) => {
    if (item.id !== oldLotId) return item
    return { ...item, id: newLot.id, supplierId: newLot.supplierId, supplierName: newLot.supplierName, varietyId: newLot.varietyId, varietyName: newLot.varietyName, lotNo: newLot.lotNo, balance: newLot.balance, price: newLot.price, createdAt: newLot.createdAt }
  })
}

export default function SeedPOSCart({ cart, farmers, availableLots = [], selectedFarmerId, paymentType, cashReceived, creditPaid, dueDate, saleDate, saving, total, change, debt, submitLabel = 'ขาย', submitLoadingLabel = 'ขาย...', cartTitle = 'ตะกร้าขาย', onCartChange, onFarmerChange, onPaymentTypeChange, onCashReceivedChange, onCreditPaidChange, onDueDateChange, onSaleDateChange, onClear, onSubmit }: Props) {
  const [farmerSearch, setFarmerSearch] = useState('')
  const filteredFarmers = useMemo(() => {
    const kw = farmerSearch.trim().toLowerCase()
    if (!kw) return farmers
    return farmers.filter((f) => `${f.name} ${f.phone} ${f.idCard ?? ''} ${f.district ?? ''} ${f.village ?? ''}`.toLowerCase().includes(kw))
  }, [farmers, farmerSearch])

  const autoPickFarmer = (value: string) => {
    setFarmerSearch(value)
    const kw = value.trim().toLowerCase()
    if (!kw) return
    const exact = farmers.find((f) => [f.name, f.phone, f.idCard].some((x) => String(x ?? '').toLowerCase() === kw))
    if (exact) onFarmerChange(exact.id)
  }

  return (
    <div className="bg-white rounded-2xl border p-4 space-y-4 h-fit sticky top-4">
      <div className="flex items-center gap-2 font-bold text-lg"><ShoppingCart className="w-5 h-5" />{cartTitle}</div>
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <input value={farmerSearch} onChange={(e) => autoPickFarmer(e.target.value)} placeholder="ค้นหา ชื่อ / เบอร์ / เลขบัตร" className="w-full border rounded-xl p-2 pl-9" list="pos-farmer-suggestions" />
          <datalist id="pos-farmer-suggestions">{filteredFarmers.slice(0, 20).map((f) => <option key={f.id} value={f.name}>{f.phone} | {f.idCard ?? '-'} | {f.district ?? '-'}</option>)}</datalist>
        </div>
        {filteredFarmers.length > 0 && farmerSearch.trim() && !selectedFarmerId && <div className="max-h-36 overflow-y-auto border rounded-xl bg-white divide-y">{filteredFarmers.slice(0, 8).map((f) => <button key={f.id} type="button" onClick={() => { onFarmerChange(f.id); setFarmerSearch(f.name) }} className="w-full text-left px-3 py-2 hover:bg-gray-50"><div className="font-medium text-sm">{f.name}</div><div className="text-xs text-gray-500">{f.phone} | {f.idCard ?? '-'} | {f.district ?? '-'}</div></button>)}</div>}
        <select value={selectedFarmerId} onChange={(e) => { onFarmerChange(e.target.value); const f = farmers.find((x) => x.id === e.target.value); if (f) setFarmerSearch(f.name) }} className="w-full border rounded-xl p-2 bg-white">
          <option value="">เลือกสมาชิก</option>
          {filteredFarmers.map((f) => <option key={f.id} value={f.id}>{f.name} | {f.phone} | {f.idCard ?? '-'} | {f.district ?? '-'}</option>)}
        </select>
      </div>
      <div className="space-y-2 max-h-72 overflow-y-auto">{cart.map((item) => { const sameVarietyLots = availableLots.filter((lot) => lot.varietyId === item.varietyId); return <div key={item.id} className="border rounded-xl p-3"><div className="flex justify-between gap-2"><div className="flex-1"><div className="font-semibold">{item.varietyName}</div>{sameVarietyLots.length > 0 ? <select value={item.id} onChange={(e) => { const newLot = sameVarietyLots.find((lot) => lot.id === e.target.value); if (newLot) onCartChange(changeCartItemLot(cart, item.id, newLot)) }} className="mt-1 w-full border rounded-lg p-1 text-xs bg-white">{sameVarietyLots.map((lot) => <option key={lot.id} value={lot.id}>{lot.lotNo} | Stock {lot.balance} | {fmtMoney(lot.price)}</option>)}</select> : <div className="text-xs text-gray-500">{item.lotNo}</div>}<div className="text-xs text-gray-500 mt-1">Stock lot นี้: {fmtMoney(item.balance)} ถุง</div></div><button type="button" onClick={() => onCartChange(removeCartItem(cart, item.id))} className="text-red-500"><Trash2 className="w-4 h-4" /></button></div><div className="mt-2 grid grid-cols-3 gap-2 items-center"><input type="number" min="1" value={item.qty} onChange={(e) => onCartChange(updateCartQty(cart, item.id, Number(e.target.value)))} className="border rounded-lg p-1 text-center" /><div className="text-right text-sm">x {fmtMoney(item.price)}</div><div className="text-right font-bold">{fmtMoney(item.qty * item.price)}</div></div>{item.qty > item.balance && <div className="mt-2 text-xs text-red-600">จำนวนเกิน stock จะบันทึกเป็นค้างส่ง</div>}</div> })}{cart.length === 0 && <div className="text-center text-gray-400 py-8"><Package className="w-8 h-8 mx-auto mb-2 opacity-40" />ยังไม่มีสินค้า</div>}</div>
      <div className="border-t pt-3 space-y-2"><div className="flex justify-between text-lg"><span>รวม</span><b>{fmtMoney(total)} บาท</b></div><select value={paymentType} onChange={(e) => onPaymentTypeChange(e.target.value as PosPaymentType)} className="w-full border rounded-xl p-2 bg-white"><option value="cash">เงินสด</option><option value="credit">เครดิต / ลูกหนี้</option></select>{paymentType === 'cash' ? <><input type="number" value={cashReceived} onChange={(e) => onCashReceivedChange(e.target.value)} placeholder="เงินรับ" className="w-full border rounded-xl p-2" /><div className="flex justify-between text-emerald-700"><span>เงินทอน</span><b>{fmtMoney(change)} บาท</b></div></> : <><input type="number" value={creditPaid} onChange={(e) => onCreditPaidChange(e.target.value)} placeholder="ชำระแล้วบางส่วน" className="w-full border rounded-xl p-2" /><input type="date" value={dueDate} onChange={(e) => onDueDateChange(e.target.value)} className="w-full border rounded-xl p-2" /><div className="flex justify-between text-red-600"><span>ยอดค้าง</span><b>{fmtMoney(debt)} บาท</b></div></>}<input type="date" value={saleDate} onChange={(e) => onSaleDateChange(e.target.value)} className="w-full border rounded-xl p-2" /><div className="grid grid-cols-2 gap-2"><button type="button" onClick={onClear} className="border rounded-xl py-3 font-semibold">ล้าง</button><button type="button" disabled={saving || cart.length === 0} onClick={onSubmit} className="bg-emerald-600 disabled:bg-gray-300 text-white rounded-xl py-3 font-bold flex items-center justify-center gap-2"><CreditCard className="w-4 h-4" />{saving ? submitLoadingLabel : submitLabel}</button></div></div>
    </div>
  )
}
