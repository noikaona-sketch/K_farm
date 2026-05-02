import React, { useMemo, useState } from 'react'

type SeedSupplier = { id: string; name: string }
type SeedVarietyOption = {
  id: string
  supplierId: string
  name: string
  bag_weight_kg: number
  price_per_bag: number
}

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
  cost_price_per_bag: number
  sell_price_per_bag: number
  total_weight_kg: number
  total_cost: number
  received_date: string
  expiry_date: string
  created_at: string
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

const STORAGE_KEY = 'kfarm_seed_stock_lots_v1'

const SUPPLIERS: SeedSupplier[] = [
  { id: 'sup-1', name: 'Pacific Seeds Thailand' },
  { id: 'sup-2', name: 'Syngenta Thailand' },
  { id: 'sup-3', name: 'CP Seeds' },
]

const VARIETIES: SeedVarietyOption[] = [
  { id: 'var-1', supplierId: 'sup-1', name: 'PAC339', bag_weight_kg: 20, price_per_bag: 2100 },
  { id: 'var-2', supplierId: 'sup-1', name: 'PAC999', bag_weight_kg: 20, price_per_bag: 2250 },
  { id: 'var-3', supplierId: 'sup-2', name: 'NK7328', bag_weight_kg: 15, price_per_bag: 1950 },
  { id: 'var-4', supplierId: 'sup-3', name: 'CP888', bag_weight_kg: 25, price_per_bag: 2350 },
]

function fetchSeedVarietiesBySupplier(supplierId: string): SeedVarietyOption[] {
  return VARIETIES.filter((item) => item.supplierId === supplierId)
}

function createSeedStockLot(form: FormState): SeedStockLot | null {
  const supplier = SUPPLIERS.find((item) => item.id === form.supplier_id)
  const variety = VARIETIES.find((item) => item.id === form.variety_id)
  if (!supplier || !variety) return null

  const quantity_in = Number(form.quantity_in)
  const bag_weight_kg = Number(form.bag_weight_kg)
  const cost_price_per_bag = Number(form.cost_price_per_bag)
  const sell_price_per_bag = Number(form.sell_price_per_bag)

  const quantity_balance = quantity_in
  const total_weight_kg = quantity_in * bag_weight_kg
  const total_cost = quantity_in * cost_price_per_bag

  return {
    id: `lot-${Date.now()}`,
    supplier_id: supplier.id,
    supplier_name: supplier.name,
    variety_id: variety.id,
    variety_name: variety.name,
    lot_no: form.lot_no,
    quantity_in,
    quantity_balance,
    bag_weight_kg,
    cost_price_per_bag,
    sell_price_per_bag,
    total_weight_kg,
    total_cost,
    received_date: form.received_date,
    expiry_date: form.expiry_date,
    created_at: new Date().toISOString(),
  }
}

function loadLots(): SeedStockLot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export default function AdminSeedStock() {
  const [lots, setLots] = useState<SeedStockLot[]>(() => loadLots())
  const [form, setForm] = useState<FormState>({
    supplier_id: '',
    variety_id: '',
    lot_no: '',
    quantity_in: '',
    bag_weight_kg: '',
    cost_price_per_bag: '',
    sell_price_per_bag: '',
    received_date: '',
    expiry_date: '',
  })

  const varieties = useMemo(
    () => fetchSeedVarietiesBySupplier(form.supplier_id),
    [form.supplier_id]
  )

  const saveLots = (nextLots: SeedStockLot[]) => {
    setLots(nextLots)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextLots))
  }

  const onSupplierChange = (supplierId: string) => {
    setForm((prev) => ({ ...prev, supplier_id: supplierId, variety_id: '', bag_weight_kg: '', sell_price_per_bag: '' }))
  }

  const onVarietyChange = (varietyId: string) => {
    const variety = varieties.find((item) => item.id === varietyId)
    setForm((prev) => ({
      ...prev,
      variety_id: varietyId,
      bag_weight_kg: variety ? String(variety.bag_weight_kg) : prev.bag_weight_kg,
      sell_price_per_bag: variety ? String(variety.price_per_bag) : prev.sell_price_per_bag,
    }))
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const lot = createSeedStockLot(form)
    if (!lot) return
    saveLots([lot, ...lots])
    setForm({
      supplier_id: '', variety_id: '', lot_no: '', quantity_in: '', bag_weight_kg: '',
      cost_price_per_bag: '', sell_price_per_bag: '', received_date: '', expiry_date: '',
    })
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">รับเข้า Stock เมล็ดพันธุ์</h1>
      </div>

      <form onSubmit={onSubmit} className="bg-white rounded-2xl border border-gray-200 p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <select required value={form.supplier_id} onChange={(e) => onSupplierChange(e.target.value)} className="border rounded-lg p-2">
          <option value="">เลือก Supplier</option>
          {SUPPLIERS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select required value={form.variety_id} onChange={(e) => onVarietyChange(e.target.value)} className="border rounded-lg p-2" disabled={!form.supplier_id}>
          <option value="">เลือก Variety</option>
          {varieties.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
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
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['Supplier', 'Variety', 'Lot', 'รับเข้า', 'คงเหลือ', 'kg/ถุง', 'ต้นทุน', 'ขาย', 'วันหมด'].map((h) => (
                <th key={h} className="text-left p-3 font-semibold text-gray-700">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lots.map((lot) => (
              <tr key={lot.id} className="border-t">
                <td className="p-3">{lot.supplier_name}</td>
                <td className="p-3">{lot.variety_name}</td>
                <td className="p-3">{lot.lot_no}</td>
                <td className="p-3">{lot.quantity_in}</td>
                <td className="p-3">{lot.quantity_balance}</td>
                <td className="p-3">{lot.bag_weight_kg}</td>
                <td className="p-3">{lot.cost_price_per_bag}</td>
                <td className="p-3">{lot.sell_price_per_bag}</td>
                <td className="p-3">{lot.expiry_date}</td>
              </tr>
            ))}
            {lots.length === 0 && (
              <tr><td className="p-4 text-gray-500" colSpan={9}>ยังไม่มีข้อมูลรับเข้า</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
