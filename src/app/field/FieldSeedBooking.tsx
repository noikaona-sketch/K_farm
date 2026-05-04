import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, RefreshCw, Check, X, Package, Search, AlertCircle } from 'lucide-react'
import { useAuth } from '../../routes/AuthContext'
import {
  fetchGroupBookings, createBooking, updateBookingStatus,
  type SeedBooking, type BookingStatus,
} from '../../lib/db'
import { isSupabaseReady } from '../../lib/supabase'
import { SEED_VARIETIES } from '../../data/mockData'

const STATUS_CFG = {
  pending:   { label:'รอยืนยัน',    dot:'bg-amber-400',   bg:'bg-amber-100 text-amber-700' },
  confirmed: { label:'ยืนยันแล้ว',  dot:'bg-blue-400',    bg:'bg-blue-100 text-blue-700' },
  received:  { label:'รับสินค้าแล้ว',dot:'bg-emerald-500', bg:'bg-emerald-100 text-emerald-700' },
  cancelled: { label:'ยกเลิก',      dot:'bg-red-400',     bg:'bg-red-100 text-red-700' },
}

export default function FieldSeedBooking() {
  const { user }  = useAuth()
  const navigate  = useNavigate()
  const [tab, setTab]         = useState<'list'|'book'>('list')
  const [bookings, setBookings] = useState<SeedBooking[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [acting, setActing]     = useState<string|null>(null)
  const [toast, setToast]       = useState<{ok:boolean;msg:string}|null>(null)
  const [selVar, setSelVar]     = useState(SEED_VARIETIES[0]?.id ?? '')
  const [saving, setSaving]     = useState(false)
  const [bookErr, setBookErr]   = useState<string|null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const flash = (ok:boolean,msg:string) => { setToast({ok,msg}); setTimeout(()=>setToast(null),4000) }

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetchGroupBookings(user?.id ?? '')
    setBookings(res.data ?? [])
    setLoading(false)
  }, [user?.id])

  useEffect(() => { load() }, [load])

  const act = async (id:string, status:BookingStatus) => {
    setActing(id)
    const res = await updateBookingStatus(id, status)
    if (isSupabaseReady && res.error) flash(false, res.error)
    else flash(true, status==='confirmed'?'✅ ยืนยันแล้ว':status==='received'?'📦 รับสินค้า — ตัด stock':'❌ ยกเลิก')
    setActing(null); await load()
  }

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault()
    const fd      = new FormData(formRef.current!)
    const memberId= (fd.get('member_id') as string??'').trim()
    const qty     = parseFloat(fd.get('quantity_kg') as string??'0')
    const pickup  = fd.get('pickup_date') as string
    if (!memberId) { setBookErr('กรุณากรอก Profile ID สมาชิก'); return }
    if (!qty||qty<=0) { setBookErr('กรุณากรอกจำนวน'); return }
    if (!pickup) { setBookErr('กรุณาเลือกวันนัดรับ'); return }
    setSaving(true); setBookErr(null)
    const v = SEED_VARIETIES.find(v=>v.id===selVar)
    const res = await createBooking({
      profile_id: memberId, variety_id: selVar,
      variety_name: v?.name??selVar, quantity_kg: qty,
      booked_by: user?.id??'', booked_by_role: 'sales',
      pickup_date: pickup, pickup_note: (fd.get('pickup_note') as string)||undefined,
    })
    setSaving(false)
    if (isSupabaseReady && res.error) { setBookErr(res.error); return }
    flash(true,'✅ จองให้สมาชิกสำเร็จ'); setTab('list'); await load()
  }

  const displayed = bookings
    .filter(b => filterStatus==='all' || b.status===filterStatus)
    .filter(b => (b.member_name??'').includes(search)||(b.member_phone??'').includes(search)||b.variety_name.includes(search))

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-cyan-600 text-white px-5 py-4 flex items-center gap-3 sticky top-0 z-40">
        <button onClick={()=>navigate(-1)} className="p-1"><ChevronLeft className="w-6 h-6"/></button>
        <div className="flex-1">
          <div className="font-bold text-lg">จองเมล็ดพันธุ์</div>
          <div className="text-xs text-cyan-100">{bookings.filter(b=>b.status==='pending').length} รายการรอยืนยัน</div>
        </div>
        <button onClick={load} className="p-1.5 bg-white/20 rounded-xl">
          <RefreshCw className={`w-4 h-4 ${loading?'animate-spin':''}`}/>
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b px-5 pt-3 pb-0 sticky top-[68px] z-30">
        <div className="flex bg-gray-100 rounded-2xl p-1">
          {([['list','📋','รายการจอง'],['book','➕','จองให้สมาชิก']] as const).map(([k,ic,lb])=>(
            <button key={k} onClick={()=>setTab(k)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all
                ${tab===k?'bg-white text-cyan-700 shadow-sm':'text-gray-500'}`}>
              <span>{ic}</span><span>{lb}</span>
            </button>
          ))}
        </div>
        <div className="h-4"/>
      </div>

      <div className="p-5 space-y-4">
        {toast && (
          <div className={`rounded-xl px-4 py-3 flex items-center gap-2 text-sm font-semibold border
            ${toast.ok?'bg-emerald-50 border-emerald-300 text-emerald-700':'bg-red-50 border-red-300 text-red-700'}`}>
            {toast.ok?<Check className="w-4 h-4"/>:<AlertCircle className="w-4 h-4"/>}{toast.msg}
            <button onClick={()=>setToast(null)} className="ml-auto text-lg opacity-60">×</button>
          </div>
        )}

        {/* ── LIST ── */}
        {tab==='list' && (<>
          <div className="flex gap-2 flex-wrap">
            {(['all','pending','confirmed','received'] as const).map(s=>(
              <button key={s} onClick={()=>setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all
                  ${filterStatus===s?'bg-cyan-600 text-white border-cyan-600':'bg-white border-gray-200 text-gray-600'}`}>
                {s==='all'?'ทั้งหมด':STATUS_CFG[s as keyof typeof STATUS_CFG]?.label??s}
                {' '}({bookings.filter(b=>s==='all'||b.status===s).length})
              </button>
            ))}
            <div className="relative flex-1 min-w-36">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"/>
              <input value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="ค้นหาชื่อ เบอร์ พันธุ์"
                className="w-full pl-8 pr-3 py-1.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-cyan-500"/>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-10"><RefreshCw className="w-6 h-6 text-cyan-600 animate-spin"/></div>
          ) : displayed.length===0 ? (
            <div className="text-center py-14 text-gray-400">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-30"/>
              <p className="font-medium">ไม่มีรายการ</p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayed.map(b => {
                const st  = STATUS_CFG[b.status as keyof typeof STATUS_CFG]
                const isA = acting===b.id
                return (
                  <div key={b.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-bold text-gray-900">{b.member_name||'-'}</div>
                        <div className="text-xs text-gray-500">{b.member_phone}</div>
                      </div>
                      <span className={`text-xs px-2.5 py-1.5 rounded-full font-semibold ${st?.bg}`}>{st?.label}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                      <div className="bg-gray-50 rounded-xl p-2.5">
                        <div className="text-gray-400">พันธุ์</div>
                        <div className="font-semibold">{b.variety_name}</div>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-2.5">
                        <div className="text-gray-400">จำนวน</div>
                        <div className="font-semibold">{b.quantity_kg} กก.</div>
                      </div>
                      {b.pickup_date && (
                        <div className="bg-blue-50 rounded-xl p-2.5 col-span-2">
                          <div className="text-blue-400">วันนัดรับ</div>
                          <div className="font-semibold text-blue-800">{new Date(b.pickup_date).toLocaleDateString('th-TH',{weekday:'long',day:'numeric',month:'long'})}</div>
                        </div>
                      )}
                    </div>
                    {b.pickup_note && <p className="text-xs text-gray-500 mt-2 bg-gray-50 rounded-xl px-3 py-2">{b.pickup_note}</p>}

                    {/* Actions */}
                    <div className="flex gap-2 mt-3">
                      {b.status==='pending' && <>
                        <button onClick={()=>act(b.id,'cancelled')} disabled={isA}
                          className={`flex-1 border-2 border-red-200 text-red-600 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1 ${isA?'opacity-60':'hover:bg-red-50'} transition-colors`}>
                          {isA?<RefreshCw className="w-3.5 h-3.5 animate-spin"/>:<X className="w-3.5 h-3.5"/>}ยกเลิก
                        </button>
                        <button onClick={()=>act(b.id,'confirmed')} disabled={isA}
                          className={`flex-1 bg-cyan-600 text-white py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1 ${isA?'opacity-60':'hover:bg-cyan-700'} transition-colors`}>
                          {isA?<RefreshCw className="w-3.5 h-3.5 animate-spin"/>:<Check className="w-3.5 h-3.5"/>}ยืนยัน
                        </button>
                      </>}
                      {b.status==='confirmed' && (
                        <button onClick={()=>act(b.id,'received')} disabled={isA}
                          className={`flex-1 bg-emerald-600 text-white py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1 ${isA?'opacity-60':'hover:bg-emerald-700'} transition-colors`}>
                          {isA?<RefreshCw className="w-3.5 h-3.5 animate-spin"/>:<Package className="w-3.5 h-3.5"/>}รับสินค้าแล้ว
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>)}

        {/* ── BOOK FOR MEMBER ── */}
        {tab==='book' && (
          <form ref={formRef} onSubmit={handleBook} className="space-y-4">
            {bookErr && (
              <div className="bg-red-50 border-2 border-red-300 rounded-xl p-3 flex gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5"/>
                <p className="text-red-700 text-sm">{bookErr}</p>
              </div>
            )}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
              <h2 className="font-bold text-gray-800">จองให้สมาชิก (ทีมภาคสนาม)</h2>
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1.5">Profile ID สมาชิก *</label>
                <input name="member_id" placeholder="UUID ของสมาชิก"
                  className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-cyan-500"/>
                <p className="text-xs text-gray-400 mt-1">หาจาก Admin → Profile ทั้งหมด</p>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1.5">พันธุ์ *</label>
                <div className="space-y-2">
                  {SEED_VARIETIES.map(v=>(
                    <label key={v.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all
                        ${selVar===v.id?'border-cyan-500 bg-cyan-50':'border-gray-200 hover:border-gray-300'}`}>
                      <input type="radio" checked={selVar===v.id} onChange={()=>setSelVar(v.id)} className="accent-cyan-600"/>
                      <div>
                        <div className="font-semibold text-gray-800 text-sm">{v.name}</div>
                        <div className="text-xs text-gray-400">{v.daysToHarvest} วัน · {v.seedPerRai} กก./ไร่</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1.5">จำนวน (กก.) *</label>
                  <input name="quantity_kg" type="number" min="1" step="0.5" placeholder="7"
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500"/>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1.5">วันนัดรับ *</label>
                  <input name="pickup_date" type="date" min={new Date().toISOString().split('T')[0]}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500"/>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1.5">หมายเหตุ</label>
                <input name="pickup_note" placeholder="บันทึกเพิ่มเติม"
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500"/>
              </div>
            </div>
            <button type="submit" disabled={saving}
              className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all
                ${saving?'bg-gray-200 text-gray-400 cursor-wait':'bg-cyan-600 text-white hover:bg-cyan-700 active:scale-[.98]'}`}>
              {saving?<><RefreshCw className="w-5 h-5 animate-spin"/>กำลังจอง...</>:<><Package className="w-5 h-5"/>จองให้สมาชิก</>}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
