import React, { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Banknote, Check, FileText, RefreshCw, RotateCcw, Search, Wifi, WifiOff } from 'lucide-react'
import { isSupabaseReady, supabase } from '../../lib/supabase'

type Farmer = { id: string; profileId?: string; name: string; phone: string; district?: string; village?: string }
type Lot = { id: string; varietyId: string; varietyName: string; lotNo: string; balance: number; price: number; createdAt?: string }
type Reservation = { id: string; farmer_id: string; profile_id?: string; farmer_name: string; farmer_phone: string; variety_id: string; variety_name: string; quantity: number; status: string }
type SaleRow = { id: string; sale_date: string; farmer_name: string; variety_name: string; lot_id: string; lot_no: string; quantity: number; total_amount: number; paid_amount: number; refund_amount: number; payment_status: string; delivery_status: string; due_date: string; is_returned?: boolean; refund_status?: string; refund_date?: string }

const MOCK_FARMERS: Farmer[] = [{ id: 'mock-f1', profileId: 'mock-p1', name: 'สมชาย ใจดี', phone: '0812345678', district: 'สำโรง' }]
const MOCK_LOTS: Lot[] = [{ id: 'mock-lot-1', varietyId: 'mock-v1', varietyName: 'ข้าวโพดพันธุ์ A', lotNo: 'LOT-A001', balance: 120, price: 850, createdAt: '2026-04-01' }]
const MOCK_RESERVATIONS: Reservation[] = [{ id: 'mock-r1', farmer_id: 'mock-f1', profile_id: 'mock-p1', farmer_name: 'สมชาย ใจดี', farmer_phone: '0812345678', variety_id: 'mock-v1', variety_name: 'ข้าวโพดพันธุ์ A', quantity: 10, status: 'confirmed' }]
function today() { return new Date().toISOString().slice(0, 10) }
function addDays(days: number) { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10) }
function fmt(n: number) { return n.toLocaleString('th-TH', { maximumFractionDigits: 0 }) }

