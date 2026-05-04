import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  ChevronDown,
  ChevronLeft,
  CreditCard,
  Minus,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  X,
} from 'lucide-react'
import { useAuth } from '../../routes/AuthContext'
import { isSupabaseReady, supabase } from '../../lib/supabase'

type FieldFarmer = {
  id: string
  name: string
  phone: string
  idCard?: string
  district?: string
  village?: string
}

type SeedItem = {
  id: string
  varietyId: string
  name: string
  supplier: string
  price: number
}

type PickupLocation = {
  id: string
  name: string
  address?: string
}

type PickupSlot = {
  id: string
  location_id: string
  pickup_date: string
  pickup_time: string
  capacity_qty: number
  booked_qty: number
  status: string
}

type CartItem = SeedItem & {
  qty: number
}

type FieldBookingRow = {
  id: string
  booking_no: string
  booking_date: string
  receive_date: string
  farmer_name: string
  farmer_phone: string
  total_amount: number
  status: string
  note?: string
}

const fmt = (n: number) => Number(n || 0).toLocaleString('th-TH')
const today = () => new Date().toISOString().slice(0, 10)
const genBookingNo = () => `FB-${Date.now().toString().slice(-8)}`

const statusLabel: Record<string, string> = {
  pending: 'รอจัด LOT',
  preparing: 'กำลังจัดของ',
  ready: 'พร้อมขาย/รับ',
  converted: 'ขายแล้ว',
  cancelled: 'ยกเลิก',
}

const statusBadge: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  preparing: 'bg-blue-100 text-blue-700',
  ready: 'bg-emerald-100 text-emerald-700',
  converted: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-700',
}

