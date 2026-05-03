import React, { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Check, RefreshCw, AlertCircle, Package } from 'lucide-react'
import { useAuth } from '../../routes/AuthContext'
import { createBooking, fetchMyBookings, type SeedBooking } from '../../lib/db'
import { isSupabaseReady } from '../../lib/supabase'
import { SEED_VARIETIES } from '../../data/mockData'

const STATUS_CFG = {
  pending:   { label: 'รอยืนยัน',   bg: 'bg-amber-100',   text: 'text-amber-700' },
  confirmed: { label: 'ยืนยันแล้ว', bg: 'bg-blue-100',    text: 'text-blue-700' },
  received:  { label: 'รับสินค้าแล้ว', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  cancelled: { label: 'ยกเลิก',     bg: 'bg-red-100',     text: 'text-red-700' },
}

export default function SeedBooking() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const uid = user?.id ?? ''

  const [tab, setTab]         = useState<'book' | 'history'>('book')
  const [bookings, setBookings] = useState<SeedBooking[]>([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [done, setDone]         = useState<string | null>(null)
  const [err, setErr]           = useState<string | null>(null)

  // form (uncontrolled for no lag)
  const formRef   = useRef<HTMLFormElement>(null)
  const [selVar, setSelVar] = useState(SEED_VARIETIES[0]?.id ?? '')
  const [step, setStep]     = useState<string>('')

  const load = async () => {
    setLoading(true)
    const res = await fetchMyBookings(uid)
    setBookings(res.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [uid])

  const selectedVariety = SEED_VARIETIES.find(v => v.id === selVar)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const fd     = new FormData(formRef.current!)
    const qty    = parseFloat(fd.get('quantity_kg') as string ?? '0')
    const pickup = fd.get('pickup_date') as string
    const note   = fd.get('pickup_note') as string

    if (!selVar)   { setErr('กรุณาเลือกพันธุ์'); return }
    if (!qty || qty <= 0) { setErr('กรุณากรอกจำนวน (กก.)'); return }
    if (!pickup)   { setErr('กรุณาเลือกวันนัดรับ'); return }

    setSaving(true); setErr(null); setStep('กำลังส่งคำขอจอง...')

    const res = await createBooking({
      profile_id:     uid,
      variety_id:     selVar,
      variety_name:   selectedVariety?.name ?? selVar,
      quantity_kg:    qty,
      booked_by:      uid,
      booked_by_role: 'self',
      pickup_date:    pickup,
      pickup_note:    note || undefined,
      price_per_kg:   selectedVariety ? undefined : undefined,
    })

    setSaving(false); setStep('')

    if (isSupabaseReady && res.error) { setErr(res.error); return }
    setDone(res.data?.id ?? 'ok')
    await load()
    setTab('history')
  }

  if (done) setTimeout(() => setDone(null), 4000)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-emerald-600 text-white px-5 py-4 flex items-center gap-3 sticky top-0 z-40">
        <button onClick={() => navigate(-1)} className="p-1"><ChevronLeft className="w-6 h-6"/></button>
        <div>
          <div className="font-bold text-lg">จองเมล็ดพันธุ์</div>
          <div className="text-xs text-emerald-100">{isSupabaseReady ? '🟢 ออนไลน์' : '🟡 Mock'}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-5 pt-3 pb-0 sticky top-[68px] z-30">
        <div className="flex bg-gray-100 rounded-2xl p-1">
          {([['book','📋','จองใหม่'],['history','🕐','ประวัติการจอง']] as [typeof tab,string,string][]).map(([k,ic,lb])=>(
            <button key={k} onClick={()=>setTab(k)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all
                ${tab===k?'bg-white text-emerald-700 shadow-sm':'text-gray-500'}`}>
              <span>{ic}</span><span>{lb}</span>
            </button>
          ))}
        </div>
        <div className="h-4"/>
      </div>

      <div className="p-5 space-y-4">

        {/* Loading overlay */}
        {saving && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-white rounded-3xl p-8 flex flex-col items-center gap-3 w-72 shadow-2xl">
              <RefreshCw className="w-10 h-10 text-emerald-600 animate-spin"/>
              <p className="font-bold text-gray-800">กำลังดำเนินการ</p>
              <p className="text-emerald-600 text-sm">{step}</p>
            </div>
          </div>
        )}

        {/* Success toast */}
        {done && (
          <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-4 flex items-center gap-3">
            <Check className="w-5 h-5 text-emerald-600 flex-shrink-0"/>
            <div>
              <p className="font-bold text-emerald-700">จองสำเร็จ!</p>
              <p className="text-emerald-600 text-sm">รอทีมยืนยันและนัดวันรับสินค้า</p>
            </div>
          </div>
        )}

        {/* ── TAB: จองใหม่ ── */}
        {tab === 'book' && (
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
            {err && (
              <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 flex gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0"/>
                <p className="text-red-700 text-sm">{err}</p>
              </div>
            )}

            {/* เลือกพันธุ์ */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
              <h2 className="font-bold text-gray-800">เลือกพันธุ์ข้าวโพด</h2>
              <div className="space-y-2">
                {SEED_VARIETIES.map(v => (
                  <label key={v.id}
                    className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all
                      ${selVar===v.id?'border-emerald-500 bg-emerald-50':'border-gray-200 bg-white hover:border-gray-300'}`}>
                    <input type="radio" name="variety" value={v.id} checked={selVar===v.id}
                      onChange={()=>setSelVar(v.id)} className="accent-emerald-600 w-5 h-5"/>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-900">{v.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{v.daysToHarvest} วัน · {v.yieldPerRai} ตัน/ไร่</div>
                      <div className="text-xs text-gray-400">{v.seller}</div>
                    </div>
                    {selVar===v.id && <Check className="w-5 h-5 text-emerald-600 flex-shrink-0"/>}
                  </label>
                ))}
              </div>
            </div>

            {/* จำนวน + วันนัด */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
              <h2 className="font-bold text-gray-800">รายละเอียดการจอง</h2>

              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1.5">
                  จำนวนที่ต้องการ (กก.) *
                </label>
                <input name="quantity_kg" type="number" min="1" step="0.5"
                  placeholder="เช่น 7 กก. (ปลูกได้ 2 ไร่)"
                  className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3.5 text-base focus:outline-none focus:border-emerald-500"/>
                {selectedVariety && (
                  <p className="text-xs text-gray-400 mt-1 ml-1">
                    อัตราปลูก {selectedVariety.seedPerRai} กก./ไร่
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1.5">วันนัดรับสินค้า *</label>
                <input name="pickup_date" type="date"
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3.5 text-base focus:outline-none focus:border-emerald-500"/>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1.5">
                  หมายเหตุ (ถ้ามี)
                </label>
                <textarea name="pickup_note" rows={2}
                  placeholder="เช่น รับช่วงเช้า / ให้โทรก่อน"
                  className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-base focus:outline-none focus:border-emerald-500 resize-none"/>
              </div>
            </div>

            {/* พี่เลี้ยง */}
            {selectedVariety && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
                <span className="text-2xl">👨‍🌾</span>
                <div>
                  <div className="text-sm font-bold text-emerald-800">พี่เลี้ยง: {selectedVariety.mentor}</div>
                  <a href={`tel:${selectedVariety.mentorPhone}`}
                    className="text-emerald-600 text-sm font-mono">{selectedVariety.mentorPhone}</a>
                </div>
              </div>
            )}

            <button type="submit" disabled={saving}
              className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-bold text-lg shadow-xl hover:bg-emerald-700 active:scale-[.98] transition-all flex items-center justify-center gap-3">
              <Package className="w-6 h-6"/>จองเมล็ดพันธุ์
            </button>
          </form>
        )}

        {/* ── TAB: ประวัติ ── */}
        {tab === 'history' && (
          loading ? (
            <div className="flex justify-center py-12"><RefreshCw className="w-6 h-6 text-emerald-600 animate-spin"/></div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-30"/>
              <p className="font-medium">ยังไม่มีการจอง</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.map(b => {
                const st = STATUS_CFG[b.status] ?? { label: b.status, bg: 'bg-gray-100', text: 'text-gray-600' }
                return (
                  <div key={b.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-bold text-gray-900 text-base">{b.variety_name}</div>
                        <div className="text-sm text-gray-500">{b.quantity_kg} กก.</div>
                      </div>
                      <span className={`text-xs px-3 py-1.5 rounded-full font-semibold ${st.bg} ${st.text}`}>{st.label}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {b.pickup_date && (
                        <div className="bg-gray-50 rounded-xl p-2.5">
                          <div className="text-xs text-gray-400">วันนัดรับ</div>
                          <div className="font-semibold text-gray-800">{new Date(b.pickup_date).toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'2-digit'})}</div>
                        </div>
                      )}
                      {b.total_price && (
                        <div className="bg-gray-50 rounded-xl p-2.5">
                          <div className="text-xs text-gray-400">ยอดรวม</div>
                          <div className="font-semibold text-gray-800">{b.total_price.toLocaleString()} บาท</div>
                        </div>
                      )}
                    </div>
                    {b.pickup_note && (
                      <p className="text-xs text-gray-500 mt-2 bg-gray-50 rounded-xl px-3 py-2">{b.pickup_note}</p>
                    )}
                    {b.booked_by_role !== 'self' && (
                      <p className="text-xs text-blue-600 mt-2">จองโดย: {b.booked_by_role === 'leader' ? 'หัวหน้ากลุ่ม' : 'ทีมขาย'}</p>
                    )}
                    <p className="text-xs text-gray-300 mt-1.5">
                      {new Date(b.created_at).toLocaleDateString('th-TH',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}
                    </p>
                  </div>
                )
              })}
            </div>
          )
        )}
      </div>
    </div>
  )
}
