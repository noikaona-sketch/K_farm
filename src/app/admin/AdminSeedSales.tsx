import React, { useEffect, useMemo, useState } from 'react'
import { requireSupabase } from '../../lib/supabase'

type Farmer = { id: string; name: string; phone: string; national_id: string }
type Supplier = { id: string; supplier_name: string }
type Variety = { id: string; supplier_id: string; variety_name: string }

type SeedStockLot = {
  id: string
  supplier_id: string
  supplier_name: string
  variety_id: string
  variety_name: string
  lot_no: string
  quantity_in: number
  quantity_balance: number
  bag_weight_kg: number
  sell_price_per_bag: number
  status: string
  created_at: string
}

type SeedSale = {
  id: string
  sale_date: string
  farmer_id: string
  farmer_name: string
  supplier_name: string
  variety_name: string
  lot_no: string
  quantity: number
  sell_price_per_bag: number
  total_amount: number
}

type Reservation = {
  id: string
  farmer_id: string
  supplier_id: string
  variety_id: string
  lot_id: string
  lot_no: string
  quantity: number
  status: string
}

type FormState = {
  sale_mode: 'direct' | 'reservation'
  farmer_id: string; supplier_id: string; variety_id: string; lot_id: string; quantity: string
  bag_weight_kg: string; sell_price_per_bag: string; sale_date: string; payment_status: 'unpaid' | 'partial' | 'paid'
  reservation_id: string
}

