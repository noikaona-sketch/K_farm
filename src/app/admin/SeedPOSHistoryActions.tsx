import React, { useState } from 'react'
import { PackageCheck, RotateCcw } from 'lucide-react'
import type { PosSaleRow } from './seedPosTypes'

type Props = {
  sale: PosSaleRow
  disabled?: boolean
  onDeliverMore: (sale: PosSaleRow, qty: number) => void
  onReturnPartial: (sale: PosSaleRow, qty: number) => void
}

export default function SeedPOSHistoryActions({ sale, disabled, onDeliverMore, onReturnPartial }: Props) {
  const [deliverQty, setDeliverQty] = useState('')
  const [returnQty, setReturnQty] = useState('')

  const pendingQty = Number(sale.pending_delivery_qty ?? 0)
  const soldQty = Number(sale.quantity ?? 0)
  const returnedQty = Number(sale.returned_quantity ?? 0)
  const returnableQty = Math.max(soldQty - returnedQty, 0)

  return (
    <div className="flex flex-col gap-2 min-w-[210px]">
      {pendingQty > 0 && (
        <div className="flex gap-1">
          <input
            type="number"
            min="1"
            max={pendingQty}
            value={deliverQty}
            onChange={(e) => setDeliverQty(e.target.value)}
            placeholder={`ส่งเพิ่ม ≤ ${pendingQty}`}
            className="w-24 border rounded-lg px-2 py-1 text-xs"
          />
          <button
            type="button"
            disabled={disabled || !deliverQty}
            onClick={() => onDeliverMore(sale, Number(deliverQty))}
            className="px-2 py-1 rounded-lg bg-blue-600 text-white text-xs font-semibold disabled:bg-gray-300 inline-flex items-center gap-1"
          >
            <PackageCheck className="w-3 h-3" />ส่งเพิ่ม
          </button>
        </div>
      )}

      {returnableQty > 0 && (
        <div className="flex gap-1">
          <input
            type="number"
            min="1"
            max={returnableQty}
            value={returnQty}
            onChange={(e) => setReturnQty(e.target.value)}
            placeholder={`คืน ≤ ${returnableQty}`}
            className="w-24 border rounded-lg px-2 py-1 text-xs"
          />
          <button
            type="button"
            disabled={disabled || !returnQty}
            onClick={() => onReturnPartial(sale, Number(returnQty))}
            className="px-2 py-1 rounded-lg bg-orange-600 text-white text-xs font-semibold disabled:bg-gray-300 inline-flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />รับคืน
          </button>
        </div>
      )}
    </div>
  )
}
