import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronLeft, RefreshCw, Check, X, Package,
  Search, AlertCircle, CreditCard, Plus, Minus,
  ChevronDown, ChevronUp, MapPin,
} from 'lucide-react'
import { useAuth } from '../../routes/AuthContext'
import {
  fetchGroupBookings, createBooking, updateBookingStatus,
  fetchAdminMembers,
  type SeedBooking, type BookingStatus,
} from '../../lib/db'
import { isSupabaseReady } from '../../lib/supabase'
import { SEED_VARIETIES, type SeedVariety } from '../../data/mockData'

// ── constants ──────────────────────────────────────────────────────────────────
const PICKUP_LOCATIONS = [
  'โกดังกลาง สาขาบุรีรัมย์',
  'สาขาประโคนชัย',
  'สาขากระสัง',
  'สาขาพุทไธสง',
  'จัดส่งถึงที่',
]

const PICKUP_ROUNDS = [
  'รอบเช้า 08:00 – 12:00',
  'รอบบ่าย 13:00 – 17:00',
  'รอบเย็น 17:00 – 19:00',
  'นัดเวลาพิเศษ',
]

const STATUS_CFG = {
  pending:   { label: 'รอยืนยัน',     dot: 'bg-amber-400',   badge: 'bg-amber-100 text-amber-700' },
  confirmed: { label: 'ยืนยันแล้ว',   dot: 'bg-blue-400',    badge: 'bg-blue-100 text-blue-700' },
  received:  { label: 'รับสินค้าแล้ว', dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'ยกเลิก',       dot: 'bg-red-400',     badge: 'bg-red-100 text-red-700' },
}

interface CartItem { variety: SeedVariety; qty: number }
interface FoundMember { id: string; name: string; phone: string; code: string }

function fmt(n: number) { return n.toLocaleString('th-TH') }