export default function AdminSeedInvoice() {
  const [farmers, setFarmers] = useState<Farmer[]>(MOCK_FARMERS)
  const [lots, setLots] = useState<Lot[]>(MOCK_LOTS)
  const [reservations, setReservations] = useState<Reservation[]>(MOCK_RESERVATIONS)
  const [sales, setSales] = useState<SaleRow[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [ok, setOk] = useState('')
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [mode, setMode] = useState<'fifo' | 'manual'>('fifo')
  const [saleSource, setSaleSource] = useState<'direct' | 'reservation'>('direct')
  const [reservationId, setReservationId] = useState('')
  const [form, setForm] = useState({ farmerId: '', profileId: '', varietyId: '', lotId: '', quantity: '1', price: '', saleDate: today(), saleType: 'credit', paidAmount: '0', dueDate: addDays(15), deliveryStatus: 'pending' })

  const loadMembers = async (): Promise<Farmer[]> => {
    if (!supabase) return MOCK_FARMERS
    const [farmerRes, profileRes] = await Promise.all([
      supabase.from('farmers').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id,full_name,phone,role'),
    ])
    if (farmerRes.error) throw new Error(`โหลด farmers ไม่สำเร็จ: ${farmerRes.error.message}`)
    if (profileRes.error) throw new Error(`โหลด profiles ไม่สำเร็จ: ${profileRes.error.message}`)
    const profileMap = new Map((profileRes.data ?? []).map((p: any) => [String(p.id), p]))
    return (farmerRes.data ?? [])
      .filter((f: any) => ['approved', 'active', 'farmer', 'member'].includes(String(f.status ?? 'approved')))
      .map((f: any) => {
        const p = profileMap.get(String(f.profile_id ?? ''))
        return { id: String(f.id), profileId: f.profile_id ? String(f.profile_id) : undefined, name: String(f.full_name ?? p?.full_name ?? f.name ?? '-'), phone: String(f.phone ?? p?.phone ?? ''), district: String(f.district ?? ''), village: String(f.village ?? '') }
      })
  }

  const load = async () => {
    setLoading(true); setError('')
    try {
      if (!isSupabaseReady || !supabase) { setFarmers(MOCK_FARMERS); setLots(MOCK_LOTS); setReservations(MOCK_RESERVATIONS); setSales([]); return }
      const memberRows = await loadMembers()
      const [varietyRes, lotRes, saleRes, reserveRes] = await Promise.all([
        supabase.from('seed_varieties').select('id,variety_name').order('variety_name'),
        supabase.from('seed_stock_lots').select('id,variety_id,lot_no,quantity_balance,sell_price_per_bag,created_at,status').gt('quantity_balance', 0).neq('status', 'inactive').order('created_at', { ascending: true }),
        supabase.from('seed_sales').select('*').order('sale_date', { ascending: false }).limit(30),
        supabase.from('seed_bookings').select('*').in('status', ['confirmed', 'approved']).order('pickup_date', { ascending: true }),
      ])
      if (varietyRes.error) throw new Error(varietyRes.error.message)
      if (lotRes.error) throw new Error(lotRes.error.message)
      if (saleRes.error) throw new Error(saleRes.error.message)
      const varietyMap = new Map((varietyRes.data ?? []).map((r: any) => [String(r.id), String(r.variety_name ?? '-')]))
      const farmerMap = new Map(memberRows.map(m => [m.id, m]))
      const profileMap = new Map(memberRows.filter(m => m.profileId).map(m => [String(m.profileId), m]))
      setFarmers(memberRows)
      setLots((lotRes.data ?? []).map((r: any) => ({ id: String(r.id), varietyId: String(r.variety_id), varietyName: varietyMap.get(String(r.variety_id)) ?? '-', lotNo: String(r.lot_no ?? '-'), balance: Number(r.quantity_balance ?? 0), price: Number(r.sell_price_per_bag ?? 0), createdAt: String(r.created_at ?? '') })))
      setReservations((reserveRes.error ? [] : (reserveRes.data ?? [])).map((r: any) => { const farmerId = String(r.farmer_id ?? ''); const profileId = String(r.profile_id ?? ''); const f = farmerMap.get(farmerId) ?? profileMap.get(profileId); return { id: String(r.id), farmer_id: farmerId || f?.id || '', profile_id: profileId || f?.profileId, farmer_name: String(r.member_name ?? r.farmer_name ?? f?.name ?? '-'), farmer_phone: String(r.member_phone ?? f?.phone ?? ''), variety_id: String(r.variety_id ?? ''), variety_name: String(r.variety_name ?? varietyMap.get(String(r.variety_id ?? '')) ?? '-'), quantity: Number(r.quantity_kg ?? r.quantity ?? 0), status: String(r.status ?? '') } }))
      setSales((saleRes.data ?? []).map((r: any) => ({ id: String(r.id), sale_date: String(r.sale_date ?? ''), farmer_name: String(r.farmer_name ?? r.farmer_id ?? '-'), variety_name: String(r.variety_name ?? r.variety_id ?? '-'), lot_id: String(r.lot_id ?? ''), lot_no: String(r.lot_no ?? ''), quantity: Number(r.quantity ?? 0), total_amount: Number(r.total_amount ?? 0), paid_amount: Number(r.paid_amount ?? 0), refund_amount: Number(r.refund_amount ?? 0), payment_status: String(r.payment_status ?? ''), delivery_status: String(r.delivery_status ?? ''), due_date: String(r.due_date ?? ''), is_returned: Boolean(r.is_returned ?? false), refund_status: String(r.refund_status ?? ''), refund_date: String(r.refund_date ?? '') })))
    } catch (e) { setError(e instanceof Error ? e.message : 'โหลดข้อมูลไม่สำเร็จ') }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])

  const varieties = useMemo(() => Array.from(new Map(lots.map((l) => [l.varietyId, { id: l.varietyId, name: l.varietyName }])).values()), [lots])
  const lotsByVariety = useMemo(() => lots.filter((l) => !form.varietyId || l.varietyId === form.varietyId).sort((a, b) => String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? ''))), [lots, form.varietyId])
  const selectedFarmer = farmers.find((x) => x.id === form.farmerId) ?? (saleSource === 'reservation' ? reservations.find(r => r.id === reservationId) ? { id: form.farmerId, profileId: form.profileId, name: reservations.find(r => r.id === reservationId)!.farmer_name, phone: reservations.find(r => r.id === reservationId)!.farmer_phone } : undefined : undefined)
  const selectedLot = lots.find((x) => x.id === form.lotId)
  const fifoLot = lotsByVariety.find((l) => l.balance > 0)
  const saleLot = mode === 'fifo' ? fifoLot : selectedLot
  const qty = Number(form.quantity || 0)
  const price = Number(form.price || saleLot?.price || 0)
  const total = qty * price
  const paid = form.saleType === 'cash' ? total : Number(form.paidAmount || 0)
  const debt = Math.max(total - paid, 0)
  const paymentStatus = debt <= 0 ? 'paid' : paid > 0 ? 'partial' : 'unpaid'
  const overStock = !!saleLot && qty > saleLot.balance

  const onVariety = (id: string) => { const firstLot = lots.filter((l) => l.varietyId === id && l.balance > 0).sort((a, b) => String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? '')))[0]; setForm((p) => ({ ...p, varietyId: id, lotId: '', price: firstLot?.price ? String(firstLot.price) : p.price })) }
  const onLot = (id: string) => { const lot = lots.find((x) => x.id === id); setForm((p) => ({ ...p, lotId: id, varietyId: lot?.varietyId ?? p.varietyId, price: lot?.price ? String(lot.price) : p.price })) }
  const onReservation = (id: string) => { const r = reservations.find(x => x.id === id); setReservationId(id); if (r) setForm(p => ({ ...p, farmerId: r.farmer_id, profileId: r.profile_id ?? '', varietyId: r.variety_id, quantity: String(r.quantity), lotId: '', price: lots.find(l => l.varietyId === r.variety_id)?.price ? String(lots.find(l => l.varietyId === r.variety_id)?.price) : p.price })) }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError(''); setOk('')
    try {
      if (saleSource === 'reservation' && !reservationId) throw new Error('กรุณาเลือกรายการจอง')
      if (!selectedFarmer) throw new Error('กรุณาเลือกสมาชิก')
      if (!saleLot) throw new Error(mode === 'fifo' ? 'ไม่มี Stock สำหรับพันธุ์นี้' : 'กรุณาเลือก Lot จาก Stock')
      if (qty <= 0) throw new Error('จำนวนต้องมากกว่า 0')
      if (price <= 0) throw new Error('ราคาต้องมากกว่า 0')
      if (qty > saleLot.balance) throw new Error(`จำนวนขายเกิน Stock คงเหลือ (${saleLot.balance} ถุง)`)
      const nextBalance = saleLot.balance - qty
      const row = { sale_date: form.saleDate, farmer_id: selectedFarmer.id, farmer_name: selectedFarmer.name, farmer_phone: selectedFarmer.phone, lot_id: saleLot.id, lot_no: saleLot.lotNo, variety_id: saleLot.varietyId, variety_name: saleLot.varietyName, quantity: qty, sell_price_per_bag: price, total_amount: total, paid_amount: paid, refund_amount: 0, refund_status: null, payment_status: paymentStatus, delivery_status: form.deliveryStatus, due_date: debt > 0 ? form.dueDate : null, is_returned: false, reservation_id: saleSource === 'reservation' ? reservationId : null }
      if (!isSupabaseReady || !supabase) {
        setLots((prev) => prev.map((l) => l.id === saleLot.id ? { ...l, balance: nextBalance } : l))
        setReservations(prev => prev.map(r => r.id === reservationId ? { ...r, status: 'converted' } : r).filter(r => r.status !== 'converted'))
        setSales((prev) => [{ id: `mock-sale-${Date.now()}`, sale_date: row.sale_date, farmer_name: row.farmer_name, variety_name: row.variety_name, lot_id: row.lot_id, lot_no: row.lot_no, quantity: row.quantity, total_amount: row.total_amount, paid_amount: row.paid_amount, refund_amount: 0, payment_status: row.payment_status, delivery_status: row.delivery_status, due_date: row.due_date ?? '', is_returned: false, refund_status: '' }, ...prev])
      } else {
        const { error: saleErr } = await supabase.from('seed_sales').insert(row)
        if (saleErr) throw new Error(`บันทึกขายไม่สำเร็จ: ${saleErr.message}`)
        const { error: stockErr } = await supabase.from('seed_stock_lots').update({ quantity_balance: nextBalance, status: nextBalance <= 0 ? 'sold_out' : 'available' }).eq('id', saleLot.id)
        if (stockErr) throw new Error(`ตัด Stock ไม่สำเร็จ: ${stockErr.message}`)
        if (saleSource === 'reservation' && reservationId) await supabase.from('seed_bookings').update({ status: 'converted' }).eq('id', reservationId)
        await load()
      }
      setOk(`บันทึกขายสำเร็จ${saleSource === 'reservation' ? ' และแปลงใบจองเป็นขายแล้ว' : ''}`)
      setReservationId(''); setForm((p) => ({ ...p, farmerId: '', profileId: '', varietyId: '', lotId: '', quantity: '1', paidAmount: '0', deliveryStatus: 'pending' }))
    } catch (e) { setError(e instanceof Error ? e.message : 'บันทึกขายไม่สำเร็จ') }
    finally { setSaving(false) }
  }

  const returnSale = async (sale: SaleRow) => { if (!confirm(`ยืนยันคืนสินค้า ${sale.quantity} ถุง กลับเข้า Lot ${sale.lot_no}?`)) return; setSaving(true); setError(''); setOk(''); try { const lot = lots.find((l) => l.id === sale.lot_id); if (!lot) throw new Error('ไม่พบ Lot เดิมสำหรับคืนสินค้า'); const nextBalance = lot.balance + sale.quantity; const refundStatus = sale.paid_amount > 0 ? 'refund_required' : 'no_refund'; if (!isSupabaseReady || !supabase || sale.id.startsWith('mock-')) { setLots((prev) => prev.map((l) => l.id === lot.id ? { ...l, balance: nextBalance } : l)); setSales((prev) => prev.map((s) => s.id === sale.id ? { ...s, is_returned: true, delivery_status: 'returned', refund_status: refundStatus, refund_amount: 0, payment_status: s.paid_amount > 0 ? 'refund_required' : 'cancelled' } : s)) } else { const { error: stockErr } = await supabase.from('seed_stock_lots').update({ quantity_balance: nextBalance, status: 'available' }).eq('id', lot.id); if (stockErr) throw new Error(`คืน Stock ไม่สำเร็จ: ${stockErr.message}`); const { error: saleErr } = await supabase.from('seed_sales').update({ is_returned: true, delivery_status: 'returned', refund_status: refundStatus, refund_amount: 0, payment_status: sale.paid_amount > 0 ? 'refund_required' : 'cancelled' }).eq('id', sale.id); if (saleErr) throw new Error(`อัปเดตรายการขายไม่สำเร็จ: ${saleErr.message}`); await load() } setOk(sale.paid_amount > 0 ? `คืนสินค้าแล้ว รอคืนเงิน ${fmt(sale.paid_amount)} บาท` : `คืนสินค้าแล้ว ไม่มียอดเงินต้องคืน`) } catch (e) { setError(e instanceof Error ? e.message : 'คืนสินค้าไม่สำเร็จ') } finally { setSaving(false) } }
  const refundSale = async (sale: SaleRow) => { const remainRefund = Math.max(sale.paid_amount - (sale.refund_amount ?? 0), 0); if (remainRefund <= 0) return; if (!confirm(`ยืนยันคืนเงิน ${fmt(remainRefund)} บาท ให้ ${sale.farmer_name}?`)) return; setSaving(true); setError(''); setOk(''); try { if (!isSupabaseReady || !supabase || sale.id.startsWith('mock-')) setSales((prev) => prev.map((s) => s.id === sale.id ? { ...s, refund_amount: s.paid_amount, refund_status: 'refunded', refund_date: today(), payment_status: 'refunded' } : s)); else { const { error: saleErr } = await supabase.from('seed_sales').update({ refund_amount: sale.paid_amount, refund_status: 'refunded', refund_date: today(), payment_status: 'refunded' }).eq('id', sale.id); if (saleErr) throw new Error(`บันทึกคืนเงินไม่สำเร็จ: ${saleErr.message}`); await load() } setOk(`บันทึกคืนเงินแล้ว ${fmt(remainRefund)} บาท`) } catch (e) { setError(e instanceof Error ? e.message : 'คืนเงินไม่สำเร็จ') } finally { setSaving(false) } }
  const shown = useMemo(() => sales.filter((s) => !search || `${s.farmer_name} ${s.variety_name} ${s.lot_no}`.toLowerCase().includes(search.toLowerCase())), [sales, search])

  return <div className="space-y-5"><div className="flex items-center justify-between flex-wrap gap-3"><div><h1 className="text-xl font-bold text-gray-900">ขายเมล็ดพันธุ์ / Invoice</h1><div className="flex items-center gap-1.5 mt-0.5 text-sm">{isSupabaseReady ? <><Wifi className="w-3.5 h-3.5 text-emerald-600"/><span className="text-emerald-600">Farmers + Reservation + FIFO</span></> : <><WifiOff className="w-3.5 h-3.5 text-amber-500"/><span className="text-amber-600">Mock data</span></>}</div></div><button onClick={() => void load()} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm hover:bg-gray-50"><RefreshCw className="w-4 h-4"/>รีโหลด</button></div>{ok && <div className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 text-sm flex gap-2"><Check className="w-4 h-4"/>{ok}</div>}{error && <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm flex gap-2"><AlertCircle className="w-4 h-4"/>{error}</div>}
    <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-100 p-5 grid grid-cols-1 md:grid-cols-4 gap-4"><div><label className="text-xs font-bold text-gray-600">แหล่งขาย</label><select value={saleSource} onChange={e=>{setSaleSource(e.target.value as any); setReservationId('')}} className="w-full mt-1 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm"><option value="direct">ขายตรง</option><option value="reservation">ขายจากจอง</option></select></div>{saleSource === 'reservation' && <div className="md:col-span-3"><label className="text-xs font-bold text-gray-600">รายการจอง</label><select value={reservationId} onChange={e=>onReservation(e.target.value)} className="w-full mt-1 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm"><option value="">เลือกใบจอง</option>{reservations.map(r=><option key={r.id} value={r.id}>{r.farmer_name} | {r.variety_name} | {r.quantity} ถุง</option>)}</select></div>}
      <div className="md:col-span-2"><label className="text-xs font-bold text-gray-600">สมาชิกเกษตรกร</label><select disabled={saleSource === 'reservation'} required value={form.farmerId} onChange={(e) => setForm((p) => ({ ...p, farmerId: e.target.value, profileId: farmers.find(f => f.id === e.target.value)?.profileId ?? '' }))} className="w-full mt-1 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm disabled:bg-gray-100"><option value="">เลือกสมาชิก</option>{farmers.map((f) => <option key={f.id} value={f.id}>{f.name} | {f.phone} | {f.district ?? '-'}</option>)}</select></div><div><label className="text-xs font-bold text-gray-600">วันที่ขาย</label><input type="date" value={form.saleDate} onChange={(e) => setForm((p) => ({ ...p, saleDate: e.target.value }))} className="w-full mt-1 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm" /></div><div><label className="text-xs font-bold text-gray-600">ตัด Stock</label><select value={mode} onChange={(e) => setMode(e.target.value as any)} className="w-full mt-1 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm"><option value="fifo">FIFO อัตโนมัติ</option><option value="manual">เลือก Lot เอง</option></select></div><div className="md:col-span-2"><label className="text-xs font-bold text-gray-600">พันธุ์</label><select disabled={saleSource === 'reservation'} required value={form.varietyId} onChange={(e) => onVariety(e.target.value)} className="w-full mt-1 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm disabled:bg-gray-100"><option value="">เลือกพันธุ์</option>{varieties.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select></div><div className="md:col-span-2"><label className="text-xs font-bold text-gray-600">Lot {mode === 'fifo' ? '(ระบบเลือกให้)' : '(เลือกเอง)'}</label><select disabled={mode === 'fifo'} required={mode === 'manual'} value={mode === 'fifo' ? fifoLot?.id ?? '' : form.lotId} onChange={(e) => onLot(e.target.value)} className="w-full mt-1 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm disabled:bg-gray-100"><option value="">{mode === 'fifo' ? 'FIFO จะเลือก Lot เก่าสุดที่ยังมีของ' : 'เลือก Lot'}</option>{lotsByVariety.filter((l) => l.balance > 0).map((l) => <option key={l.id} value={l.id}>{l.lotNo} | คงเหลือ {l.balance} ถุง | {l.createdAt?.slice(0,10) || '-'}</option>)}</select></div><div><label className="text-xs font-bold text-gray-600">ประเภทขาย</label><select value={form.saleType} onChange={(e) => setForm((p) => ({ ...p, saleType: e.target.value, paidAmount: e.target.value === 'cash' ? String(total) : p.paidAmount }))} className="w-full mt-1 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm"><option value="credit">ขายเครดิต</option><option value="cash">เงินสด</option></select></div><div><label className="text-xs font-bold text-gray-600">จำนวนถุง</label><input disabled={saleSource === 'reservation'} type="number" min="1" value={form.quantity} onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))} className={`w-full mt-1 border-2 rounded-xl px-3 py-2.5 text-sm disabled:bg-gray-100 ${overStock ? 'border-red-400' : 'border-gray-200'}`} /></div><div><label className="text-xs font-bold text-gray-600">ราคา/ถุง</label><input type="number" min="0" value={form.price || saleLot?.price || ''} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} className="w-full mt-1 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm" /></div><div><label className="text-xs font-bold text-gray-600">ชำระแล้ว</label><input type="number" min="0" value={form.saleType === 'cash' ? total : form.paidAmount} disabled={form.saleType === 'cash'} onChange={(e) => setForm((p) => ({ ...p, paidAmount: e.target.value }))} className="w-full mt-1 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm disabled:bg-gray-100" /></div><div><label className="text-xs font-bold text-gray-600">ครบกำหนด</label><input type="date" value={form.dueDate} disabled={debt <= 0} onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))} className="w-full mt-1 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm disabled:bg-gray-100" /></div><div className="md:col-span-2 bg-gray-50 rounded-2xl p-4 text-sm"><div>Lot ที่ตัด: <b>{saleLot ? saleLot.lotNo : '-'}</b></div><div>Stock คงเหลือ: <b className={overStock ? 'text-red-600' : ''}>{saleLot ? `${saleLot.balance} ถุง` : '-'}</b></div><div>คงเหลือหลังขาย: <b>{saleLot ? fmt(saleLot.balance - qty) : '-'}</b> ถุง</div><div>ยอดขาย: <b>{fmt(total)}</b> บาท</div><div>ยอดค้าง: <b className="text-red-600">{fmt(debt)}</b> บาท</div></div><button disabled={saving || overStock} className="md:col-span-4 bg-emerald-600 disabled:bg-gray-300 text-white rounded-xl py-3 font-bold flex justify-center gap-2"><FileText className="w-5 h-5" />{saving ? 'กำลังบันทึก...' : saleSource === 'reservation' ? 'ขายจากใบจอง / แปลงเป็นขาย' : 'บันทึกขายตรง'}</button></form>
    <div className="flex gap-2"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="ค้นหารายการขาย" className="w-full pl-9 pr-3 py-2 border-2 border-gray-200 rounded-xl text-sm"/></div></div><div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-gray-50 border-b text-xs text-gray-500"><th className="text-left p-3">วันที่</th><th className="text-left p-3">สมาชิก</th><th className="text-left p-3">พันธุ์</th><th className="text-left p-3">Lot</th><th className="text-right p-3">ยอดขาย</th><th className="text-right p-3">จ่าย</th><th className="text-right p-3">คืนเงิน</th><th className="text-center p-3">สถานะ</th><th className="text-center p-3">Action</th></tr></thead><tbody>{loading ? <tr><td colSpan={9} className="p-6 text-center text-gray-400">กำลังโหลด...</td></tr> : shown.length === 0 ? <tr><td colSpan={9} className="p-6 text-center text-gray-400">ยังไม่มีรายการขาย</td></tr> : shown.map((s)=>{ const needRefund = s.is_returned && s.paid_amount > (s.refund_amount ?? 0); return <tr key={s.id} className="border-t"><td className="p-3">{s.sale_date}</td><td className="p-3 font-medium">{s.farmer_name}</td><td className="p-3">{s.variety_name}</td><td className="p-3">{s.lot_no}</td><td className="p-3 text-right">{fmt(s.total_amount)}</td><td className="p-3 text-right">{fmt(s.paid_amount)}</td><td className="p-3 text-right">{fmt(s.refund_amount ?? 0)}</td><td className="p-3 text-center">{s.refund_status === 'refunded' ? <span className="text-emerald-600 font-semibold">คืนเงินแล้ว</span> : needRefund ? <span className="text-orange-600 font-semibold">รอคืนเงิน</span> : s.is_returned ? <span className="text-red-600 font-semibold">คืนสินค้าแล้ว</span> : s.payment_status}</td><td className="p-3 text-center"><div className="flex justify-center gap-2 whitespace-nowrap">{!s.is_returned && <button disabled={saving} onClick={() => void returnSale(s)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-600 text-white text-xs font-semibold disabled:bg-gray-300"><RotateCcw className="w-3 h-3"/>คืนสินค้า</button>}{needRefund && <button disabled={saving} onClick={() => void refundSale(s)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs font-semibold disabled:bg-gray-300"><Banknote className="w-3 h-3"/>คืนเงิน</button>}{s.is_returned && !needRefund && <span className="text-gray-300">-</span>}</div></td></tr>})}</tbody></table></div></div>
}
