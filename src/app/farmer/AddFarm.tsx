import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, AlertCircle, RefreshCw } from 'lucide-react'
import { useAuth } from '../../routes/AuthContext'
import { insertFarm } from '../../lib/db'
import { isSupabaseReady } from '../../lib/supabase'

export default function AddFarm() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [insertedId, setInsertedId] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '', area: '', soil: 'ดินร่วน', water: 'น้ำฝน',
    village: '', district: '', province: 'บุรีรัมย์', lat: '', lng: '',
  })
  const u = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.name || !form.area) { setErr('กรุณากรอกชื่อแปลงและพื้นที่'); return }
    setSaving(true); setErr(null)
    const res = await insertFarm({
      farmer_id: user?.id ?? 'mock-farmer',
      name: form.name,
      area: parseFloat(form.area) || 0,
      province: form.province,
      district: form.district,
      village: form.village,
      lat: form.lat ? parseFloat(form.lat) : undefined,
      lng: form.lng ? parseFloat(form.lng) : undefined,
      soil_type: form.soil,
      water_source: form.water,
    })
    setSaving(false)
    if (res.error && isSupabaseReady) { setErr(res.error); return }
    setInsertedId(res.data?.id ?? null)
    setDone(true)
  }

  if (done) return (
    <div className="p-6 flex flex-col items-center justify-center min-h-80 text-center gap-4">
      <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center text-4xl">🌾</div>
      <h2 className="text-xl font-bold text-emerald-700">เพิ่มแปลงสำเร็จ!</h2>
      {isSupabaseReady
        ? <p className="text-emerald-600 text-sm font-medium">🟢 บันทึกลง Supabase</p>
        : <p className="text-amber-600 text-sm font-medium">🟡 Mock (ไม่มี Supabase)</p>}
      {insertedId && <p className="text-xs text-gray-400 font-mono">Farm ID: {insertedId}</p>}
      <p className="text-gray-500 text-sm">แปลงจะถูกส่งให้หัวหน้ากลุ่มยืนยัน</p>
      <button onClick={() => navigate('/farmer/farms')}
        className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-colors">
        ดูแปลงของฉัน
      </button>
    </div>
  )

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-gray-100">←</button>
        <div>
          <h1 className="font-bold text-gray-800">เพิ่มแปลงใหม่</h1>
          <p className="text-xs text-gray-400">{isSupabaseReady ? '🟢 Supabase' : '🟡 Mock mode'}</p>
        </div>
      </div>

      {err && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />{err}
        </div>
      )}

      <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
        <h2 className="font-semibold text-gray-700 text-sm border-b pb-2">📍 ข้อมูลแปลง</h2>
        {[
          { l: 'ชื่อแปลง *', k: 'name', p: 'เช่น แปลงที่ 1 หนองบัว' },
          { l: 'พื้นที่ (ไร่) *', k: 'area', p: '6.5' },
          { l: 'หมู่บ้าน', k: 'village', p: 'บ้าน...' },
          { l: 'อำเภอ', k: 'district', p: 'อำเภอ...' },
          { l: 'ละติจูด', k: 'lat', p: '14.993' },
          { l: 'ลองจิจูด', k: 'lng', p: '103.102' },
        ].map(({ l, k, p }) => (
          <div key={k}>
            <label className="text-xs font-semibold text-gray-600 block mb-1">{l}</label>
            <input value={form[k as keyof typeof form]} onChange={e => u(k as keyof typeof form, e.target.value)}
              placeholder={p}
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-colors" />
          </div>
        ))}
        {[
          { l: 'ประเภทดิน', k: 'soil', opts: ['ดินร่วน', 'ดินเหนียว', 'ดินร่วนปนทราย', 'ดินทราย'] },
          { l: 'แหล่งน้ำ', k: 'water', opts: ['น้ำฝน', 'บ่อน้ำ', 'ชลประทาน', 'อ่างเก็บน้ำ'] },
        ].map(({ l, k, opts }) => (
          <div key={k}>
            <label className="text-xs font-semibold text-gray-600 block mb-1">{l}</label>
            <select value={form[k as keyof typeof form]} onChange={e => u(k as keyof typeof form, e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500">
              {opts.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
        ))}
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
        <p className="text-xs text-yellow-700">📌 หัวหน้ากลุ่มจะต้องยืนยันแปลงก่อนจึงจะใช้งานได้</p>
      </div>

      <button onClick={handleSave} disabled={saving}
        className={`w-full bg-emerald-600 text-white py-3 rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 ${saving ? 'opacity-70' : 'hover:bg-emerald-700 active:scale-[.98]'}`}>
        {saving ? <><RefreshCw className="w-4 h-4 animate-spin" />กำลังบันทึก...</> : '✓ บันทึกแปลง'}
      </button>
    </div>
  )
}
