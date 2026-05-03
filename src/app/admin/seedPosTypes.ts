export type PosFarmer = {
  id: string
  profileId?: string
  name: string
  phone: string
  idCard?: string
  district?: string
  village?: string
}

export type PosLot = {
  id: string
  supplierId?: string
  supplierName: string
  varietyId: string
  varietyName: string
  lotNo: string
  balance: number
  price: number
  createdAt?: string
}

export type PosCartItem = PosLot & {
  qty: number
}

export type PosPaymentType = 'cash' | 'credit'

export type PosSaleRow = {
  id: string
  sale_date: string
  farmer_name: string
  variety_name: string
  lot_no: string
  quantity: number
  total_amount: number
  paid_amount: number
  payment_status: string
  delivery_status: string
  delivered_quantity: number
  pending_delivery_qty: number
  returned_quantity: number
  return_status: string
  lot_id: string
}

export function fmtMoney(n: number) {
  return Number(n || 0).toLocaleString('th-TH', { maximumFractionDigits: 0 })
}

export function todayDate() {
  return new Date().toISOString().slice(0, 10)
}

export function addDaysDate(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}
