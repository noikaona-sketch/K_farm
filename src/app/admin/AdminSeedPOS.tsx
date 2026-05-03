import React, { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Check, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { isSupabaseReady, supabase } from '../../lib/supabase'
import SeedPOSProductGrid from './SeedPOSProductGrid'
import SeedPOSCart from './SeedPOSCart'
import SeedPOSHistoryActions from './SeedPOSHistoryActions'
import SeedPOSSalesSummary from './SeedPOSSalesSummary'
import type { PosCartItem, PosFarmer, PosLot, PosPaymentType, PosSaleRow } from './seedPosTypes'
import { addDaysDate, todayDate, fmtMoney } from './seedPosTypes'
import { addLotToCart, calcDeliveryQty, calcPayment, validateCartSale } from './seedPosLogic'
import { calcDeliverMore, calcPartialReturn } from './seedPosReturnDelivery'

const MOCK_FARMERS: PosFarmer[] = [
  { id: 'mock-f1', profileId: 'mock-p1', name: 'สมชาย ใจดี', phone: '0812345678', idCard: '1234567890123', district: 'สำโรง' },
]

const MOCK_LOTS: PosLot[] = [
  { id: 'mock-l1', supplierId: 'mock-s1', supplierName: 'Supplier A', varietyId: 'mock-v1', varietyName: 'ข้าวโพด A', lotNo: 'LOT-A001', balance: 120, price: 850, createdAt: '2026-04-01' },
  { id: 'mock-l2', supplierId: 'mock-s2', supplierName: 'Supplier B', varietyId: 'mock-v2', varietyName: 'ข้าวโพด B', lotNo: 'LOT-B001', balance: 80, price: 900, createdAt: '2026-04-02' },
]

export default function AdminSeedPOS() {
  const [farmers, setFarmers] = useState<PosFarmer[]>(MOCK_FARMERS)
  const [lots, setLots] = useState<PosLot[]>(MOCK_LOTS)
  const [sales, setSales] = useState<PosSaleRow[]>([])
  const [cart, setCart] = useState<PosCartItem[]>([])
  const [selectedFarmerId, setSelectedFarmerId] = useState('')
  const [supplierFilter, setSupplierFilter] = useState('all')
  const [productSearch, setProductSearch] = useState('')
  const [paymentType, setPaymentType] = useState<PosPaymentType>('cash')
  const [cashReceived, setCashReceived] = useState('')
  const [creditPaid, setCreditPaid] = useState('0')
  const [dueDate, setDueDate] = useState(addDaysDate(15))
  const [saleDate, setSaleDate] = useState(todayDate())
  const [historyStartDate, setHistoryStartDate] = useState('')
  const [historyEndDate, setHistoryEndDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [ok, setOk] = useState('')
  const [error, setError] = useState('')

  const selectedFarmer = farmers.find((f) => f.id === selectedFarmerId)
  const payment = calcPayment({ cart, paymentType, cashReceived: Number(cashReceived || 0), creditPaid: Number(creditPaid || 0) })

  const loadBookingToPOS = (availableLots: PosLot[]) => {
    const raw = window.localStorage.getItem('seed_booking_to_pos')
    if (!raw) return
    try {
      const data = JSON.parse(raw)
      const items: PosCartItem[] = Array.isArray(data.items) ? data.items.map((item: any) => {
        const lot = availableLots.find((l) => l.id === String(item.id))
        return { ...(lot ?? item), id: String(item.id), balance: Number(lot?.balance ?? item.balance ?? 0), price: Number(lot?.price ?? item.price ?? 0), qty: Number(item.qty ?? 0) }
      }) : []
      if (items.length > 0) setCart(items)
      if (data.farmerId) setSelectedFarmerId(String(data.farmerId))
      if (Number(data.depositAmount || 0) > 0) { setPaymentType('credit'); setCreditPaid(String(data.depositAmount || 0)) }
      setOk(`โหลดใบจอง ${data.bookingNo ?? ''} เข้า POS แล้ว`)
      window.localStorage.removeItem('seed_booking_to_pos')
    } catch (e) {
      setError('โหลดใบจองเข้า POS ไม่สำเร็จ')
    }
  }

  const loadMembers = async (): Promise<PosFarmer[]> => {
    if (!supabase) return MOCK_FARMERS
    const [farmerRes, profileRes] = await Promise.all([
      supabase.from('farmers').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id,full_name,phone,id_card,role'),
    ])
    if (farmerRes.error) throw new Error(`โหลด farmers ไม่สำเร็จ: ${farmerRes.error.message}`)
    if (profileRes.error) throw new Error(`โหลด profiles ไม่สำเร็จ: ${profileRes.error.message}`)
    const profileMap = new Map((profileRes.data ?? []).map((p: any) => [String(p.id), p]))
    return (farmerRes.data ?? [])
      .filter((f: any) => ['approved', 'active', 'farmer', 'member'].includes(String(f.status ?? 'approved')))
      .map((f: any) => {
        const p = profileMap.get(String(f.profile_id ?? ''))
        return { id: String(f.id), profileId: f.profile_id ? String(f.profile_id) : undefined, name: String(f.full_name ?? p?.full_name ?? f.name ?? '-'), phone: String(f.phone ?? p?.phone ?? ''), idCard: String(f.id_card ?? p?.id_card ?? ''), district: String(f.district ?? ''), village: String(f.village ?? '') }
      })
  }

  const load = async () => {
    setLoading(true); setError('')
    try {
      if (!isSupabaseReady || !supabase) { setFarmers(MOCK_FARMERS); setLots(MOCK_LOTS); setSales([]); loadBookingToPOS(MOCK_LOTS); return }
      const memberRows = await loadMembers()
      const [varietyRes, supplierRes, lotRes, saleRes] = await Promise.all([
        supabase.from('seed_varieties').select('id,variety_name,supplier_id,sell_price_per_bag,price').order('variety_name'),
        supabase.from('seed_suppliers').select('id,supplier_name'),
        supabase.from('seed_stock_lots').select('id,supplier_id,supplier_name,variety_id,variety_name,lot_no,quantity_balance,created_at,status').gt('quantity_balance', 0).neq('status', 'inactive').order('created_at', { ascending: true }),
        supabase.from('seed_sales').select('*').order('sale_date', { ascending: false }).limit(200),
      ])
      if (varietyRes.error) throw new Error(varietyRes.error.message)
      if (lotRes.error) throw new Error(lotRes.error.message)
      if (saleRes.error) throw new Error(saleRes.error.message)
      const varietyMap = new Map((varietyRes.data ?? []).map((v: any) => [String(v.id), v]))
      const supplierMap = new Map((supplierRes.data ?? []).map((s: any) => [String(s.id), String(s.supplier_name ?? '-')]))
      setFarmers(memberRows)
      const nextLots = (lotRes.data ?? []).map((r: any) => {
        const v: any = varietyMap.get(String(r.variety_id))
        const supplierId = String(r.supplier_id ?? v?.supplier_id ?? '')
        const salePrice = Number(v?.sell_price_per_bag ?? v?.price ?? 0)
        return { id: String(r.id), supplierId, supplierName: String(r.supplier_name ?? supplierMap.get(supplierId) ?? '-'), varietyId: String(r.variety_id ?? ''), varietyName: String(r.variety_name ?? v?.variety_name ?? '-'), lotNo: String(r.lot_no ?? '-'), balance: Number(r.quantity_balance ?? 0), price: salePrice, createdAt: String(r.created_at ?? '') }
      })
      setLots(nextLots)
      setSales((saleRes.data ?? []).map((r: any) => ({ id: String(r.id), sale_date: String(r.sale_date ?? ''), farmer_name: String(r.farmer_name ?? '-'), farmer_phone: String(r.farmer_phone ?? ''), variety_name: String(r.variety_name ?? '-'), lot_no: String(r.lot_no ?? ''), quantity: Number(r.quantity ?? 0), total_amount: Number(r.total_amount ?? 0), paid_amount: Number(r.paid_amount ?? 0), payment_status: String(r.payment_status ?? ''), delivery_status: String(r.delivery_status ?? ''), delivered_quantity: Number(r.delivered_quantity ?? r.quantity ?? 0), pending_delivery_qty: Number(r.pending_delivery_qty ?? 0), returned_quantity: Number(r.returned_quantity ?? 0), return_status: String(r.return_status ?? 'normal'), lot_id: String(r.lot_id ?? ''), invoice_no: String(r.invoice_no ?? ''), seller_name: String(r.seller_name ?? '') })))
      loadBookingToPOS(nextLots)
    } catch (e) { setError(e instanceof Error ? e.message : 'โหลดข้อมูลไม่สำเร็จ') } finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  const suppliers = useMemo(() => Array.from(new Map(lots.map((l) => [l.supplierId || '-', l.supplierName || '-'])).entries()).map(([id, name]) => ({ id, name })), [lots])
  const filteredLots = useMemo(() => { const kw = productSearch.trim().toLowerCase(); return lots.filter((l) => (supplierFilter === 'all' || (l.supplierId || '-') === supplierFilter) && (!kw || `${l.varietyName} ${l.lotNo} ${l.supplierName}`.toLowerCase().includes(kw))) }, [lots, supplierFilter, productSearch])
  const filteredSales = useMemo(() => sales.filter((s) => (!historyStartDate || s.sale_date >= historyStartDate) && (!historyEndDate || s.sale_date <= historyEndDate)), [sales, historyStartDate, historyEndDate])

  const clearCart = () => { setCart([]); setCashReceived(''); setCreditPaid('0'); setError(''); setOk('') }

  const submitSale = async () => {
    setSaving(true); setError(''); setOk('')
    try {
      const validation = validateCartSale({ cart, hasFarmer: !!selectedFarmer, paymentType, cashReceived: Number(cashReceived || 0) })
      if (validation) throw new Error(validation)
      if (!selectedFarmer) throw new Error('กรุณาเลือกสมาชิก')
      if (!isSupabaseReady || !supabase) {
        setLots((prev) => prev.map((l) => { const c = cart.find((i) => i.id === l.id); if (!c) return l; const d = calcDeliveryQty(c); return { ...l, balance: d.nextBalance } }))
        const newSales: PosSaleRow[] = cart.map((i) => { const d = calcDeliveryQty(i); return { id: `mock-sale-${Date.now()}-${i.id}`, sale_date: saleDate, farmer_name: selectedFarmer.name, farmer_phone: selectedFarmer.phone, variety_name: i.varietyName, lot_no: i.lotNo, quantity: i.qty, total_amount: i.qty * i.price, paid_amount: paymentType === 'cash' ? i.qty * i.price : 0, payment_status: paymentType === 'cash' ? 'paid' : 'unpaid', delivery_status: d.deliveryStatus, delivered_quantity: d.deliveredQty, pending_delivery_qty: d.pendingDeliveryQty, returned_quantity: 0, return_status: 'normal', lot_id: i.id, invoice_no: '', seller_name: 'Admin' } })
        setSales((prev) => [...newSales, ...prev])
      } else {
        let remainingCreditPaid = Number(creditPaid || 0)
        for (const item of cart) {
          const d = calcDeliveryQty(item); const itemTotal = item.qty * item.price; const itemPaid = paymentType === 'cash' ? itemTotal : Math.min(remainingCreditPaid, itemTotal)
          if (paymentType === 'credit') remainingCreditPaid = Math.max(remainingCreditPaid - itemPaid, 0)
          const itemDebt = Math.max(itemTotal - itemPaid, 0)
          const row = { sale_date: saleDate, farmer_id: selectedFarmer.id, farmer_name: selectedFarmer.name, farmer_phone: selectedFarmer.phone, lot_id: item.id, lot_no: item.lotNo, variety_id: item.varietyId, variety_name: item.varietyName, quantity: item.qty, delivered_quantity: d.deliveredQty, pending_delivery_qty: d.pendingDeliveryQty, sell_price_per_bag: item.price, total_amount: itemTotal, paid_amount: itemPaid, payment_status: itemDebt <= 0 ? 'paid' : itemPaid > 0 ? 'partial' : 'unpaid', delivery_status: d.deliveryStatus, due_date: itemDebt > 0 ? dueDate : null, is_returned: false, refund_amount: 0, returned_quantity: 0, return_status: 'normal' }
          const { error: saleErr } = await supabase.from('seed_sales').insert(row); if (saleErr) throw new Error(`ขาย ${item.varietyName} ไม่สำเร็จ: ${saleErr.message}`)
          const { error: stockErr } = await supabase.from('seed_stock_lots').update({ quantity_balance: d.nextBalance, status: d.nextBalance <= 0 ? 'sold_out' : 'available' }).eq('id', item.id); if (stockErr) throw new Error(`ตัด stock ${item.lotNo} ไม่สำเร็จ: ${stockErr.message}`)
        }
        await load()
      }
      setOk(paymentType === 'cash' ? `ขายสำเร็จ เงินทอน ${fmtMoney(payment.change)} บาท` : `ขายเครดิตสำเร็จ ยอดค้าง ${fmtMoney(payment.debt)} บาท`); clearCart(); setSelectedFarmerId('')
    } catch (e) { setError(e instanceof Error ? e.message : 'ขายไม่สำเร็จ') } finally { setSaving(false) }
  }

  const handleDeliverMore = async (sale: PosSaleRow, qty: number) => {
    setSaving(true); setError(''); setOk('')
    try {
      const lot = lots.find((l) => l.id === sale.lot_id)
      if (!lot) throw new Error('ไม่พบ LOT เดิม')
      const d = calcDeliverMore(sale, lot, qty)
      if (d.deliverQty <= 0) throw new Error('จำนวนส่งเพิ่มไม่ถูกต้อง หรือ stock ไม่พอ')
      if (!isSupabaseReady || !supabase || sale.id.startsWith('mock-')) {
        setLots((prev) => prev.map((l) => l.id === lot.id ? { ...l, balance: d.nextLotBalance } : l))
        setSales((prev) => prev.map((s) => s.id === sale.id ? { ...s, delivered_quantity: d.nextDelivered, pending_delivery_qty: d.nextPending, delivery_status: d.nextDeliveryStatus } : s))
      } else {
        const { error: saleErr } = await supabase.from('seed_sales').update({ delivered_quantity: d.nextDelivered, pending_delivery_qty: d.nextPending, delivery_status: d.nextDeliveryStatus }).eq('id', sale.id)
        if (saleErr) throw new Error(saleErr.message)
        const { error: stockErr } = await supabase.from('seed_stock_lots').update({ quantity_balance: d.nextLotBalance, status: d.nextLotBalance <= 0 ? 'sold_out' : 'available' }).eq('id', lot.id)
        if (stockErr) throw new Error(stockErr.message)
        await load()
      }
      setOk(`ส่งเพิ่มแล้ว ${d.deliverQty} ถุง`)
    } catch (e) { setError(e instanceof Error ? e.message : 'ส่งเพิ่มไม่สำเร็จ') } finally { setSaving(false) }
  }

  const handleReturnPartial = async (sale: PosSaleRow, qty: number) => {
    setSaving(true); setError(''); setOk('')
    try {
      const lot = lots.find((l) => l.id === sale.lot_id)
      if (!lot) throw new Error('ไม่พบ LOT เดิม')
      const r = calcPartialReturn(sale, lot, qty)
      if (r.returnQty <= 0) throw new Error('จำนวนคืนไม่ถูกต้อง')
      if (!isSupabaseReady || !supabase || sale.id.startsWith('mock-')) {
        setLots((prev) => prev.map((l) => l.id === lot.id ? { ...l, balance: r.nextLotBalance } : l))
        setSales((prev) => prev.map((s) => s.id === sale.id ? { ...s, returned_quantity: r.nextReturned, return_status: r.nextReturnStatus } : s))
      } else {
        const { error: saleErr } = await supabase.from('seed_sales').update({ returned_quantity: r.nextReturned, return_status: r.nextReturnStatus, returned_at: new Date().toISOString() }).eq('id', sale.id)
        if (saleErr) throw new Error(saleErr.message)
        const { error: stockErr } = await supabase.from('seed_stock_lots').update({ quantity_balance: r.nextLotBalance, status: 'available' }).eq('id', lot.id)
        if (stockErr) throw new Error(stockErr.message)
        await load()
      }
      setOk(`รับคืนแล้ว ${r.returnQty} ถุง`)
    } catch (e) { setError(e instanceof Error ? e.message : 'รับคืนไม่สำเร็จ') } finally { setSaving(false) }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3"><div><h1 className="text-xl font-bold text-gray-900">POS ขายเมล็ดพันธุ์</h1><div className="flex items-center gap-1.5 mt-0.5 text-sm">{isSupabaseReady ? <><Wifi className="w-3.5 h-3.5 text-emerald-600"/><span className="text-emerald-600">Cash + Credit + Cart</span></> : <><WifiOff className="w-3.5 h-3.5 text-amber-500"/><span className="text-amber-600">Mock data</span></>}</div></div><button onClick={() => void load()} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm"><RefreshCw className="w-4 h-4"/>รีโหลด</button></div>
      {ok && <div className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 text-sm flex gap-2"><Check className="w-4 h-4"/>{ok}</div>}
      {error && <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm flex gap-2"><AlertCircle className="w-4 h-4"/>{error}</div>}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5"><div className="xl:col-span-2"><SeedPOSProductGrid lots={filteredLots} suppliers={suppliers} supplierFilter={supplierFilter} productSearch={productSearch} onSupplierFilterChange={setSupplierFilter} onProductSearchChange={setProductSearch} onAddToCart={(lot) => setCart((prev) => addLotToCart(prev, lot))} /></div><SeedPOSCart cart={cart} farmers={farmers} selectedFarmerId={selectedFarmerId} paymentType={paymentType} cashReceived={cashReceived} creditPaid={creditPaid} dueDate={dueDate} saleDate={saleDate} saving={saving} total={payment.total} change={payment.change} debt={payment.debt} onCartChange={setCart} onFarmerChange={setSelectedFarmerId} onPaymentTypeChange={setPaymentType} onCashReceivedChange={setCashReceived} onCreditPaidChange={setCreditPaid} onDueDateChange={setDueDate} onSaleDateChange={setSaleDate} onClear={clearCart} onSubmit={submitSale} /></div>
      <SeedPOSSalesSummary sales={filteredSales} startDate={historyStartDate} endDate={historyEndDate} onStartDateChange={setHistoryStartDate} onEndDateChange={setHistoryEndDate} />
      <div className="bg-white rounded-2xl border overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-gray-50 text-xs text-gray-500"><th className="text-left p-3">วันที่</th><th className="text-left p-3">สมาชิก</th><th className="text-left p-3">พันธุ์</th><th className="text-left p-3">Lot</th><th className="text-right p-3">ขาย</th><th className="text-right p-3">ส่งแล้ว</th><th className="text-right p-3">ค้างส่ง</th><th className="text-right p-3">คืนแล้ว</th><th className="text-right p-3">ยอดขาย</th><th className="text-center p-3">จัดการ</th></tr></thead><tbody>{loading ? <tr><td colSpan={10} className="p-6 text-center text-gray-400">กำลังโหลด...</td></tr> : filteredSales.length === 0 ? <tr><td colSpan={10} className="p-6 text-center text-gray-400">ยังไม่มีรายการขายในช่วงวันที่นี้</td></tr> : filteredSales.map((s) => <tr key={s.id} className="border-t"><td className="p-3">{s.sale_date}</td><td className="p-3">{s.farmer_name}</td><td className="p-3">{s.variety_name}</td><td className="p-3">{s.lot_no}</td><td className="p-3 text-right">{s.quantity}</td><td className="p-3 text-right">{s.delivered_quantity ?? s.quantity}</td><td className="p-3 text-right text-red-600 font-semibold">{s.pending_delivery_qty ?? 0}</td><td className="p-3 text-right text-orange-600 font-semibold">{s.returned_quantity ?? 0}</td><td className="p-3 text-right">{fmtMoney(s.total_amount)}</td><td className="p-3"><SeedPOSHistoryActions sale={s} disabled={saving} onDeliverMore={handleDeliverMore} onReturnPartial={handleReturnPartial} /></td></tr>)}</tbody></table></div>
    </div>
  )
}