export default function AdminSeedSales() {
  const [lots, setLots] = useState<SeedStockLot[]>([])
  const [sales, setSales] = useState<SeedSale[]>([])
  const [farmers, setFarmers] = useState<Farmer[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [varieties, setVarieties] = useState<Variety[]>([])
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [farmerSearch, setFarmerSearch] = useState('')
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [form, setForm] = useState<FormState>({ sale_mode: 'direct', farmer_id: '', supplier_id: '', variety_id: '', lot_id: '', quantity: '', bag_weight_kg: '', sell_price_per_bag: '', sale_date: new Date().toISOString().slice(0, 10), payment_status: 'unpaid', reservation_id: '' })

  const loadData = async () => {
    const db = requireSupabase()
    const [profileRes, farmerRes, supRes, varRes, lotRes, salesRes, reserveRes] = await Promise.all([
      db.from('profiles').select('id,full_name,phone,id_card').order('full_name'),
      db.from('farmers').select('profile_id'),
      db.from('seed_suppliers').select('id,supplier_name').eq('active_status', true).order('supplier_name'),
      db.from('seed_varieties').select('id,supplier_id,variety_name').eq('active_status', true).order('variety_name'),
      db.from('seed_stock_lots').select('id,supplier_id,variety_id,lot_no,quantity_in,quantity_balance,bag_weight_kg,sell_price_per_bag,status,created_at').gt('quantity_balance', 0).eq('status', 'available'),
      db.from('seed_sales').select('*').order('created_at', { ascending: false }),
      db.from('seed_reservations').select('id,farmer_id,supplier_id,variety_id,lot_id,lot_no,quantity,status').in('status', ['approved', 'reserved']).order('created_at', { ascending: false }),
    ])

    if (profileRes.error || farmerRes.error || supRes.error || varRes.error || lotRes.error || salesRes.error || reserveRes.error) {
      throw new Error([profileRes.error?.message, farmerRes.error?.message, supRes.error?.message, varRes.error?.message, lotRes.error?.message, salesRes.error?.message, reserveRes.error?.message].filter(Boolean).join(' | '))
    }

    const farmerSet = new Set((farmerRes.data ?? []).map((f: { profile_id: string | null }) => String(f.profile_id ?? '')))
    setFarmers((profileRes.data ?? [])
      .filter((p: { id: string }) => farmerSet.has(p.id) || !farmerSet.has(p.id))
      .map((p: { id: string; full_name: string | null; phone: string | null; id_card: string | null }) => ({ id: p.id, name: p.full_name ?? '-', phone: p.phone ?? '', national_id: p.id_card ?? '' })))

    const supplierRows = (supRes.data ?? []) as Supplier[]
    const varietyRows = (varRes.data ?? []) as Variety[]
    setSuppliers(supplierRows)
    setVarieties(varietyRows)

    const supplierMap = new Map(supplierRows.map((s) => [s.id, s.supplier_name]))
    const varietyMap = new Map(varietyRows.map((v) => [v.id, v.variety_name]))
    const farmerMap = new Map((profileRes.data ?? []).map((f: { id: string; full_name: string | null }) => [f.id, f.full_name ?? '-']))

    const lotRows = (lotRes.data ?? []) as Array<Record<string, unknown>>
    setLots(lotRows.map((r) => ({
      id: String(r.id), supplier_id: String(r.supplier_id), variety_id: String(r.variety_id), lot_no: String(r.lot_no),
      quantity_in: Number(r.quantity_in ?? 0), quantity_balance: Number(r.quantity_balance ?? 0), bag_weight_kg: Number(r.bag_weight_kg ?? 0), sell_price_per_bag: Number(r.sell_price_per_bag ?? 0), status: String(r.status ?? ''), created_at: String(r.created_at ?? ''),
      supplier_name: supplierMap.get(String(r.supplier_id)) ?? '-', variety_name: varietyMap.get(String(r.variety_id)) ?? '-',
    })))

    const salesRows = (salesRes.data ?? []) as Array<Record<string, unknown>>
    setSales(salesRows.map((r) => ({
      id: String(r.id), sale_date: String(r.sale_date ?? ''), farmer_id: String(r.farmer_id ?? ''), farmer_name: farmerMap.get(String(r.farmer_id ?? '')) ?? '-', supplier_name: supplierMap.get(String(r.supplier_id ?? '')) ?? '-', variety_name: varietyMap.get(String(r.variety_id ?? '')) ?? '-', lot_no: String(r.lot_no ?? ''), quantity: Number(r.quantity ?? 0), sell_price_per_bag: Number(r.sell_price_per_bag ?? 0), total_amount: Number(r.total_amount ?? 0),
    })))

    setReservations(((reserveRes.data ?? []) as Array<Record<string, unknown>>).map((r) => ({
      id: String(r.id), farmer_id: String(r.farmer_id ?? ''), supplier_id: String(r.supplier_id ?? ''), variety_id: String(r.variety_id ?? ''), lot_id: String(r.lot_id ?? ''), lot_no: String(r.lot_no ?? ''), quantity: Number(r.quantity ?? 0), status: String(r.status ?? ''),
    })))
  }

  useEffect(() => { void loadData().catch((e: unknown) => setError(e instanceof Error ? `โหลดข้อมูลไม่สำเร็จ: ${e.message}` : 'โหลดข้อมูลไม่สำเร็จ')) }, [])

  const availableLots = useMemo(() => lots.filter((lot) => lot.quantity_balance > 0 && lot.status === 'available'), [lots])
  const supplierOptions = useMemo(() => suppliers, [suppliers])
  const varietyOptions = useMemo(() => varieties.filter((v) => !form.supplier_id || v.supplier_id === form.supplier_id), [varieties, form.supplier_id])
  const filteredLots = useMemo(() => availableLots.filter((lot) => (!form.variety_id || lot.variety_id === form.variety_id)), [availableLots, form.variety_id])
  const selectedLot = useMemo(() => availableLots.find((lot) => lot.id === form.lot_id), [availableLots, form.lot_id])
  const farmerOptions = useMemo(() => { const keyword = farmerSearch.trim().toLowerCase(); if (!keyword) return farmers; return farmers.filter((f) => f.name.toLowerCase().includes(keyword) || f.phone.includes(keyword) || f.national_id.includes(keyword)) }, [farmerSearch, farmers])

  const quantity = Number(form.quantity || 0)
  const totalAmount = quantity * Number(form.sell_price_per_bag || 0)
  const remaining = selectedLot ? selectedLot.quantity_balance - quantity : 0
  const overStock = !!selectedLot && quantity > selectedLot.quantity_balance

  const applyReservation = (reservationId: string) => {
    const r = reservations.find((x) => x.id === reservationId)
    if (!r) return
    const lot = availableLots.find((x) => x.id === r.lot_id)
    setForm((p) => ({ ...p, reservation_id: reservationId, farmer_id: r.farmer_id, supplier_id: r.supplier_id, variety_id: r.variety_id, lot_id: r.lot_id, quantity: String(r.quantity), bag_weight_kg: lot ? String(lot.bag_weight_kg) : p.bag_weight_kg, sell_price_per_bag: lot ? String(lot.sell_price_per_bag) : p.sell_price_per_bag }))
  }

  const onLotChange = (lotId: string) => {
    const lot = availableLots.find((item) => item.id === lotId)
    setForm((prev) => ({ ...prev, lot_id: lotId, supplier_id: lot?.supplier_id ?? prev.supplier_id, variety_id: lot?.variety_id ?? prev.variety_id, bag_weight_kg: lot ? String(lot.bag_weight_kg) : '', sell_price_per_bag: lot ? String(lot.sell_price_per_bag) : '' }))
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setOk('')
    try {
      if (!selectedLot) throw new Error('กรุณาเลือกล็อตเมล็ดพันธุ์')
      if (!form.farmer_id) throw new Error('กรุณาเลือกเกษตรกร')
      if (quantity <= 0) throw new Error('จำนวนถุงต้องมากกว่า 0')

      const db = requireSupabase()
      const { data: latestLot, error: lotCheckErr } = await db.from('seed_stock_lots').select('id,quantity_balance,status').eq('id', selectedLot.id).single()
      if (lotCheckErr || !latestLot) throw new Error('ไม่พบข้อมูลล็อตล่าสุด')
      if (latestLot.status !== 'available') throw new Error('ล็อตนี้ไม่พร้อมขาย')
      if (quantity > Number(latestLot.quantity_balance ?? 0)) throw new Error('จำนวนขายมากกว่ายอดคงเหลือ')

      const nextBalance = Number(latestLot.quantity_balance) - quantity
      const salePayload = { sale_date: form.sale_date, farmer_id: form.farmer_id, supplier_id: selectedLot.supplier_id, variety_id: selectedLot.variety_id, lot_id: selectedLot.id, lot_no: selectedLot.lot_no, quantity, bag_weight_kg: Number(form.bag_weight_kg), sell_price_per_bag: Number(form.sell_price_per_bag), total_weight_kg: quantity * Number(form.bag_weight_kg), total_amount: quantity * Number(form.sell_price_per_bag), payment_status: form.payment_status }
      const { error: saleErr } = await db.from('seed_sales').insert(salePayload)
      if (saleErr) throw new Error(`บันทึกการขายไม่สำเร็จ: ${saleErr.message}`)

      const { error: stockErr } = await db.from('seed_stock_lots').update({ quantity_balance: nextBalance, status: nextBalance === 0 ? 'sold_out' : 'available' }).eq('id', selectedLot.id)
      if (stockErr) throw new Error(`อัปเดตสต็อกไม่สำเร็จ: ${stockErr.message}`)

      if (form.sale_mode === 'reservation' && form.reservation_id) {
        const { error: reserveErr } = await db.from('seed_reservations').update({ status: 'converted' }).eq('id', form.reservation_id)
        if (reserveErr) throw new Error(`อัปเดตสถานะรายการจองไม่สำเร็จ: ${reserveErr.message}`)
      }

      setOk('บันทึกการขายสำเร็จ')
      setForm((p) => ({ ...p, farmer_id: '', supplier_id: '', variety_id: '', lot_id: '', quantity: '', bag_weight_kg: '', sell_price_per_bag: '', reservation_id: '' }))
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'บันทึกการขายไม่สำเร็จ')
    }
  }

  return <div className="max-w-6xl mx-auto space-y-6">
    <div><h1 className="text-2xl font-bold text-gray-900">ขายเมล็ดพันธุ์ (ตาม Lot)</h1></div>
    {ok && <div className="bg-emerald-50 border border-emerald-300 p-2 rounded text-emerald-700 text-sm">{ok}</div>}
    {error && <div className="bg-red-50 border border-red-300 p-2 rounded text-red-700 text-sm">{error}</div>}
    <form onSubmit={onSubmit} className="bg-white rounded-2xl border border-gray-200 p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
      <select value={form.sale_mode} onChange={(e) => setForm((p) => ({ ...p, sale_mode: e.target.value as FormState['sale_mode'], reservation_id: '' }))} className="border rounded-lg p-2 md:col-span-3">
        <option value="direct">ขายตรง</option>
        <option value="reservation">ขายจากรายการจอง</option>
      </select>

      {form.sale_mode === 'reservation' && (
        <select value={form.reservation_id} onChange={(e) => applyReservation(e.target.value)} className="border rounded-lg p-2 md:col-span-3"><option value="">เลือกรายการจอง</option>{reservations.map((r) => <option key={r.id} value={r.id}>{r.id} • {r.quantity} ถุง • Lot {r.lot_no || '-'}</option>)}</select>
      )}

      <input placeholder="ค้นหาเกษตรกร (ชื่อ / เบอร์ / บัตร)" value={farmerSearch} onChange={(e) => setFarmerSearch(e.target.value)} className="border rounded-lg p-2" />
      <select required value={form.farmer_id} onChange={(e) => setForm((p) => ({ ...p, farmer_id: e.target.value }))} className="border rounded-lg p-2" disabled={form.sale_mode === 'reservation'}><option value="">เลือกเกษตรกร</option>{farmerOptions.map((f) => <option key={f.id} value={f.id}>{f.name} | {f.phone}</option>)}</select>
      <select value={form.supplier_id} onChange={(e) => setForm((p) => ({ ...p, supplier_id: e.target.value, variety_id: '', lot_id: '' }))} className="border rounded-lg p-2" disabled={form.sale_mode === 'reservation'}><option value="">เลือก Supplier</option>{supplierOptions.map((s) => <option key={s.id} value={s.id}>{s.supplier_name}</option>)}</select>
      <select value={form.variety_id} onChange={(e) => setForm((p) => ({ ...p, variety_id: e.target.value, lot_id: '' }))} className="border rounded-lg p-2" disabled={form.sale_mode === 'reservation'}><option value="">เลือก Variety</option>{varietyOptions.map((v) => <option key={v.id} value={v.id}>{v.variety_name}</option>)}</select>
      <select required value={form.lot_id} onChange={(e) => onLotChange(e.target.value)} className="border rounded-lg p-2"><option value="">เลือก Lot (เหลือ &gt; 0)</option>{filteredLots.map((lot) => <option key={lot.id} value={lot.id}>{lot.lot_no} (คงเหลือ {lot.quantity_balance})</option>)}</select>
      <input required type="number" min="1" placeholder="จำนวนถุง" value={form.quantity} onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))} className="border rounded-lg p-2" disabled={form.sale_mode === 'reservation'} />
      <input required type="number" min="0" step="0.01" placeholder="kg/ถุง" value={form.bag_weight_kg} onChange={(e) => setForm((p) => ({ ...p, bag_weight_kg: e.target.value }))} className="border rounded-lg p-2" />
      <input required type="number" min="0" step="0.01" placeholder="ราคาขาย/ถุง" value={form.sell_price_per_bag} onChange={(e) => setForm((p) => ({ ...p, sell_price_per_bag: e.target.value }))} className="border rounded-lg p-2" />
      <input required type="date" value={form.sale_date} onChange={(e) => setForm((p) => ({ ...p, sale_date: e.target.value }))} className="border rounded-lg p-2" />
      <select value={form.payment_status} onChange={(e) => setForm((p) => ({ ...p, payment_status: e.target.value as FormState['payment_status'] }))} className="border rounded-lg p-2"><option value="unpaid">ยังไม่ชำระ</option><option value="partial">ชำระบางส่วน</option><option value="paid">ชำระครบ</option></select>
      <div className="md:col-span-2 bg-gray-50 rounded-lg p-3 text-sm space-y-1"><div>ยอดขายรวม: <b>{totalAmount.toLocaleString()} บาท</b></div><div>คงเหลือหลังขาย: <b className={overStock ? 'text-red-600' : ''}>{selectedLot ? remaining.toLocaleString() : '-'} ถุง</b></div><div className="text-gray-500">รายการขายทั้งหมด: {sales.length}</div></div>
      <button disabled={overStock} type="submit" className="md:col-span-3 bg-green-600 disabled:bg-gray-400 text-white rounded-lg py-2 font-semibold">ขายเมล็ด</button>
    </form>
  </div>
}
