import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronLeft, RefreshCw, Check, X, Package,
  Search, AlertCircle, CreditCard, ChevronDown, ChevronUp,
} from 'lucide-react'
import { useAuth } from '../../routes/AuthContext'
import {
  fetchGroupBookings, createBooking, updateBookingStatus,
  type SeedBooking, type BookingStatus,
} from '../../lib/db'
import { isSupabaseReady } from '../../lib/supabase'
import { SEED_VARIETIES, type SeedVariety } from '../../data/mockData'

// ── helpers ────────────────────────────────────────────────────────────────────
const STATUS_CFG = {
  pending:   { label: 'รอยืนยัน',     dot: 'bg-amber-400',   badge: 'bg-amber-100 text-amber-700' },
  confirmed: { label: 'ยืนยันแล้ว',   dot: 'bg-blue-400',    badge: 'bg-blue-100 text-blue-700' },
  received:  { label: 'รับสินค้าแล้ว', dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'ยกเลิก',       dot: 'bg-red-400',     badge: 'bg-red-100 text-red-700' },
}

function fmt(n: number) { return n.toLocaleString('th-TH') }

// ── component ──────────────────────────────────────────────────────────────────
export default function FieldSeedBooking() {
  const { user }  = useAuth()
  const navigate  = useNavigate()

  const [tab, setTab]           = useState<'list' | 'book'>('list')
  const [bookings, setBookings] = useState<SeedBooking[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [acting, setActing]     = useState<string | null>(null)
  const [toast, setToast]       = useState<{ ok: boolean; msg: string } | null>(null)

  // booking form state
  const formRef  = useRef<HTMLFormElement>(null)
  const [selVar, setSelVar]     = useState<SeedVariety>(SEED_VARIETIES[0])
  const [qty, setQty]           = useState<number>(0)
  const [saving, setSaving]     = useState(false)
  const [bookErr, setBookErr]   = useState<string | null>(null)
  const [pickupDate, setPickupDate] = useState('')

  const flash = (ok: boolean, msg: string) => {
    setToast({ ok, msg }); setTimeout(() => setToast(null), 4000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetchGroupBookings(user?.id ?? '')
    setBookings(res.data ?? [])
    setLoading(false)
  }, [user?.id])

  useEffect(() => { load() }, [load])

  // computed credit
  const creditTotal = qty > 0 && selVar ? qty * selVar.pricePerKg : 0

  const act = async (id: string, status: BookingStatus) => {
    setActing(id)
    const res = await updateBookingStatus(id, status)
    if (isSupabaseReady && res.error) flash(false, res.error)
    else flash(true,
      status === 'confirmed' ? '✅ ยืนยันแล้ว — สมาชิกเห็นได้ทันที'
      : status === 'received' ? '📦 รับสินค้าแล้ว — ตัด stock'
      : '❌ ยกเลิกแล้ว'
    )
    setActing(null); await load()
  }

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault()
    const fd       = new FormData(formRef.current!)
    const memberId = (fd.get('member_id') as string ?? '').trim()
    const note     = (fd.get('pickup_note') as string ?? '').trim()

    if (!memberId) { setBookErr('กรุณากรอก Profile ID ของสมาชิก'); return }
    if (!qty || qty <= 0) { setBookErr('กรุณากรอกจำนวน (กก.)'); return }
    if (!pickupDate) { setBookErr('กรุณาเลือกวันนัดรับ'); return }

    setSaving(true); setBookErr(null)
    const res = await createBooking({
      profile_id:     memberId,
      variety_id:     selVar.id,
      variety_name:   selVar.name,
      quantity_kg:    qty,
      booked_by:      user?.id ?? '',
      booked_by_role: 'sales',
      pickup_date:    pickupDate,
      pickup_note:    note || undefined,
      price_per_kg:   selVar.pricePerKg,   // บันทึกราคา ณ วันจอง
    })
    setSaving(false)
    if (isSupabaseReady && res.error) { setBookErr(res.error); return }

    flash(true, `✅ จอง ${selVar.name} ${qty} กก. = ${fmt(creditTotal)} บาท (เครดิต)`)
    // reset form
    setQty(0); setPickupDate(''); setBookErr(null)
    formRef.current?.reset()
    setTab('list'); await load()
  }

  const displayed = bookings
    .filter(b => filterStatus === 'all' || b.status === filterStatus)
    .filter(b =>
      (b.member_name ?? '').includes(search) ||
      (b.member_phone ?? '').includes(search) ||
      b.variety_name.includes(search)
    )

  const pendingCount = bookings.filter(b => b.status === 'pending').length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-cyan-600 text-white px-5 py-4 flex items-center gap-3 sticky top-0 z-40">
        <button onClick={() => navigate(-1)} className="p-1"><ChevronLeft className="w-6 h-6" /></button>
        <div className="flex-1">
          <div className="font-bold text-lg">จองเมล็ดพันธุ์</div>
          <div className="text-xs text-cyan-100">
            {pendingCount > 0 ? `⚠️ รอยืนยัน ${pendingCount} ราย` : 'ไม่มีรายการรอ'}
          </div>
        </div>
        <button onClick={load} className="p-1.5 bg-white/20 rounded-xl">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-5 pt-3 pb-0 sticky top-[68px] z-30">
        <div className="flex bg-gray-100 rounded-2xl p-1">
          {([['list', '📋', 'รายการจอง'], ['book', '➕', 'จองให้สมาชิก']] as const).map(([k, ic, lb]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all
                ${tab === k ? 'bg-white text-cyan-700 shadow-sm' : 'text-gray-500'}`}>
              {k === 'list' && pendingCount > 0 && (
                <span className="w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center">{pendingCount}</span>
              )}
              <span>{ic}</span><span>{lb}</span>
            </button>
          ))}
        </div>
        <div className="h-4" />
      </div>

      <div className="p-5 space-y-4 pb-10">

        {/* Toast */}
        {toast && (
          <div className={`rounded-2xl px-4 py-3 flex items-center gap-2 text-sm font-semibold border-2
            ${toast.ok ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-red-50 border-red-300 text-red-700'}`}>
            {toast.ok ? <Check className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
            {toast.msg}
            <button onClick={() => setToast(null)} className="ml-auto text-lg opacity-60">×</button>
          </div>
        )}

        {/* ══ TAB: รายการจอง ══ */}
        {tab === 'list' && (<>

          {/* Filter tabs */}
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
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อ เบอร์ พันธุ์"
              className="w-full pl-9 pr-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-cyan-500" />
          </div>

          {/* List */}
          {loading ? (
            <div className="flex justify-center py-10"><RefreshCw className="w-6 h-6 text-cyan-600 animate-spin" /></div>
          ) : displayed.length === 0 ? (
            <div className="text-center py-14 text-gray-400">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">ไม่มีรายการ</p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayed.map(b => {
                const st  = STATUS_CFG[b.status as keyof typeof STATUS_CFG]
                const isA = acting === b.id
                const isExp = expanded === b.id
                const credit = b.total_price ?? (b.quantity_kg * (b.price_per_kg ?? 0))

                return (
                  <div key={b.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Card header */}
                    <button className="w-full p-4 text-left hover:bg-gray-50/50 transition-colors"
                      onClick={() => setExpanded(isExp ? null : b.id)}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-gray-900">{b.member_name || 'ไม่ระบุ'}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${st?.badge}`}>{st?.label}</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">{b.member_phone}</div>
                          {/* Credit amount — prominent */}
                          {credit > 0 && (
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <CreditCard className="w-3.5 h-3.5 text-orange-500" />
                              <span className="text-sm font-bold text-orange-600">{fmt(credit)} บาท</span>
                              <span className="text-xs text-gray-400">(เครดิต)</span>
                            </div>
                          )}
                        </div>
                        {isExp
                          ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
                          : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />}
                      </div>
                    </button>

                    {/* Expanded detail */}
                    {isExp && (
                      <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-3">
                        {/* Detail grid */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-white rounded-xl p-2.5">
                            <div className="text-gray-400">พันธุ์</div>
                            <div className="font-bold text-gray-800 mt-0.5">{b.variety_name}</div>
                          </div>
                          <div className="bg-white rounded-xl p-2.5">
                            <div className="text-gray-400">จำนวน</div>
                            <div className="font-bold text-gray-800 mt-0.5">{b.quantity_kg} กก.</div>
                          </div>
                          {b.price_per_kg && (
                            <div className="bg-white rounded-xl p-2.5">
                              <div className="text-gray-400">ราคา/กก.</div>
                              <div className="font-bold text-gray-800 mt-0.5">{fmt(b.price_per_kg)} บาท</div>
                            </div>
                          )}
                          {credit > 0 && (
                            <div className="bg-orange-50 border border-orange-200 rounded-xl p-2.5">
                              <div className="text-orange-400">ยอดเครดิต</div>
                              <div className="font-bold text-orange-700 mt-0.5">{fmt(credit)} บาท</div>
                            </div>
                          )}
                        </div>

                        {b.pickup_date && (
                          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                            <div className="text-xs text-blue-400">📅 วันนัดรับสินค้า</div>
                            <div className="font-bold text-blue-800 text-sm mt-0.5">
                              {new Date(b.pickup_date).toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            </div>
                          </div>
                        )}

                        {b.pickup_note && (
                          <p className="text-xs text-gray-500 bg-white rounded-xl px-3 py-2">{b.pickup_note}</p>
                        )}

                        <div className="text-[10px] text-gray-400">
                          จองโดย: {b.booked_by_role === 'self' ? 'สมาชิก' : b.booked_by_role === 'leader' ? 'หัวหน้ากลุ่ม' : 'ทีมภาคสนาม'}
                          {' · '}{new Date(b.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          {b.status === 'pending' && <>
                            <button onClick={() => act(b.id, 'cancelled')} disabled={isA}
                              className={`flex-1 border-2 border-red-200 text-red-600 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 transition-colors ${isA ? 'opacity-60' : 'hover:bg-red-50'}`}>
                              {isA ? <RefreshCw className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}ยกเลิก
                            </button>
                            <button onClick={() => act(b.id, 'confirmed')} disabled={isA}
                              className={`flex-1 bg-cyan-600 text-white py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 transition-colors ${isA ? 'opacity-60' : 'hover:bg-cyan-700'}`}>
                              {isA ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}ยืนยัน
                            </button>
                          </>}
                          {b.status === 'confirmed' && (
                            <button onClick={() => act(b.id, 'received')} disabled={isA}
                              className={`flex-1 bg-emerald-600 text-white py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors ${isA ? 'opacity-60' : 'hover:bg-emerald-700'}`}>
                              {isA ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
                              รับสินค้าแล้ว (ตัด stock)
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
        </>)}

        {/* ══ TAB: จองให้สมาชิก ══ */}
        {tab === 'book' && (
          <form ref={formRef} onSubmit={handleBook} className="space-y-4">

            {bookErr && (
              <div className="bg-red-50 border-2 border-red-300 rounded-xl p-3 flex gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-red-700 text-sm">{bookErr}</p>
              </div>
            )}

            {/* Member ID */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
              <h2 className="font-bold text-gray-800">ข้อมูลสมาชิก</h2>
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1.5">Profile ID สมาชิก *</label>
                <input name="member_id"
                  placeholder="UUID ของสมาชิก"
                  autoComplete="off"
                  className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3.5 text-sm font-mono focus:outline-none focus:border-cyan-500" />
                <p className="text-xs text-gray-400 mt-1">หาจาก Admin → Profile ทั้งหมด</p>
              </div>
            </div>

            {/* เลือกพันธุ์ — แสดงราคาและเครดิต */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
              <h2 className="font-bold text-gray-800">เลือกเมล็ดพันธุ์</h2>
              <div className="space-y-2">
                {SEED_VARIETIES.map(v => (
                  <label key={v.id}
                    className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all
                      ${selVar.id === v.id ? 'border-cyan-500 bg-cyan-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                    <input type="radio" name="variety" value={v.id}
                      checked={selVar.id === v.id}
                      onChange={() => setSelVar(v)}
                      className="accent-cyan-600 w-5 h-5" />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-900">{v.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{v.daysToHarvest} วัน · {v.seedPerRai} กก./ไร่</div>
                      <div className="text-xs text-gray-400">{v.seller}</div>
                    </div>
                    {/* ราคา */}
                    <div className="text-right flex-shrink-0">
                      <div className="font-bold text-cyan-700">{fmt(v.pricePerKg)}</div>
                      <div className="text-[10px] text-gray-400">บาท/กก.</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* จำนวน + เครดิต */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
              <h2 className="font-bold text-gray-800">จำนวนและวันรับ</h2>

              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1.5">จำนวน (กก.) *</label>
                <input
                  name="quantity_kg"
                  type="number"
                  inputMode="decimal"
                  min="0.5"
                  step="0.5"
                  value={qty || ''}
                  onChange={e => setQty(parseFloat(e.target.value) || 0)}
                  placeholder="เช่น 7"
                  className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3.5 text-base focus:outline-none focus:border-cyan-500" />
                <p className="text-xs text-gray-400 mt-1">อัตราปลูก {selVar.seedPerRai} กก./ไร่</p>
              </div>

              {/* Credit preview — แสดงทันทีเมื่อกรอกจำนวน */}
              {qty > 0 && (
                <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-200 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="w-4 h-4 text-orange-600" />
                    <span className="text-sm font-bold text-orange-700">ยอดเครดิต</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-center">
                    <div>
                      <div className="text-gray-500">จำนวน</div>
                      <div className="font-bold text-gray-800">{qty} กก.</div>
                    </div>
                    <div>
                      <div className="text-gray-500">ราคา/กก.</div>
                      <div className="font-bold text-gray-800">{fmt(selVar.pricePerKg)} บาท</div>
                    </div>
                    <div className="bg-orange-100 rounded-xl py-1">
                      <div className="text-orange-500">รวม</div>
                      <div className="font-bold text-orange-700 text-base">{fmt(creditTotal)}</div>
                      <div className="text-[10px] text-orange-400">บาท</div>
                    </div>
                  </div>
                  <p className="text-[10px] text-orange-500 mt-2 text-center">
                    * ยอดนี้จะแสดงที่หน้าสมาชิกใน LINE ทันทีหลังยืนยัน
                  </p>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1.5">วันนัดรับสินค้า *</label>
                <input
                  name="pickup_date"
                  type="date"
                  value={pickupDate}
                  onChange={e => setPickupDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3.5 text-base focus:outline-none focus:border-cyan-500" />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1.5">หมายเหตุ</label>
                <textarea name="pickup_note" rows={2}
                  placeholder="เช่น รับช่วงเช้า / โทรก่อนมารับ"
                  className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500 resize-none" />
              </div>
            </div>

            {/* พี่เลี้ยง */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
              <span className="text-2xl">👨‍🌾</span>
              <div>
                <div className="text-sm font-bold text-emerald-800">พี่เลี้ยง: {selVar.mentor}</div>
                <a href={`tel:${selVar.mentorPhone}`}
                  className="text-emerald-600 text-sm font-mono">{selVar.mentorPhone}</a>
              </div>
            </div>

            {/* Submit */}
            <button type="submit" disabled={saving || qty <= 0 || !pickupDate}
              className={`w-full py-5 rounded-2xl font-bold text-lg shadow-xl flex items-center justify-center gap-3 transition-all
                ${saving || qty <= 0 || !pickupDate
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-cyan-600 text-white hover:bg-cyan-700 active:scale-[.98]'}`}>
              {saving
                ? <><RefreshCw className="w-6 h-6 animate-spin" />กำลังจอง...</>
                : <><Package className="w-6 h-6" />
                  จอง {qty > 0 ? `${qty} กก. = ${fmt(creditTotal)} บาท` : 'เมล็ดพันธุ์'}
                </>}
            </button>

            <p className="text-center text-xs text-gray-400">
              หลังจองสำเร็จ สมาชิกจะเห็นรายการและยอดเครดิตใน LINE ทันที
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
