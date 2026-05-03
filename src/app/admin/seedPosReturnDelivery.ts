import type { PosSaleRow, PosLot } from './seedPosTypes'

export function calcDeliverMore(sale: PosSaleRow, lot: PosLot | undefined, qty: number) {
  const pending = Number(sale.pending_delivery_qty ?? 0)
  const lotBalance = Number(lot?.balance ?? 0)
  const deliverQty = Math.max(0, Math.min(qty, pending, lotBalance))
  const nextDelivered = Number(sale.delivered_quantity ?? 0) + deliverQty
  const nextPending = Math.max(pending - deliverQty, 0)
  const nextLotBalance = Math.max(lotBalance - deliverQty, 0)
  const nextDeliveryStatus = nextPending <= 0 ? 'delivered' : 'partial_pending'

  return {
    deliverQty,
    nextDelivered,
    nextPending,
    nextLotBalance,
    nextDeliveryStatus,
  }
}

export function calcPartialReturn(sale: PosSaleRow, lot: PosLot | undefined, qty: number) {
  const soldQty = Number(sale.quantity ?? 0)
  const returnedQty = Number(sale.returned_quantity ?? 0)
  const returnableQty = Math.max(soldQty - returnedQty, 0)
  const returnQty = Math.max(0, Math.min(qty, returnableQty))
  const lotBalance = Number(lot?.balance ?? 0)
  const nextReturned = returnedQty + returnQty
  const nextLotBalance = lotBalance + returnQty
  const nextReturnStatus = nextReturned >= soldQty ? 'returned' : 'partial_return'

  return {
    returnQty,
    nextReturned,
    nextLotBalance,
    nextReturnStatus,
  }
}
