import React, { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Check, FileText, RefreshCw, RotateCcw, Search, Wifi, WifiOff } from 'lucide-react'
import { isSupabaseReady, supabase } from '../../lib/supabase'

type Farmer = { id: string; name: string; phone: string }
type Lot = { id: string; varietyId: string; varietyName: string; lotNo: string; balance: number; price: number; createdAt?: string }
type SaleRow = { id: string; sale_date: string; farmer_name: string; variety_name: string; lot_id: string; lot_no: string; quantity: number; total_amount: number; paid_amount: number; payment_status: string; delivery_status: string; due_date: string; is_returned?: boolean }

const MOCK_FARMERS: Farmer[] = [
  { id: 'mock-f1', name: 'สมชาย ใจดี', phone: '0812345678' },
  { id: 'mock-f2', name: 'นภา ฟ้าใส', phone: '0898765432' },
]
const MOCK_LOTS: Lot[] = [
  { id: 'mock-lot-1', varietyId: 'mock-v1', varietyName: 'ข้าวโพดพันธุ์ A', lotNo: 'LOT-A001', balance: 120, price: 850, createdAt: '2026-04-01' },
  { id: 'mock-lot-2', varietyId: 'mock-v1', varietyName: 'ข้าวโพดพันธุ์ A', lotNo: 'LOT-A002', balance: 50, price: 860, createdAt: '2026-04-10' },
  { id: 'mock-lot-3', varietyId: 'mock-v2', varietyName: 'ข้าวโพดพันธุ์ B', lotNo: 'LOT-B001', balance: 80, price: 900, createdAt: '2026-04-05' },
]

function today() { return new Date().toISOString().slice(0, 10) }
function addDays(days: number) { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10) }
function fmt(n: number) { return n.toLocaleString('th-TH', { maximumFractionDigits: 0 }) }

