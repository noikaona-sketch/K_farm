import React, { useEffect, useMemo, useState } from 'react'
import { AlertCircle, CalendarCheck, Check, RefreshCw, ShoppingCart, Wifi, WifiOff } from 'lucide-react'
import { isSupabaseReady, supabase } from '../../lib/supabase'
import SeedPOSProductGrid from './SeedPOSProductGrid'
import SeedPOSCart from './SeedPOSCart'
import type { PosCartItem, PosFarmer, PosLot, PosPaymentType } from './seedPosTypes'
import { addDaysDate, fmtMoney, todayDate } from './seedPosTypes'
import { addLotToCart, calcCartTotal } from './seedPosLogic'

const MOCK_FARMERS: PosFarmer[] = [
  { id: 'mock-f1', profileId: 'mock-p1', name: 'สมชาย ใจดี', phone: '0812345678', idCard: '1234567890123', district: 'สำโรง' },
]

const MOCK_LOTS: PosLot[] = [
  { id: 'mock-l1', supplierId: 'mock-s1', supplierName: 'Supplier A', varietyId: 'mock-v1', varietyName: 'ข้าวโพด A', lotNo: 'LOT-A001', balance: 120, price: 850 },
  { id: 'mock-l2', supplierId: 'mock-s2', supplierName: 'Supplier B', varietyId: 'mock-v2', varietyName: 'ข้าวโพด B', lotNo: 'LOT-B001', balance: 80, price: 900 },
]

