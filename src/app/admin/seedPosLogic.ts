import type { PosCartItem, PosLot, PosPaymentType } from './seedPosTypes'

export function addLotToCart(cart: PosCartItem[], lot: PosLot): PosCartItem[] {
  const found = cart.find((item) => item.id === lot.id)
  if (found) {
    return cart.map((item) =>
      item.id === lot.id
        ? { ...item, qty: Math.min(item.qty + 1, item.balance) }
        : item
    )
  }
  return [...cart, { ...lot, qty: 1 }]
}

export function removeCartItem(cart: PosCartItem[], lotId: string): PosCartItem[] {
  return cart.filter((item) => item.id !== lotId)
}

export function updateCartQty(cart: PosCartItem[], lotId: string, qty: number): PosCartItem[] {
  return cart.map((item) => {
    if (item.id !== lotId) return item
    const safeQty = Math.max(1, Math.min(Number(qty || 1), item.balance))
    return { ...item, qty: safeQty }
  })
}

export function calcCartTotal(cart: PosCartItem[]): number {
  return cart.reduce((sum, item) => sum + item.qty * item.price, 0)
}

export function calcPayment(params: {
  cart: PosCartItem[]
  paymentType: PosPaymentType
  cashReceived: number
  creditPaid: number
}) {
  const total = calcCartTotal(params.cart)
  const paid = params.paymentType === 'cash' ? total : Math.max(params.creditPaid || 0, 0)
  const change = params.paymentType === 'cash' ? Math.max((params.cashReceived || 0) - total, 0) : 0
  const debt = Math.max(total - paid, 0)
  const paymentStatus = debt <= 0 ? 'paid' : paid > 0 ? 'partial' : 'unpaid'

  return { total, paid, change, debt, paymentStatus }
}

export function validateCartSale(params: {
  cart: PosCartItem[]
  hasFarmer: boolean
  paymentType: PosPaymentType
  cashReceived: number
}) {
  const total = calcCartTotal(params.cart)
  if (!params.hasFarmer) return 'กรุณาเลือกสมาชิก'
  if (params.cart.length === 0) return 'กรุณาเลือกสินค้า'
  if (params.cart.some((item) => item.qty > item.balance)) return 'จำนวนขายเกิน stock'
  if (params.paymentType === 'cash' && Number(params.cashReceived || 0) < total) return 'เงินรับน้อยกว่ายอดขาย'
  return ''
}
