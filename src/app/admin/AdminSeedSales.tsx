import React, { useEffect, useState, useRef, useCallback } from 'react'
import { RefreshCw, Check, X, Package, Search, AlertCircle, Wifi, WifiOff } from 'lucide-react'
import {
  fetchAllBookings, createBooking, updateBookingStatus,
  type SeedBooking, type BookingStatus,
} from '../../lib/db'
import { isSupabaseReady } from '../../lib/supabase'
import { SEED_VARIETIES } from '../../data/mockData'

const STATUS_CFG: Record<string, { label: string; bg: string; text: string }> = {
  pending:   { label: 'รอยืนยัน',   bg: 'bg-amber-100',   text: 'text-amber-700' },
  confirmed: { label: 'ยืนยันแล้ว', bg: 'bg-blue-100',    text: 'text-blue-700' },
  received:  { label: 'รับสินค้าแล้ว', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  cancelled: { label: 'ยกเลิก',     bg: 'bg-red-100',     text: 'text-red-700' },
}

export default function AdminSeedSales() {
  const [bookings, setBookings] = useState<SeedBooking[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [acting, setActing]     = useState<string | null>(null)
  const [toast, setToast]       = useState<{ ok: boolean; msg: string } | null>(null)
  const [showForm, setShowForm] = useState(false)

  // create booking form
  const formRef  = useRef<HTMLFormElement>(null)
  const [selVar, setSelVar]   = useState(SEED_VARIETIES[0]?.id ?? '')
  const [saving, setSaving]   = useState(false)
  const [formErr, setFormErr] = useState<string | null>(null)

  const flash = (ok: boolean, msg: string) => {
    setToast({ ok, msg }); setTimeout(() => setToast(null), 4000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetchAllBookings()
    setBookings(res.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const act = async (id: string, status: BookingStatus) => {
    setActing(id)
    const res = await updateBookingStatus(id, status)
    if (isSupabaseReady && res.error) flash(false, res.error)
    else flash(true, status === 'confirmed' ? '✅ ยืนยันแล้ว' : status === 'received' ? '📦 รับสินค้าแล้ว — ตัด stock แล้ว' : '❌ ยกเลิก')
    setActing(null); await load()
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const fd       = new FormData(formRef.current!)
    const memberId = (fd.get('member_id') as string ?? '').trim()
    const qty      = parseFloat(fd.get('quantity_kg') as string ?? '0')
    const pickup   = fd.get('pickup_date') as string
    if (!memberId) { setFormErr('กรุณากรอก Profile ID'); return }
    if (!qty||qty<=0) { setFormErr('กรุณากรอกจำนวน'); return }
    if (!pickup) { setFormErr('กรุณาเลือกวันนัดรับ'); return }
    setSaving(true); setFormErr(null)
    const v = SEED_VARIETIES.find(v=>v.id===selVar)
    const res = await createBooking({
      profile_id: memberId, variety_id: selVar, variety_name: v?.name??selVar,
      quantity_kg: qty, booked_by: 'admin', booked_by_role: 'sales',
      pickup_date: pickup, pickup_note: (fd.get('pickup_note') as string)||undefined,
    })
    setSaving(false)
    if (isSupabaseReady && res.error) { setFormErr(res.error); return }
    flash(true, '✅ จองสำเร็จ'); setShowForm(false); await load()
  }

  const displayed = bookings
    .filter(b => filterStatus==='all' || b.status===filterStatus)
    .filter(b =>
      (b.member_name??'').includes(search) ||
      (b.member_phone??'').includes(search) ||
      b.variety_name.includes(search)
    )

  // summary
  const total    = bookings.length
  const pending  = bookings.filter(b=>b.status==='pending').length
  const confirmed= bookings.filter(b=>b.status==='confirmed').length
  const totalKg  = bookings.filter(b=>b.status!=='cancelled').reduce((s,b)=>s+b.quantity_kg,0)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">จองเมล็ดพันธุ์</h1>
          <div className="flex items-center gap-1.5 mt-0.5 text-sm">
            {isSupabaseReady
              ? <><Wifi className="w-3.5 h-3.5 text-emerald-600"/><span className="text-emerald-600">Supabase: seed_bookings</span></>
              : <><WifiOff className="w-3.5 h-3.5 text-amber-500"/><span className="text-amber-600">Mock data</span></>}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={()=>{setLoading(true);load()}} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm hover:bg-gray-50 shadow-sm">
            <RefreshCw className="w-4 h-4"/>รีโหลด
          </button>
          <button onClick={()=>setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 shadow-sm">
            <Package className="w-4 h-4"/>จองให้สมาชิก
          </button>
        </div>
      </div>

      {toast && (
        <div className={`rounded-xl px-4 py-3 flex items-center gap-2 text-sm font-medium border
          ${toast.ok?'bg-emerald-50 border-emerald-300 text-emerald-700':'bg-red-50 border-red-300 text-red-700'}`}>
          {toast.ok?<Check className="w-4 h-4"/>:<AlertCircle className="w-4 h-4"/>}{toast.msg}
          <button onClick={()=>setToast(null)} className="ml-auto opacity-60 text-lg leading-none">×</button>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {l:'รายการทั้งหมด',n:total,   extra:'',           bg:'border-gray-200 bg-gray-50 text-gray-700'},
          {l:'รอยืนยัน',    n:pending,  extra:'',           bg:'border-amber-200 bg-amber-50 text-amber-700'},
          {l:'ยืนยันแล้ว',  n:confirmed,extra:'',           bg:'border-blue-200 bg-blue-50 text-blue-700'},
          {l:'รวมปริมาณ',   n:totalKg,  extra:' กก.',       bg:'border-emerald-200 bg-emerald-50 text-emerald-700'},
        ].map(({l,n,extra,bg})=>(
          <div key={l} className={`border-2 rounded-2xl p-4 text-center ${bg}`}>
            <div className="text-2xl font-bold">{n}{extra}</div>
            <div className="text-sm font-medium mt-0.5">{l}</div>
          </div>
        ))}
      </div>

      {/* Create booking form */}
      {showForm && (
        <form ref={formRef} onSubmit={handleCreate}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
          <h2 className="font-bold text-gray-800">จองให้สมาชิก (ทีมขาย)</h2>
          {formErr && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex gap-2 text-sm text-red-600">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5"/>{formErr}
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-gray-600 block mb-1">Profile ID สมาชิก *</label>
              <input name="member_id" placeholder="UUID ของสมาชิก"
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-emerald-500"/>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">พันธุ์ *</label>
              <select value={selVar} onChange={e=>setSelVar(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-emerald-500">
                {SEED_VARIETIES.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">จำนวน (กก.) *</label>
              <input name="quantity_kg" type="number" min="1" step="0.5" placeholder="7"
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500"/>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">วันนัดรับ *</label>
              <input name="pickup_date" type="date" min={new Date().toISOString().split('T')[0]}
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500"/>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">หมายเหตุ</label>
              <input name="pickup_note" placeholder="หมายเหตุ"
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500"/>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={()=>{setShowForm(false);setFormErr(null)}}
              className="flex-1 border-2 border-gray-200 text-gray-600 py-2.5 rounded-xl font-semibold text-sm">ยกเลิก</button>
            <button type="submit" disabled={saving}
              className={`flex-1 bg-emerald-600 text-white py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-1 ${saving?'opacity-70':'hover:bg-emerald-700'}`}>
              {saving?<><RefreshCw className="w-3.5 h-3.5 animate-spin"/>จอง...</>:<><Package className="w-4 h-4"/>จองเลย</>}
            </button>
          </div>
        </form>
      )}

      {/* Filter + Search */}
      <div className="flex gap-2 flex-wrap">
        {(['all','pending','confirmed','received','cancelled'] as const).map(s=>(
          <button key={s} onClick={()=>setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all
              ${filterStatus===s?'bg-emerald-600 text-white border-emerald-600':'bg-white border-gray-200 text-gray-600'}`}>
            {s==='all'?'ทั้งหมด':STATUS_CFG[s]?.label??s}
          </button>
        ))}
        <div className="relative flex-1 min-w-40">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"/>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="ค้นหาชื่อ เบอร์ หรือพันธุ์"
            className="w-full pl-8 pr-3 py-1.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"/>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-10"><RefreshCw className="w-6 h-6 text-emerald-600 animate-spin"/></div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-12 text-gray-400"><Package className="w-10 h-10 mx-auto mb-3 opacity-30"/><p>ไม่มีรายการ</p></div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase tracking-wide font-semibold">
                  <th className="text-left px-4 py-3">สมาชิก</th>
                  <th className="text-left px-3 py-3">พันธุ์</th>
                  <th className="text-center px-3 py-3">กก.</th>
                  <th className="text-left px-3 py-3">วันนัดรับ</th>
                  <th className="text-center px-3 py-3">สถานะ</th>
                  <th className="text-left px-3 py-3">จองโดย</th>
                  <th className="text-center px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {displayed.map(b => {
                  const st  = STATUS_CFG[b.status] ?? { label: b.status, bg:'bg-gray-100', text:'text-gray-600' }
                  const isA = acting === b.id
                  return (
                    <tr key={b.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900 whitespace-nowrap">{b.member_name||'-'}</div>
                        <div className="text-xs text-gray-400">{b.member_phone}</div>
                      </td>
                      <td className="px-3 py-3 font-medium text-gray-700 whitespace-nowrap">{b.variety_name}</td>
                      <td className="px-3 py-3 text-center font-bold text-gray-800">{b.quantity_kg}</td>
                      <td className="px-3 py-3 text-gray-600 whitespace-nowrap">
                        {b.pickup_date ? new Date(b.pickup_date).toLocaleDateString('th-TH',{day:'numeric',month:'short'}) : '-'}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${st.bg} ${st.text}`}>{st.label}</span>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-500">
                        {b.booked_by_role==='self'?'ตัวเอง':b.booked_by_role==='leader'?'Leader':'ทีมขาย'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 justify-center">
                          {b.status==='pending' && <>
                            <button onClick={()=>act(b.id,'cancelled')} disabled={isA}
                              className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold transition-colors ${isA?'bg-gray-100 text-gray-300 cursor-wait':'bg-red-500 text-white hover:bg-red-600'}`}>
                              {isA?'…':'✖'}
                            </button>
                            <button onClick={()=>act(b.id,'confirmed')} disabled={isA}
                              className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold transition-colors ${isA?'bg-gray-100 text-gray-300 cursor-wait':'bg-emerald-500 text-white hover:bg-emerald-600'}`}>
                              {isA?'…':'✔'}
                            </button>
                          </>}
                          {b.status==='confirmed' && (
                            <button onClick={()=>act(b.id,'received')} disabled={isA}
                              className={`px-2.5 h-7 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${isA?'bg-gray-100 text-gray-300 cursor-wait':'bg-blue-500 text-white hover:bg-blue-600'}`}>
                              {isA?'…':'📦 รับแล้ว'}
                            </button>
                          )}
                          {(b.status==='received'||b.status==='cancelled') && (
                            <span className="text-gray-300 text-xs">-</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 bg-gray-50 border-t text-xs text-gray-500">
            แสดง {displayed.length} จาก {total} รายการ · รวม {displayed.reduce((s,b)=>s+b.quantity_kg,0)} กก.
          </div>
        </div>
      )}
    </div>
  )
}