export default function FieldSeedBooking() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [tab, setTab] = useState<'book' | 'list'>('book')
  const [farmers, setFarmers] = useState<FieldFarmer[]>([])
  const [farmerSearch, setFarmerSearch] = useState('')
  const [selectedFarmerId, setSelectedFarmerId] = useState('')

  const [items, setItems] = useState<SeedItem[]>([])
  const [cart, setCart] = useState<CartItem[]>([])

  const [locations, setLocations] = useState<PickupLocation[]>([])
  const [slots, setSlots] = useState<PickupSlot[]>([])
  const [locationId, setLocationId] = useState('')
  const [slotId, setSlotId] = useState('')
  const [note, setNote] = useState('')

  const [bookings, setBookings] = useState<FieldBookingRow[]>([])
  const [listSearch, setListSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null)

  const selectedFarmer = farmers.find((f) => f.id === selectedFarmerId)
  const selectedLocation = locations.find((x) => x.id === locationId)

  const availableSlots = useMemo(
    () => slots.filter((s) => s.location_id === locationId && s.status !== 'closed'),
    [slots, locationId]
  )

  const selectedSlot = availableSlots.find((s) => s.id === slotId)

  const total = cart.reduce((sum, x) => sum + x.qty * x.price, 0)
  const totalQty = cart.reduce((sum, x) => sum + x.qty, 0)
  const pendingCount = bookings.filter((b) => b.status === 'pending').length

  const filteredFarmers = useMemo(() => {
    const kw = farmerSearch.trim().toLowerCase()
    if (!kw) return farmers.slice(0, 20)

    return farmers
      .filter((f) =>
        `${f.name} ${f.phone} ${f.idCard ?? ''} ${f.district ?? ''} ${f.village ?? ''}`
          .toLowerCase()
          .includes(kw)
      )
      .slice(0, 30)
  }, [farmers, farmerSearch])

  const groupedItems = useMemo(() => {
    const groups = new Map<string, SeedItem[]>()

    items.forEach((item) => {
      const key = item.supplier || '-'
      groups.set(key, [...(groups.get(key) ?? []), item])
    })

    return Array.from(groups.entries()).map(([supplier, rows]) => ({ supplier, rows }))
  }, [items])

  const displayedBookings = useMemo(() => {
    const kw = listSearch.trim().toLowerCase()

    return bookings
      .filter((b) => filterStatus === 'all' || b.status === filterStatus)
      .filter((b) =>
        !kw ||
        `${b.booking_no} ${b.farmer_name} ${b.farmer_phone} ${b.status}`
          .toLowerCase()
          .includes(kw)
      )
  }, [bookings, listSearch, filterStatus])

  const flash = (ok: boolean, msg: string) => {
    setToast({ ok, msg })
    setTimeout(() => setToast(null), 4000)
  }

  const load = async () => {
    setLoading(true)
    setError('')

    try {
      if (!isSupabaseReady || !supabase) return

      const [
        farmerRes,
        profileRes,
        varietyRes,
        supplierRes,
        locRes,
        slotRes,
        bookingRes,
      ] = await Promise.all([
        supabase.from('farmers').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('id,full_name,phone,id_card,role'),
        supabase
          .from('seed_varieties')
          .select('id,variety_name,supplier_id,sell_price_per_bag,price,status')
          .neq('status', 'inactive')
          .order('variety_name'),
        supabase
          .from('seed_suppliers')
          .select('id,supplier_name,status')
          .neq('status', 'inactive')
          .order('supplier_name'),
        supabase
          .from('pickup_locations')
          .select('id,name,address,active')
          .eq('active', true)
          .order('name'),
        supabase
          .from('pickup_slots')
          .select('id,location_id,pickup_date,pickup_time,capacity_qty,booked_qty,status')
          .order('pickup_date', { ascending: true }),
        supabase
          .from('seed_bookings')
          .select('id,booking_no,booking_date,receive_date,farmer_name,farmer_phone,total_amount,status,note,booking_source')
          .eq('booking_source', 'field')
          .order('booking_date', { ascending: false })
          .limit(100),
      ])

      const anyErr = [farmerRes, profileRes, varietyRes, supplierRes, locRes, slotRes, bookingRes]
        .find((r: any) => r.error)

      if (anyErr?.error) throw new Error(anyErr.error.message)

      const profileMap = new Map((profileRes.data ?? []).map((p: any) => [String(p.id), p]))

      setFarmers(
        (farmerRes.data ?? [])
          .filter((f: any) =>
            ['approved', 'active', 'farmer', 'member'].includes(String(f.status ?? 'approved'))
          )
          .map((f: any) => {
            const p = profileMap.get(String(f.profile_id ?? ''))

            return {
              id: String(f.id),
              name: String(f.full_name ?? p?.full_name ?? f.name ?? '-'),
              phone: String(f.phone ?? p?.phone ?? ''),
              idCard: String(f.id_card ?? p?.id_card ?? ''),
              district: String(f.district ?? ''),
              village: String(f.village ?? ''),
            }
          })
      )

      const supplierMap = new Map(
        (supplierRes.data ?? []).map((s: any) => [
          String(s.id),
          String(s.supplier_name ?? '-'),
        ])
      )

      setItems(
        (varietyRes.data ?? []).map((v: any) => ({
          id: String(v.id),
          varietyId: String(v.id),
          name: String(v.variety_name ?? '-'),
          supplier: supplierMap.get(String(v.supplier_id ?? '')) ?? '-',
          price: Number(v.sell_price_per_bag ?? 0) || Number(v.price ?? 0),
        }))
      )

      setLocations(
        (locRes.data ?? []).map((r: any) => ({
          id: String(r.id),
          name: String(r.name ?? '-'),
          address: String(r.address ?? ''),
        }))
      )

      setSlots(
        (slotRes.data ?? []).map((r: any) => ({
          id: String(r.id),
          location_id: String(r.location_id ?? ''),
          pickup_date: String(r.pickup_date ?? ''),
          pickup_time: String(r.pickup_time ?? ''),
          capacity_qty: Number(r.capacity_qty ?? 0),
          booked_qty: Number(r.booked_qty ?? 0),
          status: String(r.status ?? 'open'),
        }))
      )

      setBookings(
        (bookingRes.data ?? []).map((b: any) => ({
          id: String(b.id),
          booking_no: String(b.booking_no ?? ''),
          booking_date: String(b.booking_date ?? ''),
          receive_date: String(b.receive_date ?? ''),
          farmer_name: String(b.farmer_name ?? '-'),
          farmer_phone: String(b.farmer_phone ?? ''),
          total_amount: Number(b.total_amount ?? 0),
          status: String(b.status ?? 'pending'),
          note: String(b.note ?? ''),
        }))
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดข้อมูลไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  useEffect(() => {
    if (availableSlots.length > 0 && !availableSlots.some((s) => s.id === slotId)) {
      setSlotId(availableSlots[0].id)
    }
  }, [availableSlots, slotId])

  const addToCart = (item: SeedItem) => {
    setCart((prev) => {
      const old = prev.find((x) => x.id === item.id)
      if (old) return prev.map((x) => (x.id === item.id ? { ...x, qty: x.qty + 1 } : x))
      return [...prev, { ...item, qty: 1 }]
    })
  }

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((x) => (x.id === id ? { ...x, qty: Math.max(0, x.qty + delta) } : x))
        .filter((x) => x.qty > 0)
    )
  }

  const submit = async () => {
    setSaving(true)
    setError('')

    try {
      if (!supabase) throw new Error('ยังไม่เชื่อมฐานข้อมูล')
      if (!selectedFarmer) throw new Error('กรุณาค้นหาและเลือกสมาชิก')
      if (cart.length === 0) throw new Error('กรุณาเพิ่มเมล็ดพันธุ์ลงตะกร้า')
      if (!selectedLocation) throw new Error('กรุณาเลือกจุดรับสินค้า')
      if (!selectedSlot) throw new Error('กรุณาเลือกรอบรับ')

      const bookingNo = genBookingNo()

      const { data: booking, error: bErr } = await supabase
        .from('seed_bookings')
        .insert({
          booking_no: bookingNo,
          booking_date: today(),
          receive_date: selectedSlot.pickup_date,

          farmer_id: selectedFarmer.id,
          farmer_name: selectedFarmer.name,
          farmer_phone: selectedFarmer.phone,

          total_amount: total,
          deposit_amount: 0,
          balance_amount: total,

          status: 'pending',
          payment_status: 'unpaid',

          pickup_location_id: selectedLocation.id,
          pickup_slot_id: selectedSlot.id,
          pickup_location_name: selectedLocation.name,
          pickup_date: selectedSlot.pickup_date,
          pickup_time: selectedSlot.pickup_time,

          note,
          created_by: user?.id ?? '',
          created_by_name: user?.name ?? 'ทีมภาคสนาม',
          booking_source: 'field',
        })
        .select('id')
        .single()

      if (bErr) throw new Error(bErr.message)

      const rows = cart.map((x) => ({
        booking_id: booking.id,
        lot_id: null,
        lot_no: null,
        variety_id: x.varietyId,
        variety_name: x.name,
        quantity: x.qty,
        sell_price_per_bag: x.price,
        total_amount: x.qty * x.price,
        reserved_quantity: 0,
        status: 'pending',
      }))

      const { error: iErr } = await supabase.from('seed_booking_items').insert(rows)
      if (iErr) throw new Error(iErr.message)

      const nextBooked = Number(selectedSlot.booked_qty || 0) + totalQty

      const { error: slotErr } = await supabase
        .from('pickup_slots')
        .update({
          booked_qty: nextBooked,
          status:
            nextBooked >= Number(selectedSlot.capacity_qty || 0)
              ? 'full'
              : selectedSlot.status,
        })
        .eq('id', selectedSlot.id)

      if (slotErr) throw new Error(slotErr.message)

      flash(true, `✅ จองสำเร็จ เลขที่ ${bookingNo}`)
      setCart([])
      setSelectedFarmerId('')
      setFarmerSearch('')
      setNote('')
      setLocationId('')
      setSlotId('')
      setTab('list')

      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'จองไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-cyan-600 text-white px-5 py-4 flex items-center gap-3 sticky top-0 z-40">
        <button onClick={() => navigate('/field')} className="p-1">
          <ChevronLeft className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-2.5 flex-1">
          <Package className="w-5 h-5" />
          <div>
            <div className="font-bold text-base">จองเมล็ดพันธุ์</div>
            <div className="text-[10px] text-cyan-100">สำหรับทีมภาคสนาม</div>
          </div>
        </div>

        <button onClick={() => void load()} className="p-1.5 bg-white/20 rounded-xl">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="bg-white border-b border-gray-200 px-5 pt-3 pb-0 sticky top-[68px] z-30">
        <div className="flex gap-1">
          {([
            ['book', '📋', 'งานสนาม'],
            ['list', '🕐', 'รายการจอง'],
          ] as const).map(([k, ic, lb]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 ${
                tab === k
                  ? 'border-cyan-600 text-cyan-700'
                  : 'border-transparent text-gray-400'
              }`}
            >
              {k === 'list' && pendingCount > 0 && (
                <span className="w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
              <span>{ic}</span>
              <span>{lb}</span>
            </button>
          ))}
        </div>
      </div>

      {toast && (
        <div
          className={`mx-5 mt-4 rounded-2xl px-4 py-3 text-sm font-semibold border-2 ${
            toast.ok
              ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
              : 'bg-red-50 border-red-300 text-red-700'
          }`}
        >
          {toast.msg}
          <button onClick={() => setToast(null)} className="float-right text-lg opacity-60">
            ×
          </button>
        </div>
      )}

      {error && (
        <div className="mx-5 mt-4 bg-red-50 border-2 border-red-300 rounded-xl p-3 flex gap-2">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {tab === 'book' && (
        <div className="p-4 space-y-4 pb-10">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <Search className="w-4 h-4 text-cyan-600" />
              <span className="font-bold text-gray-800 text-sm">เลือกสมาชิก</span>

              {selectedFarmer && (
                <button
                  onClick={() => {
                    setSelectedFarmerId('')
                    setFarmerSearch('')
                  }}
                  className="ml-auto text-xs text-gray-400"
                >
                  เปลี่ยน ✕
                </button>
              )}
            </div>

            {selectedFarmer ? (
              <div className="px-4 py-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center">
                  {selectedFarmer.name.charAt(0)}
                </div>
                <div>
                  <div className="font-bold text-gray-900">{selectedFarmer.name}</div>
                  <div className="text-xs text-gray-500">{selectedFarmer.phone}</div>
                </div>
                <span className="ml-auto text-emerald-600 text-lg">✓</span>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                <input
                  value={farmerSearch}
                  onChange={(e) => setFarmerSearch(e.target.value)}
                  placeholder="ค้นหาชื่อ / เบอร์ / เลขบัตร"
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm"
                />

                {farmerSearch && (
                  <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100 max-h-48 overflow-y-auto">
                    {filteredFarmers.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => {
                          setSelectedFarmerId(m.id)
                          setFarmerSearch(m.name)
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-cyan-50 text-left"
                      >
                        <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 font-bold text-sm flex items-center justify-center">
                          {m.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 text-sm">{m.name}</div>
                          <div className="text-xs text-gray-400">
                            {m.phone} | {m.idCard || '-'}
                          </div>
                        </div>
                        <ChevronDown className="w-4 h-4 text-gray-400 ml-auto rotate-[-90deg]" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {groupedItems.map((group) => (
            <div
              key={group.supplier}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
            >
              <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                  Supplier: {group.supplier}
                </span>
              </div>

              {group.rows.map((v) => {
                const cartItem = cart.find((i) => i.id === v.id)

                return (
                  <div
                    key={v.id}
                    className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-900">{v.name}</div>
                    </div>

                    <div className="text-right flex-shrink-0 mr-2">
                      <div className="font-bold text-cyan-700">{fmt(v.price)}</div>
                      <div className="text-[10px] text-gray-400">บาท/ถุง</div>
                    </div>

                    {cartItem ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQty(v.id, -1)}
                          className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
                        >
                          <Minus className="w-4 h-4" />
                        </button>

                        <span className="w-6 text-center font-bold">{cartItem.qty}</span>

                        <button
                          onClick={() => updateQty(v.id, 1)}
                          className="w-8 h-8 rounded-full bg-cyan-600 text-white flex items-center justify-center"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(v)}
                        className="w-9 h-9 rounded-full bg-cyan-600 text-white flex items-center justify-center shadow-md"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          ))}

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
            <div className="font-bold text-gray-800 text-sm flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-cyan-600" />
              ตะกร้าจอง
            </div>

            {cart.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-sm">ยังไม่มีสินค้า</div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{item.name}</div>
                    <div className="text-xs text-gray-400">
                      {item.qty} ถุง × {fmt(item.price)} บาท
                    </div>
                  </div>

                  <div className="font-bold">{fmt(item.qty * item.price)}</div>

                  <button
                    onClick={() => updateQty(item.id, -item.qty)}
                    className="text-gray-300 hover:text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}

            <select
              value={locationId}
              onChange={(e) => {
                setLocationId(e.target.value)
                setSlotId('')
              }}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm bg-white"
            >
              <option value="">เลือกจุดรับสินค้า</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>

            {selectedLocation?.address && (
              <div className="text-xs text-gray-500">{selectedLocation.address}</div>
            )}

            <select
              value={slotId}
              onChange={(e) => setSlotId(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm bg-white"
            >
              <option value="">เลือกรอบรับ</option>
              {availableSlots.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.pickup_date} {s.pickup_time} | เหลือ{' '}
                  {fmt(Number(s.capacity_qty || 0) - Number(s.booked_qty || 0))}
                </option>
              ))}
            </select>

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="หมายเหตุ (ถ้ามี)"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm"
            />

            <div className="flex items-center justify-between mb-2 pt-2 border-t">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-orange-500" />
                <span className="font-bold text-gray-700">รวม (เครดิต)</span>
              </div>

              <div className="text-right">
                <span className="text-2xl font-bold text-orange-600">{fmt(total)}</span>
                <span className="text-sm text-gray-400 ml-1">บาท</span>
              </div>
            </div>

            <button
              onClick={submit}
              disabled={saving || !selectedFarmer || cart.length === 0 || !selectedLocation || !selectedSlot}
              className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 ${
                saving || !selectedFarmer || cart.length === 0 || !selectedLocation || !selectedSlot
                  ? 'bg-gray-100 text-gray-400'
                  : 'bg-cyan-600 text-white shadow-lg'
              }`}
            >
              {saving ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  กำลังจอง...
                </>
              ) : (
                <>
                  <Package className="w-5 h-5" />
                  ยืนยันจอง {cart.length > 0 ? `${fmt(total)} บาท` : ''}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {tab === 'list' && (
        <div className="p-4 space-y-4 pb-10">
          <div className="flex gap-2 flex-wrap">
            {(['all', 'pending', 'preparing', 'ready', 'converted'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                  filterStatus === s
                    ? 'bg-cyan-600 text-white border-cyan-600'
                    : 'bg-white border-gray-200 text-gray-600'
                }`}
              >
                {s === 'all' ? 'ทั้งหมด' : statusLabel[s]} (
                {bookings.filter((b) => s === 'all' || b.status === s).length})
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value)}
              placeholder="ค้นหาชื่อ เบอร์ เลขจอง"
              className="w-full pl-9 pr-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm"
            />
          </div>

          {displayedBookings.length === 0 ? (
            <div className="text-center py-14 text-gray-400">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">ไม่มีรายการ</p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayedBookings.map((b) => (
                <div
                  key={b.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-900">{b.farmer_name}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            statusBadge[b.status] ?? 'bg-gray-100'
                          }`}
                        >
                          {statusLabel[b.status] ?? b.status}
                        </span>
                      </div>

                      <div className="text-xs text-gray-500 mt-0.5">{b.farmer_phone}</div>
                      <div className="text-sm font-semibold text-gray-800 mt-1">
                        {b.booking_no}
                      </div>
                    </div>

                    <div className="font-bold text-orange-600 whitespace-nowrap">
                      {fmt(b.total_amount)} บาท
                    </div>
                  </div>

                  {b.note && (
                    <p className="text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2 mt-3">
                      {b.note}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
