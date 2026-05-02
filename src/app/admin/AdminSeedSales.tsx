import React, { useMemo, useState } from 'react'

type Farmer = { id: string; name: string }

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
  status?: 'active' | 'sold_out'
}

type SeedSale = {
  id: string
  sale_date: string
  farmer_id: string
  farmer_name: string
  supplier_id: string
  supplier_name: string
  variety_id: string
  variety_name: string
  lot_id: string
  lot_no: string
  quantity: number
  bag_weight_kg: number
  sell_price_per_bag: number
  total_weight_kg: number
  total_amount: number
  payment_status: 'unpaid' | 'partial' | 'paid'
  created_at: string
}

type FormState = {
  farmer_id: string
  supplier_id: string
  variety_id: string
  lot_id: string
  quantity: string
  bag_weight_kg: string
  sell_price_per_bag: string
  sale_date: string
  payment_status: 'unpaid' | 'partial' | 'paid'
}

const STOCK_STORAGE_KEY = 'kfarm_seed_stock_lots_v1'
const SALES_STORAGE_KEY = 'kfarm_seed_sales_v1'

const FARMERS: Farmer[] = [
  { id: 'f-001', name: 'สมชาย ใจดี' },
  { id: 'f-002', name: 'มาลัย พูนสุข' },
  { id: 'f-003', name: 'ประยูร นครชัย' },
]

