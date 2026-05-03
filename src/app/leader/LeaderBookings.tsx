import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, RefreshCw, Check, X, Package, AlertCircle } from 'lucide-react'
import { useAuth } from '../../routes/AuthContext'
import {
  fetchGroupBookings, createBooking, updateBookingStatus,
  type SeedBooking,
} from '../../lib/db'
import { isSupabaseReady } from '../../lib/supabase'
import { SEED_VARIETIES } from '../../data/mockData'

const STATUS_CFG = {
  pending:   { label: 'รอยืนยัน',   bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-400' },
  confirmed: { label: 'ยืนยันแล้ว', bg: 'bg-blue-100',  text: 'text-blue-700',  dot: 'bg-blue-400' },
  received:  { label: 'รับแล้ว',    bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  cancelled: { label: 'ยกเลิก',    bg: 'bg-red-100',    text: 'text-red-700',   dot: 'bg-red-400' },
}

export default function LeaderBookings() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const uid = user?.id ?? ''

  const [tab, setTab]         = useState<'list' | 'book'>('list')
  const [bookings, setBookings] = useState<SeedBooking[]>([])
  const [loading, setLoading]   = useState(true)
  const [acting, setActing]     = useState<string | null>(null)
  const [toast, setToast]       = useState<{ ok: boolean; msg: string } | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')

  // book-for-member form
  const formRef    = useRef<HTMLFormElement>(null)
  const [selVar, setSelVar]     = useState(SEED_VARIETIES[0]?.id ?? '')
  const [memberSearch, setMemberSearch] = useState('')
  const [saving, setSaving]     = useState(false)
  const [bookErr, setBookErr]   = useState<string | null>(null)

  const flash = (ok: boolean, msg: string) => {
    setToast({ ok, msg }); setTimeout(() => setToast(null), 4000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetchGroupBookings(uid)
    setBookings(res.data ?? [])
    setLoading(false)
  }, [uid])

  useEffect(() => { load() }, [load])

  const act = async (id: string, status: 'confirmed' | 'received' | 'cancelled', pickupDate?: string) => {
    setActing(id)
    const res = await updateBookingStatus(id, status, { pickup_date: pickupDate })
    if (isSupabaseReady && res.error) { flash(false, res.error) }
    else { flash(true, status === 'confirmed' ? '✅ ยืนยันแล้ว' : status === 'received' ? '📦 รับสินค้าแล้ว' : '❌ ยกเลิกแล้ว') }
    setActing(null); await load()
  }

  const handleBookFor = async (e: React.FormEvent) => {
    e.preventDefault()
    const fd         = new FormData(formRef.current!)
    const memberId   = (fd.get('member_id') as string ?? '').trim()
    const qty        = parseFloat(fd.get('quantity_kg') as string ?? '0')
    const pickup     = fd.get('pickup_date') as string
    const note       = fd.get('pickup_note') as string

    if (!memberId) { setBookErr('กรุณากรอก Profile ID ของสมาชิก'); return }
    if (!qty || qty <= 0) { setBookErr('กรุณากรอกจำนวน'); return }
    if (!pickup) { setBookErr('กรุณาเลือกวันนัดรับ'); return }

    setSaving(true); setBookErr(null)
    const v = SEED_VARIETIES.find(v => v.id === selVar)
    const res = await createBooking({
      profile_id:     memberId,
      variety_id:     selVar,
      variety_name:   v?.name ?? selVar,
      quantity_kg:    qty,
      booked_by:      uid,
      booked_by_role: 'leader',
      pickup_date:    pickup,
      pickup_note:    note || undefined,
    })
    setSaving(false)
    if (isSupabaseReady && res.error) { setBookErr(res.error); return }
    flash(true, `✅ จองให้สมาชิกสำเร็จ`)
    setTab('list'); await load()
  }

  const displayed = bookings.filter(b => filterStatus === 'all' || b.status === filterStatus)
  const pendingCount = bookings.filter(b => b.status === 'pending').length

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-emerald-600 text-white px-5 py-4 flex items-center gap-3 sticky top-0 z-40">
        <button onClick={() => navigate(-1)} className="p-1"><ChevronLeft className="w-6 h-6"/></button>
        <div className="flex-1">
          <div className="font-bold text-lg">จองเมล็ดพันธุ์ — กลุ่มของฉัน</div>
          <div className="text-xs text-emerald-100">
            {pendingCount > 0 ? `⚠️ รอยืนยัน ${pendingCount} รายการ` : 'ไม่มีรายการรอ'}
          </div>
        </div>
        <button onClick={load} className="p-1.5 bg-white/20 rounded-xl">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}/>
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-5 pt-3 pb-0 sticky top-[68px] z-30">
        <div className="flex bg-gray-100 rounded-2xl p-1">
          {([['list','📋','รายการจอง'],['book','➕','จองให้สมาชิก']] as [typeof tab,string,string][]).map(([k,ic,lb])=>(
            <button key={k} onClick={()=>setTab(k)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all
                ${tab===k?'bg-white text-emerald-700 shadow-sm':'text-gray-500'}`}>
              {k==='list' && pendingCount>0 && <span className="w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center">{pendingCount}</span>}
              <span>{ic}</span><span>{lb}</span>
            </button>
          ))}
        </div>
        <div className="h-4"/>
      </div>

      <div className="p-5 space-y-4">

        {/* Toast */}
        {toast && (
          <div className={`rounded-xl px-4 py-3 flex items-center gap-2 text-sm font-semibold border
            ${toast.ok?'bg-emerald-50 border-emerald-300 text-emerald-700':'bg-red-50 border-red-300 text-red-700'}`}>
            {toast.ok?<Check className="w-4 h-4"/>:<AlertCircle className="w-4 h-4"/>}
            {toast.msg}
            <button onClick={()=>setToast(null)} className="ml-auto text-lg opacity-60">×</button>
          </div>
        )}

        {/* ── LIST TAB ── */}
        {tab === 'list' && (<>
          {/* Filter */}
          <div className="flex gap-2 flex-wrap">
            {(['all','pending','confirmed','received','cancelled'] as const).map(s=>(
              <button key={s} onClick={()=>setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all
                  ${filterStatus===s?'bg-emerald-600 text-white border-emerald-600':'bg-white border-gray-200 text-gray-600'}`}>
                {s==='all'?'ทั้งหมด':STATUS_CFG[s as keyof typeof STATUS_CFG]?.label??s}
                <span className="ml-1 opacity-60">({bookings.filter(b=>s==='all'||b.status===s).length})</span>
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><RefreshCw className="w-6 h-6 text-emerald-600 animate-spin"/></div>
          ) : displayed.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-30"/>
              <p className="font-medium">ไม่มีรายการ</p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayed.map(b => {
                const st = STATUS_CFG[b.status] ?? { label: b.status, bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' }
                const isA = acting === b.id
                return (
                  <div key={b.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Card header */}
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="font-bold text-gray-900">{b.member_name || 'ไม่ระบุ'}</div>
                          <div className="text-xs text-gray-500">{b.member_phone}</div>
                        </div>
                        <span className={`text-xs px-2.5 py-1.5 rounded-full font-semibold ${st.bg} ${st.text}`}>{st.label}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                        <div className="bg-gray-50 rounded-xl p-2.5">
                          <div className="text-xs text-gray-400">พันธุ์</div>
                          <div className="font-semibold text-gray-800">{b.variety_name}</div>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-2.5">
                          <div className="text-xs text-gray-400">จำนวน</div>
                          <div className="font-semibold text-gray-800">{b.quantity_kg} กก.</div>
                        </div>
                        {b.pickup_date && (
                          <div className="bg-blue-50 rounded-xl p-2.5 col-span-2">
                            <div className="text-xs text-blue-400">วันนัดรับ</div>
                            <div className="font-semibold text-blue-800">
                              {new Date(b.pickup_date).toLocaleDateString('th-TH',{weekday:'long',day:'numeric',month:'long'})}
                            </div>
                          </div>
                        )}
                      </div>

                      {b.pickup_note && (
                        <p className="text-xs text-gray-500 mt-2 bg-gray-50 rounded-xl px-3 py-2">{b.pickup_note}</p>
                      )}
                      {b.booked_by_role === 'sales' && (
                        <p className="text-xs text-purple-600 mt-2">จองโดยทีมขาย</p>
                      )}
                    </div>

                    {/* Actions */}
                    {b.status === 'pending' && (
                      <div className="border-t border-gray-100 px-4 py-3 flex gap-2">
                        <button onClick={()=>act(b.id,'cancelled')} disabled={isA}
                          className={`flex-1 border-2 border-red-200 text-red-600 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-1 ${isA?'opacity-60':'hover:bg-red-50'} transition-colors`}>
                          {isA?<RefreshCw className="w-4 h-4 animate-spin"/>:<X className="w-4 h-4"/>}ยกเลิก
                        </button>
                        <button onClick={()=>act(b.id,'confirmed',b.pickup_date??undefined)} disabled={isA}
                          className={`flex-1 bg-emerald-600 text-white py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-1 ${isA?'opacity-60':'hover:bg-emerald-700'} transition-colors`}>
                          {isA?<RefreshCw className="w-4 h-4 animate-spin"/>:<Check className="w-4 h-4"/>}ยืนยัน
                        </button>
                      </div>
                    )}
                    {b.status === 'confirmed' && (
                      <div className="border-t border-gray-100 px-4 py-3">
                        <button onClick={()=>act(b.id,'received')} disabled={isA}
                          className={`w-full bg-blue-600 text-white py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 ${isA?'opacity-60':'hover:bg-blue-700'} transition-colors`}>
                          {isA?<RefreshCw className="w-4 h-4 animate-spin"/>:<Package className="w-4 h-4"/>}
                          บันทึกรับสินค้าแล้ว (ตัด stock)
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>)}

        {/* ── BOOK FOR MEMBER TAB ── */}
        {tab === 'book' && (
          <form ref={formRef} onSubmit={handleBookFor} className="space-y-4">
            {bookErr && (
              <div className="bg-red-50 border-2 border-red-300 rounded-xl p-3 flex gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5"/>
                <p className="text-red-700 text-sm">{bookErr}</p>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
              <h2 className="font-bold text-gray-800">จองให้สมาชิกในกลุ่ม</h2>

              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1.5">Profile ID ของสมาชิก *</label>
                <input name="member_id"
                  placeholder="วาง UUID ของสมาชิก"
                  className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3.5 text-base focus:outline-none focus:border-emerald-500 font-mono text-sm"/>
                <p className="text-xs text-gray-400 mt-1">หาจากหน้า Admin → สมาชิก</p>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2">พันธุ์ข้าวโพด *</label>
                <div className="space-y-2">
                  {SEED_VARIETIES.map(v => (
                    <label key={v.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all
                        ${selVar===v.id?'border-emerald-500 bg-emerald-50':'border-gray-200 hover:border-gray-300'}`}>
                      <input type="radio" checked={selVar===v.id} onChange={()=>setSelVar(v.id)} className="accent-emerald-600"/>
                      <div>
                        <div className="font-semibold text-gray-800">{v.name}</div>
                        <div className="text-xs text-gray-400">{v.daysToHarvest} วัน</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-1.5">จำนวน (กก.) *</label>
                  <input name="quantity_kg" type="number" min="1" step="0.5" placeholder="7"
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-emerald-500"/>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-1.5">วันนัดรับ *</label>
                  <input name="pickup_date" type="date" min={new Date().toISOString().split('T')[0]}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-emerald-500"/>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1.5">หมายเหตุ</label>
                <textarea name="pickup_note" rows={2} placeholder="บันทึกเพิ่มเติม"
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-emerald-500 resize-none"/>
              </div>
            </div>

            <button type="submit" disabled={saving}
              className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all
                ${saving?'bg-gray-200 text-gray-400 cursor-wait':'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[.98]'}`}>
              {saving?<><RefreshCw className="w-5 h-5 animate-spin"/>กำลังจอง...</>:<><Package className="w-5 h-5"/>จองให้สมาชิก</>}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