export default function AdminSeedInvoice() {
  const [farmers, setFarmers] = useState<Farmer[]>(MOCK_FARMERS)
  const [lots, setLots] = useState<Lot[]>(MOCK_LOTS)
  const [sales, setSales] = useState<SaleRow[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [ok, setOk] = useState('')
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [mode, setMode] = useState<'fifo' | 'manual'>('fifo')
  const [form, setForm] = useState({ farmerId: '', varietyId: '', lotId: '', quantity: '1', price: '', saleDate: today(), saleType: 'credit', paidAmount: '0', dueDate: addDays(15), deliveryStatus: 'pending' })

  const load = async () => {
    setLoading(true); setError('')
    try {
      if (!isSupabaseReady || !supabase) {
        setFarmers(MOCK_FARMERS); setLots(MOCK_LOTS); setSales([]); return
      }
      const [farmerRes, varietyRes, lotRes, saleRes] = await Promise.all([
        supabase.from('profiles').select('id,full_name,phone').in('role', ['farmer', 'member']).order('full_name'),
        supabase.from('seed_varieties').select('id,variety_name').order('variety_name'),
        supabase.from('seed_stock_lots').select('id,variety_id,lot_no,quantity_balance,sell_price_per_bag,created_at').gt('quantity_balance', 0).order('created_at', { ascending: true }),
        supabase.from('seed_sales').select('*').order('sale_date', { ascending: false }).limit(30),
      ])
      if (farmerRes.error) throw new Error(farmerRes.error.message)
      if (varietyRes.error) throw new Error(varietyRes.error.message)
      if (lotRes.error) throw new Error(lotRes.error.message)
      if (saleRes.error) throw new Error(saleRes.error.message)
      const varietyMap = new Map((varietyRes.data ?? []).map((r: any) => [String(r.id), String(r.variety_name ?? '-')]))
      setFarmers((farmerRes.data ?? []).map((r: any) => ({ id: String(r.id), name: String(r.full_name ?? '-'), phone: String(r.phone ?? '') })))
      setLots((lotRes.data ?? []).map((r: any) => ({ id: String(r.id), varietyId: String(r.variety_id), varietyName: varietyMap.get(String(r.variety_id)) ?? '-', lotNo: String(r.lot_no ?? '-'), balance: Number(r.quantity_balance ?? 0), price: Number(r.sell_price_per_bag ?? 0), createdAt: String(r.created_at ?? '') })))
      setSales((saleRes.data ?? []).map((r: any) => ({ id: String(r.id), sale_date: String(r.sale_date ?? ''), farmer_name: String(r.farmer_name ?? r.farmer_id ?? '-'), variety_name: String(r.variety_name ?? r.variety_id ?? '-'), lot_id: String(r.lot_id ?? ''), lot_no: String(r.lot_no ?? ''), quantity: Number(r.quantity ?? 0), total_amount: Number(r.total_amount ?? 0), paid_amount: Number(r.paid_amount ?? 0), payment_status: String(r.payment_status ?? ''), delivery_status: String(r.delivery_status ?? ''), due_date: String(r.due_date ?? ''), is_returned: Boolean(r.is_returned ?? false) })))
    } catch (e) { setError(e instanceof Error ? e.message : 'โหลดข้อมูลไม่สำเร็จ') }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  const varieties = useMemo(() => Array.from(new Map(lots.map((l) => [l.varietyId, { id: l.varietyId, name: l.varietyName }])).values()), [lots])
  const lotsByVariety = useMemo(() => lots.filter((l) => !form.varietyId || l.varietyId === form.varietyId).sort((a, b) => String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? ''))), [lots, form.varietyId])
  const selectedFarmer = farmers.find((x) => x.id === form.farmerId)
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

  const onVariety = (id: string) => {
    const firstLot = lots.filter((l) => l.varietyId === id && l.balance > 0).sort((a, b) => String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? '')))[0]
    setForm((p) => ({ ...p, varietyId: id, lotId: '', price: firstLot?.price ? String(firstLot.price) : p.price }))
  }
  const onLot = (id: string) => {
    const lot = lots.find((x) => x.id === id)
    setForm((p) => ({ ...p, lotId: id, varietyId: lot?.varietyId ?? p.varietyId, price: lot?.price ? String(lot.price) : p.price }))
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError(''); setOk('')
    try {
      if (!selectedFarmer) throw new Error('กรุณาเลือกสมาชิก')
      if (!saleLot) throw new Error(mode === 'fifo' ? 'ไม่มี Stock สำหรับพันธุ์นี้' : 'กรุณาเลือก Lot จาก Stock')
      if (qty <= 0) throw new Error('จำนวนต้องมากกว่า 0')
      if (price <= 0) throw new Error('ราคาต้องมากกว่า 0')
      if (qty > saleLot.balance) throw new Error(`จำนวนขายเกิน Stock คงเหลือ (${saleLot.balance} ถุง)`)
      const nextBalance = saleLot.balance - qty
      const row = { sale_date: form.saleDate, farmer_id: selectedFarmer.id, farmer_name: selectedFarmer.name, farmer_phone: selectedFarmer.phone, lot_id: saleLot.id, lot_no: saleLot.lotNo, variety_id: saleLot.varietyId, variety_name: saleLot.varietyName, quantity: qty, sell_price_per_bag: price, total_amount: total, paid_amount: paid, payment_status: paymentStatus, delivery_status: form.deliveryStatus, due_date: debt > 0 ? form.dueDate : null, is_returned: false }
      if (!isSupabaseReady || !supabase) {
        setLots((prev) => prev.map((l) => l.id === saleLot.id ? { ...l, balance: nextBalance } : l))
        setSales((prev) => [{ id: `mock-sale-${Date.now()}`, sale_date: row.sale_date, farmer_name: row.farmer_name, variety_name: row.variety_name, lot_id: row.lot_id, lot_no: row.lot_no, quantity: row.quantity, total_amount: row.total_amount, paid_amount: row.paid_amount, payment_status: row.payment_status, delivery_status: row.delivery_status, due_date: row.due_date ?? '', is_returned: false }, ...prev])
      } else {
        const { error: saleErr } = await supabase.from('seed_sales').insert(row)
        if (saleErr) throw new Error(`บันทึกขายไม่สำเร็จ: ${saleErr.message}`)
        const { error: stockErr } = await supabase.from('seed_stock_lots').update({ quantity_balance: nextBalance, status: nextBalance <= 0 ? 'sold_out' : 'available' }).eq('id', saleLot.id)
        if (stockErr) throw new Error(`ตัด Stock ไม่สำเร็จ: ${stockErr.message}`)
        await load()
      }
      setOk(`บันทึกขายสำเร็จ ตัด Stock แบบ ${mode === 'fifo' ? 'FIFO' : 'Manual'} จาก Lot ${saleLot.lotNo}`)
      setForm((p) => ({ ...p, lotId: '', quantity: '1', paidAmount: '0', deliveryStatus: 'pending' }))
    } catch (e) { setError(e instanceof Error ? e.message : 'บันทึกขายไม่สำเร็จ') }
    finally { setSaving(false) }
  }

  const returnSale = async (sale: SaleRow) => {
    if (!confirm(`ยืนยันคืนสินค้า ${sale.quantity} ถุง กลับเข้า Lot ${sale.lot_no}?`)) return
    setSaving(true); setError(''); setOk('')
    try {
      const lot = lots.find((l) => l.id === sale.lot_id)
      if (!lot) throw new Error('ไม่พบ Lot เดิมสำหรับคืนสินค้า')
      const nextBalance = lot.balance + sale.quantity
      if (!isSupabaseReady || !supabase || sale.id.startsWith('mock-')) {
        setLots((prev) => prev.map((l) => l.id === lot.id ? { ...l, balance: nextBalance } : l))
        setSales((prev) => prev.map((s) => s.id === sale.id ? { ...s, is_returned: true, delivery_status: 'returned', payment_status: s.paid_amount > 0 ? 'refund_required' : 'cancelled' } : s))
      } else {
        const { error: stockErr } = await supabase.from('seed_stock_lots').update({ quantity_balance: nextBalance, status: 'available' }).eq('id', lot.id)
        if (stockErr) throw new Error(`คืน Stock ไม่สำเร็จ: ${stockErr.message}`)
        const { error: saleErr } = await supabase.from('seed_sales').update({ is_returned: true, delivery_status: 'returned', payment_status: sale.paid_amount > 0 ? 'refund_required' : 'cancelled' }).eq('id', sale.id)
        if (saleErr) throw new Error(`อัปเดตรายการขายไม่สำเร็จ: ${saleErr.message}`)
        await load()
      }
      setOk(`คืนสินค้าแล้ว และเพิ่ม Stock กลับเข้า Lot ${sale.lot_no}`)
    } catch (e) { setError(e instanceof Error ? e.message : 'คืนสินค้าไม่สำเร็จ') }
    finally { setSaving(false) }
  }

  const shown = useMemo(() => sales.filter((s) => !search || `${s.farmer_name} ${s.variety_name} ${s.lot_no}`.toLowerCase().includes(search.toLowerCase())), [sales, search])

  return <div className="space-y-5">
    <div className="flex items-center justify-between flex-wrap gap-3"><div><h1 className="text-xl font-bold text-gray-900">ขายเมล็ดพันธุ์ / Invoice</h1><div className="flex items-center gap-1.5 mt-0.5 text-sm">{isSupabaseReady ? <><Wifi className="w-3.5 h-3.5 text-emerald-600"/><span className="text-emerald-600">FIFO + Return + Stock</span></> : <><WifiOff className="w-3.5 h-3.5 text-amber-500"/><span className="text-amber-600">Mock data</span></>}</div></div><button onClick={() => void load()} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm hover:bg-gray-50"><RefreshCw className="w-4 h-4"/>รีโหลด</button></div>
    {ok && <div className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 text-sm flex gap-2"><Check className="w-4 h-4"/>{ok}</div>}
    {error && <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm flex gap-2"><AlertCircle className="w-4 h-4"/>{error}</div>}
    <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-100 p-5 grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="md:col-span-2"><label className="text-xs font-bold text-gray-600">สมาชิก</label><select required value={form.farmerId} onChange={(e) => setForm((p) => ({ ...p, farmerId: e.target.value }))} className="w-full mt-1 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm"><option value="">เลือกสมาชิก</option>{farmers.map((f) => <option key={f.id} value={f.id}>{f.name} | {f.phone}</option>)}</select></div>
      <div><label className="text-xs font-bold text-gray-600">วันที่ขาย</label><input type="date" value={form.saleDate} onChange={(e) => setForm((p) => ({ ...p, saleDate: e.target.value }))} className="w-full mt-1 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm" /></div>
      <div><label className="text-xs font-bold text-gray-600">ตัด Stock</label><select value={mode} onChange={(e) => setMode(e.target.value as typeof mode)} className="w-full mt-1 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm"><option value="fifo">FIFO อัตโนมัติ</option><option value="manual">เลือก Lot เอง</option></select></div>
      <div className="md:col-span-2"><label className="text-xs font-bold text-gray-600">พันธุ์</label><select required value={form.varietyId} onChange={(e) => onVariety(e.target.value)} className="w-full mt-1 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm"><option value="">เลือกพันธุ์</option>{varieties.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select></div>
      <div className="md:col-span-2"><label className="text-xs font-bold text-gray-600">Lot {mode === 'fifo' ? '(ระบบเลือกให้)' : '(เลือกเอง)'}</label><select disabled={mode === 'fifo'} required={mode === 'manual'} value={mode === 'fifo' ? fifoLot?.id ?? '' : form.lotId} onChange={(e) => onLot(e.target.value)} className="w-full mt-1 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm disabled:bg-gray-100"><option value="">{mode === 'fifo' ? 'FIFO จะเลือก Lot เก่าสุดที่ยังมีของ' : 'เลือก Lot'}</option>{lotsByVariety.filter((l) => l.balance > 0).map((l) => <option key={l.id} value={l.id}>{l.lotNo} | คงเหลือ {l.balance} ถุง | {l.createdAt?.slice(0,10) || '-'}</option>)}</select></div>
      <div><label className="text-xs font-bold text-gray-600">ประเภทขาย</label><select value={form.saleType} onChange={(e) => setForm((p) => ({ ...p, saleType: e.target.value, paidAmount: e.target.value === 'cash' ? String(total) : p.paidAmount }))} className="w-full mt-1 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm"><option value="credit">ขายเครดิต</option><option value="cash">เงินสด</option></select></div>
      <div><label className="text-xs font-bold text-gray-600">จำนวนถุง</label><input type="number" min="1" value={form.quantity} onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))} className={`w-full mt-1 border-2 rounded-xl px-3 py-2.5 text-sm ${overStock ? 'border-red-400' : 'border-gray-200'}`} /></div>
      <div><label className="text-xs font-bold text-gray-600">ราคา/ถุง</label><input type="number" min="0" value={form.price || saleLot?.price || ''} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} className="w-full mt-1 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm" /></div>
      <div><label className="text-xs font-bold text-gray-600">ชำระแล้ว</label><input type="number" min="0" value={form.saleType === 'cash' ? total : form.paidAmount} disabled={form.saleType === 'cash'} onChange={(e) => setForm((p) => ({ ...p, paidAmount: e.target.value }))} className="w-full mt-1 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm disabled:bg-gray-100" /></div>
      <div><label className="text-xs font-bold text-gray-600">ครบกำหนด</label><input type="date" value={form.dueDate} disabled={debt <= 0} onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))} className="w-full mt-1 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm disabled:bg-gray-100" /></div>
      <div className="md:col-span-2 bg-gray-50 rounded-2xl p-4 text-sm"><div>Lot ที่ตัด: <b>{saleLot ? saleLot.lotNo : '-'}</b></div><div>Stock คงเหลือ: <b className={overStock ? 'text-red-600' : ''}>{saleLot ? `${saleLot.balance} ถุง` : '-'}</b></div><div>คงเหลือหลังขาย: <b>{saleLot ? fmt(saleLot.balance - qty) : '-'}</b> ถุง</div><div>ยอดขาย: <b>{fmt(total)}</b> บาท</div><div>ยอดค้าง: <b className="text-red-600">{fmt(debt)}</b> บาท</div></div>
      <button disabled={saving || overStock} className="md:col-span-4 bg-emerald-600 disabled:bg-gray-300 text-white rounded-xl py-3 font-bold flex justify-center gap-2"><FileText className="w-5 h-5" />{saving ? 'กำลังบันทึก...' : `บันทึกขาย / ตัด Stock ${mode === 'fifo' ? 'FIFO' : 'Manual'}`}</button>
    </form>
    <div className="flex gap-2"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="ค้นหารายการขาย" className="w-full pl-9 pr-3 py-2 border-2 border-gray-200 rounded-xl text-sm"/></div></div>
    <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-gray-50 border-b text-xs text-gray-500"><th className="text-left p-3">วันที่</th><th className="text-left p-3">สมาชิก</th><th className="text-left p-3">พันธุ์</th><th className="text-left p-3">Lot</th><th className="text-right p-3">จำนวน</th><th className="text-right p-3">ยอดขาย</th><th className="text-center p-3">สถานะ</th><th className="text-center p-3">Action</th></tr></thead><tbody>{loading ? <tr><td colSpan={8} className="p-6 text-center text-gray-400">กำลังโหลด...</td></tr> : shown.length === 0 ? <tr><td colSpan={8} className="p-6 text-center text-gray-400">ยังไม่มีรายการขาย</td></tr> : shown.map((s)=><tr key={s.id} className="border-t"><td className="p-3">{s.sale_date}</td><td className="p-3 font-medium">{s.farmer_name}</td><td className="p-3">{s.variety_name}</td><td className="p-3">{s.lot_no}</td><td className="p-3 text-right">{fmt(s.quantity)}</td><td className="p-3 text-right">{fmt(s.total_amount)}</td><td className="p-3 text-center">{s.is_returned ? <span className="text-red-600 font-semibold">คืนแล้ว</span> : s.payment_status}</td><td className="p-3 text-center">{!s.is_returned ? <button disabled={saving} onClick={() => void returnSale(s)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-600 text-white text-xs font-semibold disabled:bg-gray-300"><RotateCcw className="w-3 h-3"/>คืนสินค้า</button> : <span className="text-gray-300">-</span>}</td></tr>)}</tbody></table></div>
  </div>
}