function loadLots(): SeedStockLot[] {
  try {
    const raw = localStorage.getItem(STOCK_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function loadSales(): SeedSale[] {
  try {
    const raw = localStorage.getItem(SALES_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export default function AdminSeedSales() {
  const [lots, setLots] = useState<SeedStockLot[]>(() => loadLots())
  const [sales, setSales] = useState<SeedSale[]>(() => loadSales())
  const [farmerSearch, setFarmerSearch] = useState('')
  const [error, setError] = useState('')
  const [form, setForm] = useState<FormState>({
    farmer_id: '', supplier_id: '', variety_id: '', lot_id: '', quantity: '', bag_weight_kg: '',
    sell_price_per_bag: '', sale_date: new Date().toISOString().slice(0, 10), payment_status: 'unpaid',
  })

  const availableLots = useMemo(() => lots.filter((lot) => lot.quantity_balance > 0), [lots])
  const selectedLot = useMemo(() => availableLots.find((lot) => lot.id === form.lot_id), [availableLots, form.lot_id])

  const suppliers = useMemo(
    () => Array.from(new Map(availableLots.map((lot) => [lot.supplier_id, { id: lot.supplier_id, name: lot.supplier_name }])).values()),
    [availableLots]
  )

  const varieties = useMemo(
    () => Array.from(new Map(availableLots
      .filter((lot) => !form.supplier_id || lot.supplier_id === form.supplier_id)
      .map((lot) => [lot.variety_id, { id: lot.variety_id, name: lot.variety_name }])).values()),
    [availableLots, form.supplier_id]
  )

  const filteredLots = useMemo(
    () => availableLots.filter((lot) =>
      (!form.supplier_id || lot.supplier_id === form.supplier_id)
      && (!form.variety_id || lot.variety_id === form.variety_id)),
    [availableLots, form.supplier_id, form.variety_id]
  )

  const farmerOptions = useMemo(
    () => FARMERS.filter((f) => f.name.toLowerCase().includes(farmerSearch.toLowerCase())),
    [farmerSearch]
  )

  const quantity = Number(form.quantity || 0)
  const bagWeight = Number(form.bag_weight_kg || 0)
  const sellPrice = Number(form.sell_price_per_bag || 0)
  const totalWeight = quantity * bagWeight
  const totalAmount = quantity * sellPrice
  const remaining = selectedLot ? selectedLot.quantity_balance - quantity : 0
  const overStock = !!selectedLot && quantity > selectedLot.quantity_balance

  const onLotChange = (lotId: string) => {
    const lot = availableLots.find((item) => item.id === lotId)
    setForm((prev) => ({
      ...prev,
      lot_id: lotId,
      supplier_id: lot?.supplier_id ?? prev.supplier_id,
      variety_id: lot?.variety_id ?? prev.variety_id,
      bag_weight_kg: lot ? String(lot.bag_weight_kg) : '',
      sell_price_per_bag: lot ? String(lot.sell_price_per_bag) : '',
    }))
    setError('')
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const lot = lots.find((item) => item.id === form.lot_id)
    const farmer = FARMERS.find((item) => item.id === form.farmer_id)
    if (!lot || !farmer) return

    if (quantity <= 0) {
      setError('จำนวนถุงต้องมากกว่า 0')
      return
    }

    if (quantity > lot.quantity_balance) {
      setError('จำนวนเกิน stock')
      return
    }

    const sale: SeedSale = {
      id: `sale-${Date.now()}`,
      sale_date: form.sale_date,
      farmer_id: farmer.id,
      farmer_name: farmer.name,
      supplier_id: lot.supplier_id,
      supplier_name: lot.supplier_name,
      variety_id: lot.variety_id,
      variety_name: lot.variety_name,
      lot_id: lot.id,
      lot_no: lot.lot_no,
      quantity,
      bag_weight_kg: Number(form.bag_weight_kg),
      sell_price_per_bag: Number(form.sell_price_per_bag),
      total_weight_kg: quantity * Number(form.bag_weight_kg),
      total_amount: quantity * Number(form.sell_price_per_bag),
      payment_status: form.payment_status,
      created_at: new Date().toISOString(),
    }

    const nextLots = lots.map((item) => {
      if (item.id !== lot.id) return item
      const nextBalance = item.quantity_balance - quantity
      return {
        ...item,
        quantity_balance: nextBalance,
        status: nextBalance === 0 ? 'sold_out' as const : 'active' as const,
      }
    })

    const nextSales = [sale, ...sales]
    setLots(nextLots)
    setSales(nextSales)
    localStorage.setItem(STOCK_STORAGE_KEY, JSON.stringify(nextLots))
    localStorage.setItem(SALES_STORAGE_KEY, JSON.stringify(nextSales))

    setForm((prev) => ({
      ...prev,
      lot_id: '',
      quantity: '',
      bag_weight_kg: '',
      sell_price_per_bag: '',
      supplier_id: '',
      variety_id: '',
    }))
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">ขายเมล็ดพันธุ์ (ตาม Lot)</h1>
      </div>

      <form onSubmit={onSubmit} className="bg-white rounded-2xl border border-gray-200 p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <input placeholder="ค้นหาเกษตรกร" value={farmerSearch} onChange={(e) => setFarmerSearch(e.target.value)} className="border rounded-lg p-2" />
        <select required value={form.farmer_id} onChange={(e) => setForm((p) => ({ ...p, farmer_id: e.target.value }))} className="border rounded-lg p-2">
          <option value="">เลือกเกษตรกร</option>
          {farmerOptions.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <select value={form.supplier_id} onChange={(e) => setForm((p) => ({ ...p, supplier_id: e.target.value, variety_id: '', lot_id: '' }))} className="border rounded-lg p-2">
          <option value="">เลือก Supplier</option>
          {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        <select value={form.variety_id} onChange={(e) => setForm((p) => ({ ...p, variety_id: e.target.value, lot_id: '' }))} className="border rounded-lg p-2">
          <option value="">เลือก Variety</option>
          {varieties.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
        <select required value={form.lot_id} onChange={(e) => onLotChange(e.target.value)} className="border rounded-lg p-2">
          <option value="">เลือก Lot (เหลือ &gt; 0)</option>
          {filteredLots.map((lot) => <option key={lot.id} value={lot.id}>{lot.lot_no} (คงเหลือ {lot.quantity_balance})</option>)}
        </select>
        <input required type="number" min="1" placeholder="จำนวนถุง" value={form.quantity} onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))} className="border rounded-lg p-2" />

        <input required type="number" min="0" step="0.01" placeholder="kg/ถุง" value={form.bag_weight_kg} onChange={(e) => setForm((p) => ({ ...p, bag_weight_kg: e.target.value }))} className="border rounded-lg p-2" />
        <input required type="number" min="0" step="0.01" placeholder="ราคาขาย/ถุง" value={form.sell_price_per_bag} onChange={(e) => setForm((p) => ({ ...p, sell_price_per_bag: e.target.value }))} className="border rounded-lg p-2" />
        <input required type="date" value={form.sale_date} onChange={(e) => setForm((p) => ({ ...p, sale_date: e.target.value }))} className="border rounded-lg p-2" />

        <select value={form.payment_status} onChange={(e) => setForm((p) => ({ ...p, payment_status: e.target.value as FormState['payment_status'] }))} className="border rounded-lg p-2">
          <option value="unpaid">ยังไม่ชำระ</option>
          <option value="partial">ชำระบางส่วน</option>
          <option value="paid">ชำระครบ</option>
        </select>
        <div className="md:col-span-2 bg-gray-50 rounded-lg p-3 text-sm space-y-1">
          <div>น้ำหนักรวม: <b>{totalWeight.toLocaleString()} kg</b></div>
          <div>ยอดขายรวม: <b>{totalAmount.toLocaleString()} บาท</b></div>
          <div>คงเหลือหลังขาย: <b className={overStock ? 'text-red-600' : ''}>{selectedLot ? remaining.toLocaleString() : '-'} ถุง</b></div>
        </div>

        {selectedLot && (
          <div className="md:col-span-3 bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm grid grid-cols-2 md:grid-cols-4 gap-2">
            <div>คงเหลือ: <b>{selectedLot.quantity_balance}</b> ถุง</div>
            <div>kg/ถุง: <b>{selectedLot.bag_weight_kg}</b></div>
            <div>ราคาขาย: <b>{selectedLot.sell_price_per_bag}</b></div>
            <div>วันหมดอายุ: <b>{selectedLot.expiry_date}</b></div>
          </div>
        )}

        {error && <div className="md:col-span-3 text-red-600 text-sm font-semibold">{error}</div>}

        <button disabled={overStock} type="submit" className="md:col-span-3 bg-green-600 disabled:bg-gray-400 text-white rounded-lg py-2 font-semibold">บันทึกการขาย</button>
      </form>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['วันที่', 'เกษตรกร', 'พันธุ์', 'Lot', 'จำนวน', 'kg', 'ราคา/ถุง', 'ยอดรวม', 'สถานะ'].map((h) => (
                <th key={h} className="text-left p-3 font-semibold text-gray-700">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sales.map((sale) => (
              <tr key={sale.id} className="border-t">
                <td className="p-3">{sale.sale_date}</td>
                <td className="p-3">{sale.farmer_name}</td>
                <td className="p-3">{sale.variety_name}</td>
                <td className="p-3">{sale.lot_no}</td>
                <td className="p-3">{sale.quantity}</td>
                <td className="p-3">{sale.total_weight_kg}</td>
                <td className="p-3">{sale.sell_price_per_bag}</td>
                <td className="p-3">{sale.total_amount}</td>
                <td className="p-3">{sale.payment_status}</td>
              </tr>
            ))}
            {sales.length === 0 && (
              <tr><td className="p-4 text-gray-500" colSpan={9}>ยังไม่มีข้อมูลการขาย</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