// ── component ──────────────────────────────────────────────────────────────────
export default function FieldSeedBooking() {
  const { user }  = useAuth()
  const navigate  = useNavigate()

  const [tab, setTab] = useState<'book' | 'list'>('book')

  // ── booking state ──────────────────────────────────────────────────────────
  const [memberSearch, setMemberSearch] = useState('')
  const [memberResults, setMemberResults] = useState<FoundMember[]>([])
  const [selectedMember, setSelectedMember] = useState<FoundMember | null>(null)
  const [searching, setSearching] = useState(false)
  const [cart, setCart] = useState<CartItem[]>([])
  const [location, setLocation] = useState('')
  const [round, setRound] = useState('')
  const [pickupDate, setPickupDate] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [bookErr, setBookErr] = useState<string | null>(null)
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null)

  // ── list state ─────────────────────────────────────────────────────────────
  const [bookings, setBookings] = useState<SeedBooking[]>([])
  const [loading, setLoading] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [listSearch, setListSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [acting, setActing] = useState<string | null>(null)

  const flash = (ok: boolean, msg: string) => {
    setToast({ ok, msg }); setTimeout(() => setToast(null), 4500)
  }

  const loadBookings = useCallback(async () => {
    setLoading(true)
    const res = await fetchGroupBookings(user?.id ?? '')
    setBookings(res.data ?? [])
    setLoading(false)
  }, [user?.id])

  useEffect(() => { loadBookings() }, [loadBookings])

  // ── member search ──────────────────────────────────────────────────────────
  const doSearch = async () => {
    if (!memberSearch.trim()) return
    setSearching(true)
    const res = await fetchAdminMembers()
    const q   = memberSearch.toLowerCase()
    const found = (res as unknown as Record<string, unknown>[])
      .filter(u =>
        (u.role === 'farmer' || u.role === 'member') &&
        (
          String(u.full_name ?? '').toLowerCase().includes(q) ||
          String(u.phone ?? '').includes(q) ||
          String(u.id_card ?? '').includes(q)
        )
      )
      .map(u => ({
        id:    String(u.id),
        name:  String(u.full_name ?? ''),
        phone: String(u.phone ?? ''),
        code:  String(u.id_card ?? ''),
      }))
    setMemberResults(found)
    setSearching(false)
  }

  // ── cart helpers ───────────────────────────────────────────────────────────
  const addToCart = (v: SeedVariety) => {
    setCart(prev => {
      const ex = prev.find(i => i.variety.id === v.id)
      if (ex) return prev.map(i => i.variety.id === v.id ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { variety: v, qty: 1 }]
    })
  }

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev
      .map(i => i.variety.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i)
      .filter(i => i.qty > 0)
    )
  }

  const cartTotal = cart.reduce((sum, i) => sum + i.variety.pricePerKg * i.qty, 0)
  const cartTotalQty = cart.reduce((sum, i) => sum + i.qty, 0)

  // ── submit booking ─────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!selectedMember) { setBookErr('กรุณาค้นหาและเลือกสมาชิก'); return }
    if (cart.length === 0) { setBookErr('กรุณาเพิ่มเมล็ดพันธุ์ลงตะกร้า'); return }
    if (!location) { setBookErr('กรุณาเลือกจุดรับสินค้า'); return }
    if (!round) { setBookErr('กรุณาเลือกรอบรับ'); return }
    if (!pickupDate) { setBookErr('กรุณาเลือกวันนัดรับ'); return }

    setSaving(true); setBookErr(null)

    let allOk = true
    for (const item of cart) {
      const res = await createBooking({
        profile_id:     selectedMember.id,
        variety_id:     item.variety.id,
        variety_name:   item.variety.name,
        quantity_kg:    item.qty,
        booked_by:      user?.id ?? '',
        booked_by_role: 'sales',
        pickup_date:    pickupDate,
        pickup_note:    `${location} · ${round}${note ? ' · ' + note : ''}`,
        price_per_kg:   item.variety.pricePerKg,
      })
      if (isSupabaseReady && res.error) { allOk = false; setBookErr(res.error); break }
    }

    setSaving(false)
    if (!allOk) return

    flash(true, `✅ จอง ${cartTotalQty} กก. รวม ${fmt(cartTotal)} บาท ให้ ${selectedMember.name}`)
    // reset
    setCart([]); setSelectedMember(null); setMemberSearch('')
    setMemberResults([]); setLocation(''); setRound('')
    setPickupDate(''); setNote(''); setTab('list')
    await loadBookings()
  }

  const act = async (id: string, status: BookingStatus) => {
    setActing(id)
    const res = await updateBookingStatus(id, status)
    if (isSupabaseReady && res.error) flash(false, res.error)
    else flash(true,
      status === 'confirmed' ? '✅ ยืนยันแล้ว — สมาชิกเห็นใน LINE'
      : status === 'received' ? '📦 รับสินค้าแล้ว — ตัด stock'
      : '❌ ยกเลิกแล้ว'
    )
    setActing(null); await loadBookings()
  }

  const displayedBookings = bookings
    .filter(b => filterStatus === 'all' || b.status === filterStatus)
    .filter(b =>
      (b.member_name ?? '').includes(listSearch) ||
      (b.member_phone ?? '').includes(listSearch) ||
      b.variety_name.includes(listSearch)
    )

  const pendingCount = bookings.filter(b => b.status === 'pending').length

  // ── group varieties by seller ──────────────────────────────────────────────
  const bySeller = SEED_VARIETIES.reduce<Record<string, SeedVariety[]>>((acc, v) => {
    const seller = v.seller.replace('บริษัท ', '').replace(' จำกัด', '').replace(' (Thailand)', '')
    ;(acc[seller] = acc[seller] ?? []).push(v)
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-cyan-600 text-white px-5 py-4 flex items-center gap-3 sticky top-0 z-40">
        <button onClick={() => navigate(-1)} className="p-1">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2.5 flex-1">
          <Package className="w-5 h-5" />
          <div>
            <div className="font-bold text-base">จองเมล็ดพันธุ์</div>
            <div className="text-[10px] text-cyan-100">สำหรับทีมภาคสนาม</div>
          </div>
        </div>
        <button onClick={loadBookings} className="p-1.5 bg-white/20 rounded-xl">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-5 pt-3 pb-0 sticky top-[68px] z-30">
        <div className="flex gap-1">
          {([
            ['book', '📋', 'งานสนาม'],
            ['list', '🕐', 'รายการจอง'],
          ] as const).map(([k, ic, lb]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all
                ${tab === k
                  ? 'border-cyan-600 text-cyan-700'
                  : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
              {k === 'list' && pendingCount > 0 && (
                <span className="w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center">{pendingCount}</span>
              )}
              <span>{ic}</span><span>{lb}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`mx-5 mt-4 rounded-2xl px-4 py-3 flex items-center gap-2 text-sm font-semibold border-2
          ${toast.ok ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-red-50 border-red-300 text-red-700'}`}>
          {toast.ok ? <Check className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          {toast.msg}
          <button onClick={() => setToast(null)} className="ml-auto text-lg opacity-60 leading-none">×</button>
        </div>
      )}

      {/* ══ TAB: จองใหม่ ══ */}
      {tab === 'book' && (
        <div className="p-4 space-y-4 pb-10">

          {bookErr && (
            <div className="bg-red-50 border-2 border-red-300 rounded-xl p-3 flex gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{bookErr}</p>
            </div>
          )}

          {/* 1. เลือกสมาชิก */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <Search className="w-4 h-4 text-cyan-600" />
              <span className="font-bold text-gray-800 text-sm">เลือกสมาชิก</span>
              {selectedMember && (
                <button onClick={() => { setSelectedMember(null); setMemberResults([]) }}
                  className="ml-auto text-xs text-gray-400 hover:text-red-500 transition-colors">
                  เปลี่ยน ✕
                </button>
              )}
            </div>

            {selectedMember ? (
              <div className="px-4 py-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center flex-shrink-0">
                  {selectedMember.name.charAt(0)}
                </div>
                <div>
                  <div className="font-bold text-gray-900">{selectedMember.name}</div>
                  <div className="text-xs text-gray-500">{selectedMember.phone}</div>
                </div>
                <span className="ml-auto text-emerald-600 text-lg">✓</span>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                <div className="flex gap-2">
                  <input
                    value={memberSearch}
                    onChange={e => { setMemberSearch(e.target.value); setMemberResults([]) }}
                    onKeyDown={e => e.key === 'Enter' && doSearch()}
                    placeholder="ค้นหาชื่อ / เบอร์ / เลขบัตร"
                    className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500" />
                  <button onClick={doSearch} disabled={searching}
                    className="px-4 bg-cyan-600 text-white rounded-xl font-semibold text-sm hover:bg-cyan-700 disabled:opacity-60 flex items-center gap-1.5">
                    {searching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    ค้นหา
                  </button>
                </div>

                {memberResults.length > 0 && (
                  <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100 max-h-48 overflow-y-auto">
                    {memberResults.map(m => (
                      <button key={m.id} onClick={() => { setSelectedMember(m); setMemberResults([]) }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-cyan-50 transition-colors text-left">
                        <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 font-bold text-sm flex items-center justify-center flex-shrink-0">
                          {m.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 text-sm">{m.name}</div>
                          <div className="text-xs text-gray-400">{m.phone}</div>
                        </div>
                        <ChevronDown className="w-4 h-4 text-gray-400 ml-auto rotate-[-90deg]" />
                      </button>
                    ))}
                  </div>
                )}
                {memberSearch && memberResults.length === 0 && !searching && (
                  <p className="text-xs text-gray-400 text-center py-2">ไม่พบสมาชิก — ลองค้นหาด้วยชื่อหรือเบอร์</p>
                )}
              </div>
            )}
          </div>

          {/* 2. รายการเมล็ดพันธุ์ */}
          {Object.entries(bySeller).map(([seller, varieties]) => (
            <div key={seller} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Supplier: {seller}</span>
              </div>
              {varieties.map(v => {
                const cartItem = cart.find(i => i.variety.id === v.id)
                return (
                  <div key={v.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-900">{v.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{v.daysToHarvest} วัน · {v.seedPerRai} กก./ไร่</div>
                    </div>
                    <div className="text-right flex-shrink-0 mr-2">
                      <div className="font-bold text-cyan-700">{fmt(v.pricePerKg)}</div>
                      <div className="text-[10px] text-gray-400">บาท/ถุง</div>
                    </div>
                    {cartItem ? (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => updateQty(v.id, -1)}
                          className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200 transition-colors">
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-6 text-center font-bold text-gray-900">{cartItem.qty}</span>
                        <button onClick={() => updateQty(v.id, 1)}
                          className="w-8 h-8 rounded-full bg-cyan-600 text-white flex items-center justify-center hover:bg-cyan-700 transition-colors">
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => addToCart(v)}
                        className="w-9 h-9 rounded-full bg-cyan-600 text-white flex items-center justify-center hover:bg-cyan-700 transition-colors flex-shrink-0 shadow-md">
                        <Plus className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          ))}

          {/* 3. ตะกร้า */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <Package className="w-4 h-4 text-cyan-600" />
              <span className="font-bold text-gray-800 text-sm">ตะกร้าจอง</span>
              {cart.length > 0 && (
                <span className="ml-auto text-xs text-gray-400">{cartTotalQty} ถุง</span>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-sm">ยังไม่มีสินค้า</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {cart.map(item => (
                  <div key={item.variety.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 text-sm">{item.variety.name}</div>
                      <div className="text-xs text-gray-400">{item.qty} ถุง × {fmt(item.variety.pricePerKg)} บาท</div>
                    </div>
                    <div className="font-bold text-gray-800 flex-shrink-0">
                      {fmt(item.qty * item.variety.pricePerKg)} บาท
                    </div>
                    <button onClick={() => updateQty(item.variety.id, -item.qty)}
                      className="text-gray-300 hover:text-red-500 transition-colors ml-1">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4. จุดรับ + รอบรับ */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
            <div className="flex items-center gap-2 pb-1">
              <MapPin className="w-4 h-4 text-cyan-600" />
              <span className="font-bold text-gray-800 text-sm">สถานที่และเวลารับ</span>
            </div>

            <select value={location} onChange={e => setLocation(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:border-cyan-500">
              <option value="">เลือกจุดรับสินค้า</option>
              {PICKUP_LOCATIONS.map(l => <option key={l}>{l}</option>)}
            </select>

            <select value={round} onChange={e => setRound(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:border-cyan-500">
              <option value="">เลือกรอบรับ</option>
              {PICKUP_ROUNDS.map(r => <option key={r}>{r}</option>)}
            </select>

            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1.5">วันนัดรับ *</label>
              <input type="date" value={pickupDate}
                onChange={e => setPickupDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500" />
            </div>

            <textarea value={note} onChange={e => setNote(e.target.value)}
              rows={2} placeholder="หมายเหตุ (ถ้ามี)"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500 resize-none" />
          </div>

          {/* 5. รวม + Submit */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            {/* Credit summary */}
            {cart.length > 0 && (
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-orange-500" />
                  <span className="font-bold text-gray-700">รวม (เครดิต)</span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-orange-600">{fmt(cartTotal)}</span>
                  <span className="text-sm text-gray-400 ml-1">บาท</span>
                </div>
              </div>
            )}

            <button onClick={handleSubmit}
              disabled={saving || !selectedMember || cart.length === 0 || !location || !round || !pickupDate}
              className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all
                ${saving || !selectedMember || cart.length === 0 || !location || !round || !pickupDate
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-cyan-600 text-white hover:bg-cyan-700 active:scale-[.98] shadow-lg'}`}>
              {saving
                ? <><RefreshCw className="w-5 h-5 animate-spin" />กำลังจอง...</>
                : <>
                    <Package className="w-5 h-5" />
                    ยืนยันจอง
                    {cart.length > 0 && ` ${fmt(cartTotal)} บาท`}
                  </>}
            </button>

            {cart.length > 0 && (
              <p className="text-center text-xs text-gray-400 mt-2">
                สมาชิกจะเห็นรายการและยอดเครดิตใน LINE ทันที
              </p>
            )}
          </div>
        </div>
      )}

      {/* ══ TAB: รายการจอง ══ */}
      {tab === 'list' && (
        <div className="p-4 space-y-4 pb-10">

          {/* Filter */}
          <div className="flex gap-2 flex-wrap">
            {(['all', 'pending', 'confirmed', 'received', 'cancelled'] as const).map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all
                  ${filterStatus === s ? 'bg-cyan-600 text-white border-cyan-600' : 'bg-white border-gray-200 text-gray-600'}`}>
                {s === 'all' ? 'ทั้งหมด' : STATUS_CFG[s as keyof typeof STATUS_CFG]?.label ?? s}
                {' '}({bookings.filter(b => s === 'all' || b.status === s).length})
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input value={listSearch} onChange={e => setListSearch(e.target.value)}
              placeholder="ค้นหาชื่อ เบอร์ พันธุ์"
              className="w-full pl-9 pr-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-cyan-500" />
          </div>

          {loading ? (
            <div className="flex justify-center py-10"><RefreshCw className="w-6 h-6 text-cyan-600 animate-spin" /></div>
          ) : displayedBookings.length === 0 ? (
            <div className="text-center py-14 text-gray-400">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">ไม่มีรายการ</p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayedBookings.map(b => {
                const st    = STATUS_CFG[b.status as keyof typeof STATUS_CFG]
                const isA   = acting === b.id
                const isExp = expanded === b.id
                const credit = b.total_price ?? (b.quantity_kg * (b.price_per_kg ?? 0))

                return (
                  <div key={b.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <button className="w-full p-4 text-left hover:bg-gray-50/50 transition-colors"
                      onClick={() => setExpanded(isExp ? null : b.id)}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-gray-900">{b.member_name || 'ไม่ระบุ'}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${st?.badge}`}>{st?.label}</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">{b.member_phone}</div>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <span className="text-sm font-semibold text-gray-800">{b.variety_name} {b.quantity_kg} กก.</span>
                            {credit > 0 && <span className="text-sm font-bold text-orange-600 ml-1">= {fmt(credit)} บาท</span>}
                          </div>
                        </div>
                        {isExp ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                      </div>
                    </button>

                    {isExp && (
                      <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-3">
                        {b.pickup_date && (
                          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs">
                            <div className="text-blue-400">📅 วันนัดรับ</div>
                            <div className="font-bold text-blue-800 mt-0.5">
                              {new Date(b.pickup_date).toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </div>
                          </div>
                        )}
                        {b.pickup_note && <p className="text-xs text-gray-500 bg-white rounded-xl px-3 py-2">{b.pickup_note}</p>}

                        <div className="flex gap-2">
                          {b.status === 'pending' && <>
                            <button onClick={() => act(b.id, 'cancelled')} disabled={isA}
                              className={`flex-1 border-2 border-red-200 text-red-600 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-1 ${isA ? 'opacity-60' : 'hover:bg-red-50'}`}>
                              {isA ? <RefreshCw className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}ยกเลิก
                            </button>
                            <button onClick={() => act(b.id, 'confirmed')} disabled={isA}
                              className={`flex-1 bg-cyan-600 text-white py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-1 ${isA ? 'opacity-60' : 'hover:bg-cyan-700'}`}>
                              {isA ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}ยืนยัน
                            </button>
                          </>}
                          {b.status === 'confirmed' && (
                            <button onClick={() => act(b.id, 'received')} disabled={isA}
                              className={`flex-1 bg-emerald-600 text-white py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 ${isA ? 'opacity-60' : 'hover:bg-emerald-700'}`}>
                              {isA ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}รับสินค้าแล้ว
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
