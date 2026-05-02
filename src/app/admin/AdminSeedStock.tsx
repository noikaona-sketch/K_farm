import React, { useEffect, useMemo, useState } from 'react'
import { requireSupabase } from '../../lib/supabase'

type SeedSupplier = { id: string; supplier_name: string; seed_brand: string }
type SeedVarietyOption = {
  id: string
  supplier_id: string
  variety_name: string
  bag_weight_kg: number
  price_per_bag: number
}

type SeedStockLotRow = {
  id: string
  supplier_id: string
  variety_id: string
  lot_no: string
  quantity_in: number
  quantity_balance: number
  bag_weight_kg: number
  cost_price_per_bag: number
  sell_price_per_bag: number
  total_weight_kg: number
  total_cost: number
  received_date: string
  expiry_date: string
  status: string
  created_at: string
}

type SeedStockLotView = SeedStockLotRow & {
  supplier_name: string
  variety_name: string
}

type FormState = {
  supplier_id: string
  variety_id: string
  lot_no: string
  quantity_in: string
  bag_weight_kg: string
  cost_price_per_bag: string
  sell_price_per_bag: string
  received_date: string
  expiry_date: string
}

const emptyForm: FormState = { supplier_id: '', variety_id: '', lot_no: '', quantity_in: '', bag_weight_kg: '', cost_price_per_bag: '', sell_price_per_bag: '', received_date: '', expiry_date: '' }

