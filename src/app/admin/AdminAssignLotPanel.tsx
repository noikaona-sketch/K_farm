import React, { useEffect, useMemo, useState } from 'react'
import { PackageCheck, Save, X } from 'lucide-react'
import { isSupabaseReady, supabase } from '../../lib/supabase'
import { fmtMoney } from './seedPosTypes'

type BookingRow = { id: string; booking_no: string; farmer_name: string; status: string }
type BookingItem = { id: string; booking_id: string; variety_id?: string; variety_name: string; quantity: number; lot_id?: string | null; lot_no?: string | null; reserved_quantity?: number; assigned_qty?: number; status?: string }
type StockLot = { id: string; variety_id: string; variety_name: string; lot_no: string; quantity_balance: number; supplier_name?: string }

type Props = { booking: BookingRow | null; onClose: () => void; onSaved: () => void }

export default function AdminAssignLotPanel({ booking, onClose, onSaved }: Props) {
  const [items, setItems] = useState<BookingItem[]>([])
  const [lots, setLots] = useState<StockLot[]>([])
  const [selectedLots, setSelectedLots] = useState<Record<string, string>>({})
  const [assignedQty, setAssignedQty] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const filteredLotsByItem = useMemo(() => {
    const map = new Map<string, StockLot[]>()
    items.forEach((it) => map.set(it.id, lots.filter((l) => String(l.variety_id) === String(it.variety_id))))
    return map
  }, [items, lots])

  const load = async () => {
    if (!booking || !isSupabaseReady || !supabase) return
    setLoading(true); setError('')
    try {
      const [itemRes, lotRes] = await Promise.all([
        supabase.from('seed_booking_items').select('id,booking_id,variety_id,variety_name,quantity,lot_id,lot_no,reserved_quantity,assigned_qty,status').eq('booking_id', booking.id),
        supabase.from('seed_stock_lots').select('id,variety_id,variety_name,lot_no,quantity_balance,supplier_name,status').neq('status', 'inactive').order('created_at', { ascending: true }),
      ])
      if (itemRes.error) throw new Error(itemRes.error.message)
      if (lotRes.error) throw new Error(lotRes.error.message)
      const nextItems = (itemRes.data ?? []).map((r: any) => ({ id: String(r.id), booking_id: String(r.booking_id), variety_id: String(r.variety_id ?? ''), variety_name: String(r.variety_name ?? '-'), quantity: Number(r.quantity ?? 0), lot_id: r.lot_id ? String(r.lot_id) : null, lot_no: r.lot_no ? String(r.lot_no) : null, reserved_quantity: Number(r.reserved_quantity ?? 0), assigned_qty: Number(r.assigned_qty ?? 0), status: String(r.status ?? 'pending') }))
      setItems(nextItems)
      setLots((lotRes.data ?? []).map((r: any) => ({ id: String(r.id), variety_id: String(r.variety_id ?? ''), variety_name: String(r.variety_name ?? ''), lot_no: String(r.lot_no ?? '-'), quantity_balance: Number(r.quantity_balance ?? 0), supplier_name: String(r.supplier_name ?? '') })))
      const lotState: Record<string, string> = {}
      const qtyState: Record<string, string> = {}
      nextItems.forEach((it) => { if (it.lot_id) lotState[it.id] = it.lot_id; qtyState[it.id] = String(it.assigned_qty || it.reserved_quantity || it.quantity || 0) })
      setSelectedLots(lotState); setAssignedQty(qtyState)
    } catch (e) { setError(e instanceof Error ? e.message : 'โหลดข้อมูลจัด LOT ไม่สำเร็จ') } finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [booking?.id])
  if (!booking) return null

  const save = async () => {
    if (!supabase) return
    setSaving(true); setError('')
    try {
      for (const it of items) {
        const lotId = selectedLots[it.id]
        if (!lotId) throw new Error(`กรุณาเลือก LOT ของ ${it.variety_name}`)
        const lot = lots.find((l) => l.id === lotId)
        const qty = Number(assignedQty[it.id] || 0)
        if (!lot) throw new Error(`ไม่พบ LOT ของ ${it.variety_name}`)
        if (qty <= 0) throw new Error(`จำนวนจัดของ ${it.variety_name} ไม่ถูกต้อง`)
        const { error: upErr } = await supabase.from('seed_booking_items').update({ lot_id: lot.id, lot_no: lot.lot_no, reserved_quantity: qty, assigned_qty: qty, assigned_at: new Date().toISOString(), assigned_by: 'Admin', status: 'assigned' }).eq('id', it.id)
        if (upErr) throw new Error(upErr.message)
      }
      const { error: bErr } = await supabase.from('seed_bookings').update({ status: 'ready' }).eq('id', booking.id)
      if (bErr) throw new Error(bErr.message)
      onSaved(); onClose()
    } catch (e) { setError(e instanceof Error ? e.message : 'บันทึกจัด LOT ไม่สำเร็จ') } finally { setSaving(false) }
  }

  return <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4"><div className="bg-white rounded-3xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"><div className="p-4 border-b flex items-center justify-between"><div><div className="font-bold text-lg flex items-center gap-2"><PackageCheck className="w-5 h-5 text-emerald-600" />จัด LOT ใบจอง</div><div className="text-sm text-gray-500">{booking.booking_no} | {booking.farmer_name}</div></div><button onClick={onClose} className="p-2 rounded-xl border"><X className="w-4 h-4" /></button></div>{error && <div className="mx-4 mt-4 rounded-xl bg-red-50 border border-red-200 text-red-700 p-3 text-sm">{error}</div>}<div className="p-4 space-y-3">{loading ? <div className="text-center text-gray-400 py-8">กำลังโหลด...</div> : items.length === 0 ? <div className="text-center text-gray-400 py-8">ไม่พบรายการสินค้า</div> : items.map((it) => { const lotList = filteredLotsByItem.get(it.id) ?? []; const lot = lots.find((l) => l.id === selectedLots[it.id]); return <div key={it.id} className="border rounded-2xl p-4 space-y-3"><div className="flex justify-between gap-3"><div><div className="font-bold">{it.variety_name}</div><div className="text-sm text-gray-500">จำนวนจอง {fmtMoney(it.quantity)} ถุง</div></div><div className="text-xs px-2 py-1 rounded-full bg-gray-100 h-fit">{it.status || 'pending'}</div></div><select value={selectedLots[it.id] || ''} onChange={(e) => setSelectedLots((p) => ({ ...p, [it.id]: e.target.value }))} className="w-full border rounded-xl p-3 bg-white"><option value="">เลือก LOT</option>{lotList.map((l) => <option key={l.id} value={l.id}>{l.lot_no} | คงเหลือ {fmtMoney(l.quantity_balance)} ถุง | {l.supplier_name || '-'}</option>)}</select><div className="grid grid-cols-1 md:grid-cols-2 gap-2"><input type="number" value={assignedQty[it.id] ?? String(it.quantity || 0)} onChange={(e) => setAssignedQty((p) => ({ ...p, [it.id]: e.target.value }))} className="w-full border rounded-xl p-3" placeholder="จำนวนที่จัด" />{lot && <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-sm text-emerald-800">LOT ที่เลือกเหลือ {fmtMoney(lot.quantity_balance)} ถุง</div>}</div></div> })}</div><div className="p-4 border-t grid grid-cols-2 gap-2"><button onClick={onClose} className="border rounded-xl py-3 font-semibold">ยกเลิก</button><button disabled={saving || loading} onClick={save} className="bg-emerald-600 disabled:bg-gray-300 text-white rounded-xl py-3 font-bold flex items-center justify-center gap-2"><Save className="w-4 h-4" />{saving ? 'กำลังบันทึก...' : 'บันทึกจัด LOT'}</button></div></div></div>
}
