import React, { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Check, FileText, RefreshCw, Search, Wifi, WifiOff } from 'lucide-react'
import { isSupabaseReady, supabase } from '../../lib/supabase'

type Farmer = { id: string; name: string; phone: string }
type Variety = { id: string; name: string; price: number }
type SaleRow = { id: string; sale_date: string; farmer_name: string; variety_name: string; quantity: number; total_amount: number; paid_amount: number; payment_status: string; delivery_status: string; due_date: string }

const MOCK_FARMERS: Farmer[] = [
  { id: 'mock-f1', name: 'สมชาย ใจดี', phone: '0812345678' },
  { id: 'mock-f2', name: 'นภา ฟ้าใส', phone: '0898765432' },
]
const MOCK_VARIETIES: Variety[] = [
  { id: 'mock-v1', name: 'ข้าวโพดพันธุ์ A', price: 850 },
  { id: 'mock-v2', name: 'ข้าวโพดพันธุ์ B', price: 900 },
]

function today() { return new Date().toISOString().slice(0, 10) }
function addDays(days: number) { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10) }
function fmt(n: number) { return n.toLocaleString('th-TH', { maximumFractionDigits: 0 }) }

export default function AdminSeedInvoice() {
  const [farmers, setFarmers] = useState<Farmer[]>(MOCK_FARMERS)
  const [varieties, setVarieties] = useState<Variety[]>(MOCK_VARIETIES)
  const [sales, setSales] = useState<SaleRow[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [ok, setOk] = useState('')
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ farmerId: '', varietyId: '', quantity: '1', price: '', saleDate: today(), saleType: 'credit', paidAmount: '0', dueDate: addDays(15), deliveryStatus: 'pending' })

  const load = async () => {
    setLoading(true); setError('')
    try {
      if (!isSupabaseReady || !supabase) {
        setFarmers(MOCK_FARMERS); setVarieties(MOCK_VARIETIES); setSales([]); return
      }
      const [farmerRes, varietyRes, saleRes] = await Promise.all([
        supabase.from('profiles').select('id,full_name,phone').in('role', ['farmer', 'member']).order('full_name'),
        supabase.from('seed_varieties').select('id,variety_name,sell_price_per_bag,price').order('variety_name'),
        supabase.from('seed_sales').select('*').order('sale_date', { ascending: false }).limit(30),
      ])
      if (farmerRes.error) throw new Error(farmerRes.error.message)
      if (varietyRes.error) throw new Error(varietyRes.error.message)
      if (saleRes.error) throw new Error(saleRes.error.message)
      setFarmers((farmerRes.data ?? []).map((r: any) => ({ id: String(r.id), name: String(r.full_name ?? '-'), phone: String(r.phone ?? '') })))
      setVarieties((varietyRes.data ?? []).map((r: any) => ({ id: String(r.id), name: String(r.variety_name ?? '-'), price: Number(r.sell_price_per_bag ?? r.price ?? 0) })))
      setSales((saleRes.data ?? []).map((r: any) => ({ id: String(r.id), sale_date: String(r.sale_date ?? ''), farmer_name: String(r.farmer_name ?? r.farmer_id ?? '-'), variety_name: String(r.variety_name ?? r.variety_id ?? '-'), quantity: Number(r.quantity ?? 0), total_amount: Number(r.total_amount ?? 0), paid_amount: Number(r.paid_amount ?? 0), payment_status: String(r.payment_status ?? ''), delivery_status: String(r.delivery_status ?? ''), due_date: String(r.due_date ?? '') })))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดข้อมูลไม่สำเร็จ')
    } finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  const selectedFarmer = farmers.find((x) => x.id === form.farmerId)
  const selectedVariety = varieties.find((x) => x.id === form.varietyId)
  const qty = Number(form.quantity || 0)
  const price = Number(form.price || selectedVariety?.price || 0)
  const total = qty * price
  const paid = form.saleType === 'cash' ? total : Number(form.paidAmount || 0)
  const debt = Math.max(total - paid, 0)
  const paymentStatus = debt <= 0 ? 'paid' : paid > 0 ? 'partial' : 'unpaid'

  const onVariety = (id: string) => {
    const v = varieties.find((x) => x.id === id)
    setForm((p) => ({ ...p, varietyId: id, price: v?.price ? String(v.price) : p.price }))
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError(''); setOk('')
    try {
      if (!selectedFarmer) throw new Error('กรุณาเลือกสมาชิก')
      if (!selectedVariety) throw new Error('กรุณาเลือกพันธุ์')
      if (qty <= 0) throw new Error('จำนวนต้องมากกว่า 0')
      if (price <= 0) throw new Error('ราคาต้องมากกว่า 0')
      const row = { sale_date: form.saleDate, farmer_id: selectedFarmer.id, farmer_name: selectedFarmer.name, farmer_phone: selectedFarmer.phone, variety_id: selectedVariety.id, variety_name: selectedVariety.name, quantity: qty, sell_price_per_bag: price, total_amount: total, paid_amount: paid, payment_status: paymentStatus, delivery_status: form.deliveryStatus, due_date: debt > 0 ? form.dueDate : null }
      if (!isSupabaseReady || !supabase) {
        setSales((prev) => [{ id: `mock-sale-${Date.now()}`, sale_date: row.sale_date, farmer_name: row.farmer_name, variety_name: row.variety_name, quantity: row.quantity, total_amount: row.total_amount, paid_amount: row.paid_amount, payment_status: row.payment_status, delivery_status: row.delivery_status, due_date: row.due_date ?? '' }, ...prev])
      } else {
        const { error: dbError } = await supabase.from('seed_sales').insert(row)
        if (dbError) throw new Error(dbError.message)
        await load()
      }
      setOk('บันทึกขายสำเร็จ และสร้างลูกหนี้อัตโนมัติแล้ว')
      setForm((p) => ({ ...p, quantity: '1', paidAmount: '0', deliveryStatus: 'pending' }))
    } catch (e) { setError(e instanceof Error ? e.message : 'บันทึกขายไม่สำเร็จ') }
    finally { setSaving(false) }
  }

  const shown = useMemo(() => sales.filter((s) => !search || `${s.farmer_name} ${s.variety_name}`.toLowerCase().includes(search.toLowerCase())), [sales, search])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-xl font-bold text-gray-900">ขายเมล็ดพันธุ์ / Invoice</h1><div className="flex items-center gap-1.5 mt-0.5 text-sm">{isSupabaseReady ? <><Wifi className="w-3.5 h-3.5 text-emerald-600"/><span className="text-emerald-600">Supabase: seed_sales</span></> : <><WifiOff className="w-3.5 h-3.5 text-amber-500"/><span className="text-amber-600">Mock data</span></>}</div></div>
        <button onClick={() => void load()} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm hover:bg-gray-50"><RefreshCw className="w-4 h-4"/>รีโหลด</button>
      </div>
      {ok && <div className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 text-sm flex gap-2"><Check className="w-4 h-4"/>{ok}</div>}
      {error && <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm flex gap-2"><AlertCircle className="w-4 h-4"/>{error}</div>}

      <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-100 p-5 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2"><label className="text-xs font-bold text-gray-600">สมาชิก</label><select required value={form.farmerId} onChange={(e) => setForm((p) => ({ ...p, farmerId: e.target.value }))} className="w-full mt-1 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm"><option value="">เลือกสมาชิก</option>{farmers.map((f) => <option key={f.id} value={f.id}>{f.name} | {f.phone}</option>)}</select></div>
        <div><label className="text-xs font-bold text-gray-600">วันที่ขาย</label><input type="date" value={form.saleDate} onChange={(e) => setForm((p) => ({ ...p, saleDate: e.target.value }))} className="w-full mt-1 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm" /></div>
        <div><label className="text-xs font-bold text-gray-600">ประเภทขาย</label><select value={form.saleType} onChange={(e) => setForm((p) => ({ ...p, saleType: e.target.value, paidAmount: e.target.value === 'cash' ? String(total) : p.paidAmount }))} className="w-full mt-1 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm"><option value="credit">ขายเครดิต</option><option value="cash">เงินสด</option></select></div>
        <div className="md:col-span-2"><label className="text-xs font-bold text-gray-600">พันธุ์</label><select required value={form.varietyId} onChange={(e) => onVariety(e.target.value)} className="w-full mt-1 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm"><option value="">เลือกพันธุ์</option>{varieties.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select></div>
        <div><label className="text-xs font-bold text-gray-600">จำนวนถุง</label><input type="number" min="1" value={form.quantity} onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))} className="w-full mt-1 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm" /></div>
        <div><label className="text-xs font-bold text-gray-600">ราคา/ถุง</label><input type="number" min="0" value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} className="w-full mt-1 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm" /></div>
        <div><label className="text-xs font-bold text-gray-600">ชำระแล้ว</label><input type="number" min="0" value={form.saleType === 'cash' ? total : form.paidAmount} disabled={form.saleType === 'cash'} onChange={(e) => setForm((p) => ({ ...p, paidAmount: e.target.value }))} className="w-full mt-1 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm disabled:bg-gray-100" /></div>
        <div><label className="text-xs font-bold text-gray-600">ครบกำหนด</label><input type="date" value={form.dueDate} disabled={debt <= 0} onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))} className="w-full mt-1 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm disabled:bg-gray-100" /></div>
        <div><label className="text-xs font-bold text-gray-600">ส่งมอบ</label><select value={form.deliveryStatus} onChange={(e) => setForm((p) => ({ ...p, deliveryStatus: e.target.value }))} className="w-full mt-1 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm"><option value="pending">ค้างส่ง</option><option value="partial">ส่งบางส่วน</option><option value="delivered">ส่งครบ</option></select></div>
        <div className="md:col-span-2 bg-gray-50 rounded-2xl p-4 text-sm"><div>ยอดขาย: <b>{fmt(total)}</b> บาท</div><div>ยอดชำระ: <b className="text-emerald-700">{fmt(paid)}</b> บาท</div><div>ยอดค้าง: <b className="text-red-600">{fmt(debt)}</b> บาท</div></div>
        <button disabled={saving} className="md:col-span-4 bg-emerald-600 disabled:bg-gray-300 text-white rounded-xl py-3 font-bold flex justify-center gap-2"><FileText className="w-5 h-5" />{saving ? 'กำลังบันทึก...' : 'บันทึกขาย / สร้าง Invoice'}</button>
      </form>

      <div className="flex gap-2"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="ค้นหารายการขาย" className="w-full pl-9 pr-3 py-2 border-2 border-gray-200 rounded-xl text-sm"/></div></div>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-gray-50 border-b text-xs text-gray-500"><th className="text-left p-3">วันที่</th><th className="text-left p-3">สมาชิก</th><th className="text-left p-3">พันธุ์</th><th className="text-right p-3">ยอดขาย</th><th className="text-right p-3">ชำระ</th><th className="text-center p-3">สถานะเงิน</th><th className="text-center p-3">ส่งมอบ</th><th className="text-center p-3">ครบกำหนด</th></tr></thead><tbody>{loading ? <tr><td colSpan={8} className="p-6 text-center text-gray-400">กำลังโหลด...</td></tr> : shown.length === 0 ? <tr><td colSpan={8} className="p-6 text-center text-gray-400">ยังไม่มีรายการขาย</td></tr> : shown.map((s)=><tr key={s.id} className="border-t"><td className="p-3">{s.sale_date}</td><td className="p-3 font-medium">{s.farmer_name}</td><td className="p-3">{s.variety_name}</td><td className="p-3 text-right">{fmt(s.total_amount)}</td><td className="p-3 text-right">{fmt(s.paid_amount)}</td><td className="p-3 text-center">{s.payment_status}</td><td className="p-3 text-center">{s.delivery_status}</td><td className="p-3 text-center">{s.due_date || '-'}</td></tr>)}</tbody></table></div>
    </div>
  )
}