export default function AdminSeedStock() {
  const [lots, setLots] = useState<SeedStockLotView[]>([])
  const [suppliers, setSuppliers] = useState<SeedSupplier[]>([])
  const [allVarieties, setAllVarieties] = useState<SeedVarietyOption[]>([])
  const [form, setForm] = useState<FormState>(emptyForm)
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const varieties = useMemo(() => allVarieties.filter(v => v.supplier_id === form.supplier_id), [allVarieties, form.supplier_id])

  const loadData = async () => {
    try {
      setErr(null)
      const db = requireSupabase()
      const [supRes, varRes, lotRes] = await Promise.all([
        db.from('seed_suppliers').select('id,supplier_name,seed_brand').eq('active_status', true).order('supplier_name'),
        db.from('seed_varieties').select('id,supplier_id,variety_name,bag_weight_kg,price_per_bag'),
        db.from('seed_stock_lots').select('*').order('created_at', { ascending: false }),
      ])

      if (supRes.error) throw new Error(`โหลด Supplier ไม่สำเร็จ: ${supRes.error.message}`)
      if (varRes.error) throw new Error(`โหลด Variety ไม่สำเร็จ: ${varRes.error.message}`)
      if (lotRes.error) throw new Error(`โหลดข้อมูลสต็อกไม่สำเร็จ: ${lotRes.error.message}`)

      const supData = (supRes.data ?? []) as SeedSupplier[]
      const varData = (varRes.data ?? []) as SeedVarietyOption[]
      const lotData = (lotRes.data ?? []) as SeedStockLotRow[]

      const supplierMap = new Map(supData.map(s => [s.id, `${s.supplier_name} (${s.seed_brand || '-'})`]))
      const varietyMap = new Map(varData.map(v => [v.id, v.variety_name]))

      setSuppliers(supData)
      setAllVarieties(varData)
      setLots(lotData.map(lot => ({
        ...lot,
        supplier_name: supplierMap.get(lot.supplier_id) ?? lot.supplier_id,
        variety_name: varietyMap.get(lot.variety_id) ?? lot.variety_id,
      })))
    } catch (error) {
      setErr(error instanceof Error ? `เกิดข้อผิดพลาด: ${error.message}` : 'เกิดข้อผิดพลาดในการโหลดข้อมูล')
    }
  }

  useEffect(() => { void loadData() }, [])

  const onSupplierChange = (supplierId: string) => {
    setForm((prev) => ({ ...prev, supplier_id: supplierId, variety_id: '', bag_weight_kg: '', sell_price_per_bag: '' }))
  }

  const onSelectVariety = (varietyId: string) => {
    const variety = varieties.find((item) => item.id === varietyId)
    setForm((prev) => ({
      ...prev,
      variety_id: varietyId,
      bag_weight_kg: variety ? String(variety.bag_weight_kg) : '',
      sell_price_per_bag: variety ? String(variety.price_per_bag) : '',
    }))
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setErr(null)
      setMsg(null)
      if (!form.supplier_id) throw new Error('กรุณาเลือก Supplier')
      if (!form.variety_id) throw new Error('กรุณาเลือกพันธุ์')
      if (!form.lot_no.trim()) throw new Error('กรุณากรอก Lot No.')

      const quantity_in = Number(form.quantity_in)
      const bag_weight_kg = Number(form.bag_weight_kg)
      const cost_price_per_bag = Number(form.cost_price_per_bag)
      const sell_price_per_bag = Number(form.sell_price_per_bag)

      if (quantity_in <= 0) throw new Error('จำนวนรับเข้าต้องมากกว่า 0')
      if (bag_weight_kg <= 0) throw new Error('น้ำหนักต่อถุงต้องมากกว่า 0')
      if (cost_price_per_bag < 0 || sell_price_per_bag < 0) throw new Error('ราคาต้องไม่ติดลบ')

      const db = requireSupabase()
      const payload = {
        supplier_id: form.supplier_id,
        variety_id: form.variety_id,
        lot_no: form.lot_no.trim(),
        quantity_in,
        quantity_balance: quantity_in,
        bag_weight_kg,
        total_weight_kg: quantity_in * bag_weight_kg,
        cost_price_per_bag,
        sell_price_per_bag,
        total_cost: quantity_in * cost_price_per_bag,
        received_date: form.received_date,
        expiry_date: form.expiry_date,
        status: 'available',
      }

      const { error } = await db.from('seed_stock_lots').insert(payload)
      if (error) throw new Error(`บันทึกข้อมูลไม่สำเร็จ: ${error.message}`)

      setMsg('บันทึกรับเข้า Stock สำเร็จ')
      setForm(emptyForm)
      await loadData()
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'บันทึกข้อมูลไม่สำเร็จ')
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">รับเข้า Stock เมล็ดพันธุ์</h1></div>
      {msg && <div className="bg-emerald-50 border border-emerald-300 p-2 rounded text-emerald-700 text-sm">{msg}</div>}
      {err && <div className="bg-red-50 border border-red-300 p-2 rounded text-red-700 text-sm">{err}</div>}
      <form onSubmit={onSubmit} className="bg-white rounded-2xl border border-gray-200 p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <select required value={form.supplier_id} onChange={(e) => onSupplierChange(e.target.value)} className="border rounded-lg p-2">
          <option value="">เลือก Supplier</option>
          {suppliers.map((s) => <option key={s.id} value={s.id}>{s.supplier_name} ({s.seed_brand})</option>)}
        </select>
        <select required value={form.variety_id} onChange={(e) => onSelectVariety(e.target.value)} className="border rounded-lg p-2" disabled={!form.supplier_id}>
          <option value="">เลือก Variety</option>
          {varieties.map((v) => <option key={v.id} value={v.id}>{v.variety_name}</option>)}
        </select>
        <input required placeholder="Lot No." value={form.lot_no} onChange={(e) => setForm((p) => ({ ...p, lot_no: e.target.value }))} className="border rounded-lg p-2" />
        <input required type="number" min="1" placeholder="จำนวนถุง" value={form.quantity_in} onChange={(e) => setForm((p) => ({ ...p, quantity_in: e.target.value }))} className="border rounded-lg p-2" />
        <input required type="number" min="0" step="0.01" placeholder="kg/ถุง" value={form.bag_weight_kg} onChange={(e) => setForm((p) => ({ ...p, bag_weight_kg: e.target.value }))} className="border rounded-lg p-2" />
        <input required type="number" min="0" step="0.01" placeholder="ต้นทุน/ถุง" value={form.cost_price_per_bag} onChange={(e) => setForm((p) => ({ ...p, cost_price_per_bag: e.target.value }))} className="border rounded-lg p-2" />
        <input required type="number" min="0" step="0.01" placeholder="ราคาขาย/ถุง" value={form.sell_price_per_bag} onChange={(e) => setForm((p) => ({ ...p, sell_price_per_bag: e.target.value }))} className="border rounded-lg p-2" />
        <input required type="date" value={form.received_date} onChange={(e) => setForm((p) => ({ ...p, received_date: e.target.value }))} className="border rounded-lg p-2" />
        <input required type="date" value={form.expiry_date} onChange={(e) => setForm((p) => ({ ...p, expiry_date: e.target.value }))} className="border rounded-lg p-2" />
        <button type="submit" className="md:col-span-3 bg-green-600 text-white rounded-lg py-2 font-semibold">Save</button>
      </form>
      <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
        <table className="min-w-full text-sm"><thead className="bg-gray-50"><tr>{['Supplier', 'Variety', 'Lot', 'รับเข้า', 'คงเหลือ', 'kg', 'ราคา', 'วันหมด'].map((h) => <th key={h} className="text-left p-3 font-semibold text-gray-700">{h}</th>)}</tr></thead>
          <tbody>
            {lots.map((lot) => <tr key={lot.id} className="border-t"><td className="p-3">{lot.supplier_name}</td><td className="p-3">{lot.variety_name}</td><td className="p-3">{lot.lot_no}</td><td className="p-3">{lot.quantity_in}</td><td className="p-3">{lot.quantity_balance}</td><td className="p-3">{lot.bag_weight_kg}</td><td className="p-3">{lot.sell_price_per_bag}</td><td className="p-3">{lot.expiry_date}</td></tr>)}
            {lots.length === 0 && <tr><td className="p-4 text-gray-500" colSpan={8}>ยังไม่มีข้อมูลรับเข้า</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
