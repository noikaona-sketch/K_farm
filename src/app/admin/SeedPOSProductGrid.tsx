import React from 'react'
import { Search } from 'lucide-react'
import type { PosLot } from './seedPosTypes'
import { fmtMoney } from './seedPosTypes'

type SupplierOption = { id: string; name: string }

type Props = {
  lots: PosLot[]
  suppliers: SupplierOption[]
  supplierFilter: string
  productSearch: string
  onSupplierFilterChange: (value: string) => void
  onProductSearchChange: (value: string) => void
  onAddToCart: (lot: PosLot) => void
}

export default function SeedPOSProductGrid({
  lots,
  suppliers,
  supplierFilter,
  productSearch,
  onSupplierFilterChange,
  onProductSearchChange,
  onAddToCart,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <select
          value={supplierFilter}
          onChange={(e) => onSupplierFilterChange(e.target.value)}
          className="border rounded-xl p-2 bg-white"
        >
          <option value="all">ทุก Supplier</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <input
            value={productSearch}
            onChange={(e) => onProductSearchChange(e.target.value)}
            placeholder="ค้นหาพันธุ์ / Lot / Supplier"
            className="w-full border rounded-xl p-2 pl-9"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {lots.map((lot) => (
          <button
            key={lot.id}
            type="button"
            onClick={() => onAddToCart(lot)}
            className="bg-white border rounded-2xl p-4 text-left hover:border-emerald-400 hover:shadow-sm transition-all"
          >
            <div className="font-bold text-gray-900 truncate">{lot.varietyName}</div>
            <div className="text-xs text-gray-500 mt-1 truncate">{lot.supplierName}</div>
            <div className="text-xs text-gray-500">Lot: {lot.lotNo}</div>
            <div className="mt-3 flex justify-between gap-2 text-sm">
              <span className="text-emerald-700 font-bold">{fmtMoney(lot.price)} บาท</span>
              <span className="text-gray-500">คงเหลือ {fmtMoney(lot.balance)}</span>
            </div>
          </button>
        ))}

        {lots.length === 0 && (
          <div className="text-gray-400 p-8 bg-white rounded-2xl border text-center md:col-span-2 lg:col-span-3">
            ไม่พบสินค้า
          </div>
        )}
      </div>
    </div>
  )
}