type BookingRow = {
  id: string
  booking_no: string
  booking_date: string
  receive_date: string
  farmer_id: string
  farmer_name: string
  farmer_phone: string
  total_amount: number
  deposit_amount: number
  status: string
  note?: string
}

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
  const [selectedFarmerId, setSelectedFarmerId] = useState('')
  const [supplierFilter, setSupplierFilter] = useState('all')
  const [productSearch, setProductSearch] = useState('')
  const [bookingDate, setBookingDate] = useState(todayDate())
  const [receiveDate, setReceiveDate] = useState(addDaysDate(7))
  const [depositAmount, setDepositAmount] = useState('0')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [ok, setOk] = useState('')
  const [error, setError] = useState('')

  const selectedFarmer = farmers.find((f) => f.id === selectedFarmerId)
  const total = calcCartTotal(cart)
  const debt = Math.max(total - Number(depositAmount || 0), 0)

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
    setLoading(true)
    setError('')
    try {
      if (!isSupabaseReady || !supabase) {
        setFarmers(MOCK_FARMERS)
        setLots(MOCK_LOTS)
        setBookings([])
        return
      }

      const memberRows = await loadMembers()
      const [varietyRes, supplierRes, lotRes, bookingRes] = await Promise.all([
        supabase.from('seed_varieties').select('id,variety_name,supplier_id,sell_price_per_bag,sell_price,price').order('variety_name'),
        supabase.from('seed_suppliers').select('id,supplier_name'),
        supabase.from('seed_stock_lots').select('id,supplier_id,supplier_name,variety_id,variety_name,lot_no,quantity_balance,created_at,status').gt('quantity_balance', 0).neq('status', 'inactive').order('created_at', { ascending: true }),
        supabase.from('seed_bookings').select('*').order('booking_date', { ascending: false }).limit(50),
      ])
      if (varietyRes.error) throw new Error(varietyRes.error.message)
      if (lotRes.error) throw new Error(lotRes.error.message)
      if (bookingRes.error) throw new Error(bookingRes.error.message)

      const varietyMap = new Map((varietyRes.data ?? []).map((v: any) => [String(v.id), v]))
      const supplierMap = new Map((supplierRes.data ?? []).map((s: any) => [String(s.id), String(s.supplier_name ?? '-')]))

      setFarmers(memberRows)
      setLots((lotRes.data ?? []).map((r: any) => {
        const v: any = varietyMap.get(String(r.variety_id))
        const supplierId = String(r.supplier_id ?? v?.supplier_id ?? '')
        const salePrice = Number(v?.sell_price_per_bag ?? v?.sell_price ?? v?.price ?? 0)
        return { id: String(r.id), supplierId, supplierName: String(r.supplier_name ?? supplierMap.get(supplierId) ?? '-'), varietyId: String(r.variety_id ?? ''), varietyName: String(r.variety_name ?? v?.variety_name ?? '-'), lotNo: String(r.lot_no ?? '-'), balance: Number(r.quantity_balance ?? 0), price: salePrice, createdAt: String(r.created_at ?? '') }
      }))
      setBookings((bookingRes.data ?? []).map((r: any) => ({
        id: String(r.id),
        booking_no: String(r.booking_no ?? ''),
        booking_date: String(r.booking_date ?? ''),
        receive_date: String(r.receive_date ?? ''),
        farmer_id: String(r.farmer_id ?? ''),
        farmer_name: String(r.farmer_name ?? '-'),
        farmer_phone: String(r.farmer_phone ?? ''),
        total_amount: Number(r.total_amount ?? 0),
        deposit_amount: Number(r.deposit_amount ?? 0),
        status: String(r.status ?? 'pending'),
        note: String(r.note ?? ''),
      })))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดข้อมูลไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const suppliers = useMemo(() => Array.from(new Map(lots.map((l) => [l.supplierId || '-', l.supplierName || '-'])).entries()).map(([id, name]) => ({ id, name })), [lots])
  const filteredLots = useMemo(() => {
    const kw = productSearch.trim().toLowerCase()
    return lots.filter((l) => (supplierFilter === 'all' || (l.supplierId || '-') === supplierFilter) && (!kw || `${l.varietyName} ${l.lotNo} ${l.supplierName}`.toLowerCase().includes(kw)))
  }, [lots, supplierFilter, productSearch])

  const clearBooking = () => {
    setCart([])
    setSelectedFarmerId('')
    setDepositAmount('0')
    setNote('')
    setReceiveDate(addDaysDate(7))
    setError('')
  }

  const submitBooking = async () => {
    setSaving(true)
    setError('')
    setOk('')
    try {
      if (!selectedFarmer) throw new Error('กรุณาเลือกสมาชิก')
      if (cart.length === 0) throw new Error('กรุณาเลือกสินค้า')
      const bookingNo = genBookingNo()

      if (!isSupabaseReady || !supabase) {
        setBookings((prev) => [{ id: `mock-${Date.now()}`, booking_no: bookingNo, booking_date: bookingDate, receive_date: receiveDate, farmer_id: selectedFarmer.id, farmer_name: selectedFarmer.name, farmer_phone: selectedFarmer.phone, total_amount: total, deposit_amount: Number(depositAmount || 0), status: 'pending', note }, ...prev])
        clearBooking()
        setOk(`สร้างใบจอง ${bookingNo} แล้ว`)
        return
      }

      const { data: booking, error: bookingErr } = await supabase.from('seed_bookings').insert({
        booking_no: bookingNo,
        booking_date: bookingDate,
        receive_date: receiveDate,
        farmer_id: selectedFarmer.id,
        farmer_name: selectedFarmer.name,
        farmer_phone: selectedFarmer.phone,
        total_amount: total,
        deposit_amount: Number(depositAmount || 0),
        balance_amount: debt,
        status: 'pending',
        note,
      }).select('id').single()
      if (bookingErr) throw new Error(bookingErr.message)

      const items = cart.map((item) => ({
        booking_id: booking.id,
        lot_id: item.id,
        lot_no: item.lotNo,
        variety_id: item.varietyId,
        variety_name: item.varietyName,
        quantity: item.qty,
        sell_price_per_bag: item.price,
        total_amount: item.qty * item.price,
        reserved_quantity: 0,
        status: 'pending',
      }))
      const { error: itemErr } = await supabase.from('seed_booking_items').insert(items)
      if (itemErr) throw new Error(itemErr.message)

      await load()
      clearBooking()
      setOk(`สร้างใบจอง ${bookingNo} แล้ว`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'จองไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  const convertToPOS = async (booking: BookingRow) => {
    setSaving(true)
    setError('')
    try {
      if (!isSupabaseReady || !supabase) throw new Error('ต้องเชื่อม Supabase ก่อนแปลงเป็นขาย')
      const { data, error: itemErr } = await supabase.from('seed_booking_items').select('*').eq('booking_id', booking.id)
      if (itemErr) throw new Error(itemErr.message)
      const items = (data ?? []).map((item: any) => ({
        id: String(item.lot_id ?? ''),
        supplierName: '',
        varietyId: String(item.variety_id ?? ''),
        varietyName: String(item.variety_name ?? '-'),
        lotNo: String(item.lot_no ?? '-'),
        balance: Number(item.quantity_balance ?? 0),
        price: Number(item.sell_price_per_bag ?? 0),
        qty: Number(item.quantity ?? 0),
      }))
      if (items.length === 0) throw new Error('ไม่พบรายการสินค้าในใบจอง')
      window.localStorage.setItem('seed_booking_to_pos', JSON.stringify({
        bookingId: booking.id,
        bookingNo: booking.booking_no,
        farmerId: booking.farmer_id,
        farmerName: booking.farmer_name,
        farmerPhone: booking.farmer_phone,
        depositAmount: booking.deposit_amount,
        items,
      }))
      window.location.href = '/admin/seed-invoice'
    } catch (e) {
      setError(e instanceof Error ? e.message : 'แปลงเป็นขายไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">POS จองเมล็ดพันธุ์</h1>
          <div className="flex items-center gap-1.5 mt-0.5 text-sm">
            {isSupabaseReady ? <><Wifi className="w-3.5 h-3.5 text-emerald-600" /><span className="text-emerald-600">Booking + Cart</span></> : <><WifiOff className="w-3.5 h-3.5 text-amber-500" /><span className="text-amber-600">Mock data</span></>}
          </div>
        </div>
        <button onClick={() => void load()} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm"><RefreshCw className="w-4 h-4" />รีโหลด</button>
      </div>

      {ok && <div className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 text-sm flex gap-2"><Check className="w-4 h-4" />{ok}</div>}
      {error && <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm flex gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2">
          <SeedPOSProductGrid lots={filteredLots} suppliers={suppliers} supplierFilter={supplierFilter} productSearch={productSearch} onSupplierFilterChange={setSupplierFilter} onProductSearchChange={setProductSearch} onAddToCart={(lot) => setCart((prev) => addLotToCart(prev, lot))} />
        </div>
        <div className="bg-white rounded-2xl border p-4 space-y-4 h-fit sticky top-4">
          <div className="flex items-center gap-2 font-bold text-lg"><CalendarCheck className="w-5 h-5" />ตะกร้าจอง</div>
          <SeedPOSCart
            cart={cart}
            farmers={farmers}
            selectedFarmerId={selectedFarmerId}
            paymentType={'credit' as PaymentTypeShim}
            cashReceived="0"
            creditPaid={depositAmount}
            dueDate={receiveDate}
            saleDate={bookingDate}
            saving={saving}
            total={total}
            change={0}
            debt={debt}
            onCartChange={setCart}
            onFarmerChange={setSelectedFarmerId}
            onPaymentTypeChange={() => undefined}
            onCashReceivedChange={() => undefined}
            onCreditPaidChange={setDepositAmount}
            onDueDateChange={setReceiveDate}
            onSaleDateChange={setBookingDate}
            onClear={clearBooking}
            onSubmit={submitBooking}
          />
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="หมายเหตุการจอง" className="w-full border rounded-xl p-2 min-h-[80px]" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 text-xs text-gray-500"><th className="text-left p-3">เลขจอง</th><th className="text-left p-3">วันที่จอง</th><th className="text-left p-3">นัดรับ</th><th className="text-left p-3">สมาชิก</th><th className="text-right p-3">ยอดจอง</th><th className="text-center p-3">สถานะ</th><th className="text-left p-3">หมายเหตุ</th><th className="text-center p-3">จัดการ</th></tr></thead>
          <tbody>{loading ? <tr><td colSpan={8} className="p-6 text-center text-gray-400">กำลังโหลด...</td></tr> : bookings.length === 0 ? <tr><td colSpan={8} className="p-6 text-center text-gray-400">ยังไม่มีรายการจอง</td></tr> : bookings.map((b) => <tr key={b.id} className="border-t"><td className="p-3 font-mono">{b.booking_no}</td><td className="p-3">{b.booking_date}</td><td className="p-3">{b.receive_date}</td><td className="p-3">{b.farmer_name}</td><td className="p-3 text-right">{fmtMoney(b.total_amount)}</td><td className="p-3 text-center">{b.status}</td><td className="p-3">{b.note || '-'}</td><td className="p-3 text-center"><button type="button" disabled={saving || b.status === 'converted'} onClick={() => void convertToPOS(b)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold disabled:bg-gray-300"><ShoppingCart className="w-3 h-3" />แปลงเป็นขาย</button></td></tr>)}</tbody>
        </table>
      </div>
    </div>
  )
}

type PaymentTypeShim = PosPaymentType
