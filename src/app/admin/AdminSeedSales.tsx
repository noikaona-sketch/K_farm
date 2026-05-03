import React, { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Check, MapPin, Package, RefreshCw, Search, Wifi, WifiOff, X } from 'lucide-react'
import { isSupabaseReady, supabase } from '../../lib/supabase'

type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'converted'
type Member = { id: string; name: string; phone: string; district?: string; lat?: number; lng?: number }
type Variety = { id: string; name: string }
type Booking = { id: string; profile_id: string; member_name: string; member_phone: string; variety_id: string; variety_name: string; quantity_kg: number; pickup_date: string; pickup_note?: string; status: BookingStatus; booked_by_role?: string; lat?: number; lng?: number; district?: string }

const STATUS_CFG: Record<string, { label: string; bg: string; text: string }> = {
  pending: { label: 'รออนุมัติ', bg: 'bg-amber-100', text: 'text-amber-700' },
  confirmed: { label: 'อนุมัติแล้ว', bg: 'bg-blue-100', text: 'text-blue-700' },
  converted: { label: 'แปลงเป็นขายแล้ว', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  cancelled: { label: 'ยกเลิก', bg: 'bg-red-100', text: 'text-red-700' },
}
const MOCK_MEMBERS: Member[] = [{ id: 'mock-f1', name: 'สมชาย ใจดี', phone: '0812345678', district: 'สำโรง', lat: 15.0, lng: 104.8 }]
const MOCK_VARIETIES: Variety[] = [{ id: 'mock-v1', name: 'ข้าวโพดพันธุ์ A' }]
const MOCK_BOOKINGS: Booking[] = [{ id: 'mock-r1', profile_id: 'mock-f1', member_name: 'สมชาย ใจดี', member_phone: '0812345678', variety_id: 'mock-v1', variety_name: 'ข้าวโพดพันธุ์ A', quantity_kg: 10, pickup_date: new Date().toISOString().slice(0, 10), pickup_note: 'รับที่โกดัง', status: 'pending', booked_by_role: 'sales', district: 'สำโรง', lat: 15.0, lng: 104.8 }]

export default function AdminSeedSales() {
  const [bookings, setBookings] = useState<Booking[]>(MOCK_BOOKINGS)
  const [members, setMembers] = useState<Member[]>(MOCK_MEMBERS)
  const [varieties, setVarieties] = useState<Variety[]>(MOCK_VARIETIES)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [acting, setActing] = useState<string | null>(null)
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ profile_id: '', variety_id: '', quantity_kg: '', pickup_date: '', pickup_note: '' })

  const flash = (ok: boolean, msg: string) => { setToast({ ok, msg }); setTimeout(() => setToast(null), 4000) }

  const load = async () => {
    setLoading(true)
    try {
      if (!isSupabaseReady || !supabase) { setMembers(MOCK_MEMBERS); setVarieties(MOCK_VARIETIES); setBookings(MOCK_BOOKINGS); return }
      const [memberRes, varietyRes, bookingRes] = await Promise.all([
        supabase.from('profiles').select('id,full_name,phone,district,lat,lng').in('role', ['farmer', 'member']).order('full_name'),
        supabase.from('seed_varieties').select('id,variety_name,status').neq('status', 'inactive').order('variety_name'),
        supabase.from('seed_bookings').select('*').order('pickup_date', { ascending: true }),
      ])
      if (memberRes.error) throw new Error(memberRes.error.message)
      if (varietyRes.error) throw new Error(varietyRes.error.message)
      if (bookingRes.error) throw new Error(bookingRes.error.message)
      const memberRows = (memberRes.data ?? []).map((r: any) => ({ id: String(r.id), name: String(r.full_name ?? '-'), phone: String(r.phone ?? ''), district: String(r.district ?? ''), lat: r.lat ? Number(r.lat) : undefined, lng: r.lng ? Number(r.lng) : undefined }))
      const varietyRows = (varietyRes.data ?? []).map((r: any) => ({ id: String(r.id), name: String(r.variety_name ?? '-') }))
      const memberMap = new Map(memberRows.map((m: Member) => [m.id, m]))
      const varietyMap = new Map(varietyRows.map((v: Variety) => [v.id, v.name]))
      setMembers(memberRows); setVarieties(varietyRows)
      setBookings((bookingRes.data ?? []).map((r: any) => { const m = memberMap.get(String(r.profile_id ?? r.farmer_id ?? '')); return { id: String(r.id), profile_id: String(r.profile_id ?? r.farmer_id ?? ''), member_name: String(r.member_name ?? m?.name ?? '-'), member_phone: String(r.member_phone ?? m?.phone ?? ''), variety_id: String(r.variety_id ?? ''), variety_name: String(r.variety_name ?? varietyMap.get(String(r.variety_id ?? '')) ?? '-'), quantity_kg: Number(r.quantity_kg ?? r.quantity ?? 0), pickup_date: String(r.pickup_date ?? ''), pickup_note: String(r.pickup_note ?? ''), status: String(r.status ?? 'pending') as BookingStatus, booked_by_role: String(r.booked_by_role ?? 'sales'), lat: m?.lat, lng: m?.lng, district: m?.district } }))
    } catch (e) { flash(false, e instanceof Error ? e.message : 'โหลดข้อมูลไม่สำเร็จ') }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])

  const selectedMember = members.find(m => m.id === form.profile_id)
  const selectedVariety = varieties.find(v => v.id === form.variety_id)

  const create = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try {
      if (!selectedMember) throw new Error('กรุณาเลือกสมาชิก')
      if (!selectedVariety) throw new Error('กรุณาเลือกพันธุ์')
      const qty = Number(form.quantity_kg); if (qty <= 0) throw new Error('กรุณากรอกจำนวน')
      if (!form.pickup_date) throw new Error('กรุณาเลือกวันนัดรับ')
      const payload = { profile_id: selectedMember.id, member_name: selectedMember.name, member_phone: selectedMember.phone, variety_id: selectedVariety.id, variety_name: selectedVariety.name, quantity_kg: qty, pickup_date: form.pickup_date, pickup_note: form.pickup_note, booked_by: 'admin', booked_by_role: 'sales', status: 'pending' }
      if (!isSupabaseReady || !supabase) setBookings(prev => [{ id: `mock-r-${Date.now()}`, ...payload, lat: selectedMember.lat, lng: selectedMember.lng, district: selectedMember.district } as Booking, ...prev])
      else { const { error } = await supabase.from('seed_bookings').insert(payload); if (error) throw new Error(error.message); await load() }
      flash(true, 'บันทึกจองสำเร็จ'); setShowForm(false); setForm({ profile_id: '', variety_id: '', quantity_kg: '', pickup_date: '', pickup_note: '' })
    } catch (e) { flash(false, e instanceof Error ? e.message : 'บันทึกจองไม่สำเร็จ') }
    finally { setSaving(false) }
  }

  const act = async (id: string, status: BookingStatus) => {
    setActing(id)
    try {
      if (!isSupabaseReady || !supabase || id.startsWith('mock-')) setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b))
      else { const { error } = await supabase.from('seed_bookings').update({ status }).eq('id', id); if (error) throw new Error(error.message); await load() }
      flash(true, status === 'confirmed' ? 'อนุมัติรายการจองแล้ว' : status === 'cancelled' ? 'ยกเลิกรายการจองแล้ว' : 'อัปเดตสถานะแล้ว')
    } catch (e) { flash(false, e instanceof Error ? e.message : 'อัปเดตไม่สำเร็จ') }
    finally { setActing(null) }
  }

  const openMap = (b: Booking) => {
    if (b.lat && b.lng) window.open(`https://www.google.com/maps?q=${b.lat},${b.lng}`, '_blank')
    else flash(false, 'รายการนี้ยังไม่มีพิกัด')
  }

  const displayed = useMemo(() => bookings.filter(b => filterStatus === 'all' || b.status === filterStatus).filter(b => `${b.member_name} ${b.member_phone} ${b.variety_name} ${b.district}`.toLowerCase().includes(search.toLowerCase())), [bookings, filterStatus, search])
  const total = bookings.length
  const pending = bookings.filter(b => b.status === 'pending').length
  const confirmed = bookings.filter(b => b.status === 'confirmed').length
  const qtyTotal = bookings.filter(b => b.status !== 'cancelled').reduce((s, b) => s + b.quantity_kg, 0)

  return <div className="space-y-5">
    <div className="flex items-center justify-between flex-wrap gap-3"><div><h1 className="text-xl font-bold text-gray-900">จองเมล็ดพันธุ์</h1><div className="flex items-center gap-1.5 mt-0.5 text-sm">{isSupabaseReady ? <><Wifi className="w-3.5 h-3.5 text-emerald-600"/><span className="text-emerald-600">Approve / Map / นัดรับ</span></> : <><WifiOff className="w-3.5 h-3.5 text-amber-500"/><span className="text-amber-600">Mock data</span></>}</div></div><div className="flex gap-2"><button onClick={() => void load()} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm"><RefreshCw className="w-4 h-4"/>รีโหลด</button><button onClick={() => setShowForm(v => !v)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold"><Package className="w-4 h-4"/>จองให้สมาชิก</button></div></div>
    {toast && <div className={`rounded-xl px-4 py-3 flex items-center gap-2 text-sm font-medium border ${toast.ok ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-red-50 border-red-300 text-red-700'}`}>{toast.ok ? <Check className="w-4 h-4"/> : <AlertCircle className="w-4 h-4"/>}{toast.msg}<button onClick={() => setToast(null)} className="ml-auto"><X className="w-4 h-4"/></button></div>}
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{[{l:'ทั้งหมด',n:total,b:'bg-gray-50 text-gray-700'},{l:'รออนุมัติ',n:pending,b:'bg-amber-50 text-amber-700'},{l:'อนุมัติแล้ว',n:confirmed,b:'bg-blue-50 text-blue-700'},{l:'รวมจำนวน',n:qtyTotal,b:'bg-emerald-50 text-emerald-700',x:' ถุง'}].map(i=><div key={i.l} className={`rounded-2xl p-4 text-center border ${i.b}`}><div className="text-2xl font-bold">{i.n}{i.x ?? ''}</div><div className="text-sm">{i.l}</div></div>)}</div>
    {showForm && <form onSubmit={create} className="bg-white rounded-2xl border p-5 grid grid-cols-1 md:grid-cols-4 gap-4"><select value={form.profile_id} onChange={e=>setForm(p=>({...p,profile_id:e.target.value}))} className="border rounded-xl p-2 md:col-span-2"><option value="">เลือกสมาชิก</option>{members.map(m=><option key={m.id} value={m.id}>{m.name} | {m.phone} | {m.district ?? '-'}</option>)}</select><select value={form.variety_id} onChange={e=>setForm(p=>({...p,variety_id:e.target.value}))} className="border rounded-xl p-2"><option value="">เลือกพันธุ์</option>{varieties.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select><input type="number" placeholder="จำนวนถุง" value={form.quantity_kg} onChange={e=>setForm(p=>({...p,quantity_kg:e.target.value}))} className="border rounded-xl p-2"/><input type="date" value={form.pickup_date} onChange={e=>setForm(p=>({...p,pickup_date:e.target.value}))} className="border rounded-xl p-2"/><input placeholder="สถานที่/หมายเหตุรับสินค้า" value={form.pickup_note} onChange={e=>setForm(p=>({...p,pickup_note:e.target.value}))} className="border rounded-xl p-2 md:col-span-2"/><button disabled={saving} className="bg-emerald-600 text-white rounded-xl py-2 font-bold">บันทึกจอง</button></form>}
    <div className="flex gap-2 flex-wrap">{['all','pending','confirmed','converted','cancelled'].map(s=><button key={s} onClick={()=>setFilterStatus(s)} className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${filterStatus===s?'bg-emerald-600 text-white':'bg-white text-gray-600'}`}>{s==='all'?'ทั้งหมด':STATUS_CFG[s]?.label??s}</button>)}<div className="relative flex-1 min-w-40"><Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ค้นหาชื่อ เบอร์ พันธุ์ พื้นที่" className="w-full pl-8 pr-3 py-1.5 border-2 border-gray-200 rounded-xl text-sm"/></div></div>
    <div className="bg-white rounded-2xl border overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-gray-50 border-b text-xs text-gray-500"><th className="text-left px-4 py-3">สมาชิก</th><th className="text-left px-3 py-3">พันธุ์</th><th className="text-center px-3 py-3">จำนวน</th><th className="text-left px-3 py-3">นัดรับ</th><th className="text-left px-3 py-3">พื้นที่/Map</th><th className="text-center px-3 py-3">สถานะ</th><th className="text-center px-4 py-3">Action</th></tr></thead><tbody>{loading ? <tr><td colSpan={7} className="p-8 text-center text-gray-400">กำลังโหลด...</td></tr> : displayed.length===0 ? <tr><td colSpan={7} className="p-8 text-center text-gray-400">ไม่มีรายการ</td></tr> : displayed.map(b=>{ const st=STATUS_CFG[b.status]??STATUS_CFG.pending; const isA=acting===b.id; return <tr key={b.id} className="border-t hover:bg-gray-50"><td className="px-4 py-3"><div className="font-semibold">{b.member_name}</div><div className="text-xs text-gray-400">{b.member_phone}</div></td><td className="px-3 py-3">{b.variety_name}</td><td className="px-3 py-3 text-center font-bold">{b.quantity_kg}</td><td className="px-3 py-3"><div>{b.pickup_date || '-'}</div><div className="text-xs text-gray-400">{b.pickup_note || '-'}</div></td><td className="px-3 py-3"><button onClick={()=>openMap(b)} className="inline-flex items-center gap-1 text-blue-600 text-xs"><MapPin className="w-3 h-3"/>{b.district || 'เปิดแผนที่'}</button></td><td className="px-3 py-3 text-center"><span className={`text-xs px-2 py-1 rounded-full font-semibold ${st.bg} ${st.text}`}>{st.label}</span></td><td className="px-4 py-3"><div className="flex justify-center gap-2 whitespace-nowrap">{b.status==='pending' && <><button disabled={isA} onClick={()=>void act(b.id,'confirmed')} className="px-2 py-1 bg-emerald-600 text-white rounded text-xs">อนุมัติ</button><button disabled={isA} onClick={()=>void act(b.id,'cancelled')} className="px-2 py-1 bg-red-600 text-white rounded text-xs">ยกเลิก</button></>}{b.status==='confirmed' && <span className="text-xs text-blue-600">รอขายใน Invoice</span>}{b.status==='converted' && <span className="text-xs text-emerald-600">ขายแล้ว</span>}{b.status==='cancelled' && <span className="text-xs text-gray-300">-</span>}</div></td></tr>})}</tbody></table></div></div>
  </div>
}
