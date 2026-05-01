import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, MapPin, Camera, RefreshCw, Check, AlertCircle, ImagePlus } from 'lucide-react'
import { useAuth } from '../../routes/AuthContext'
import { insertFarm } from '../../lib/db'
import { isSupabaseReady } from '../../lib/supabase'

async function readExifCoords(file: File): Promise<{ lat: number; lng: number } | null> {
  return new Promise(resolve => {
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const view = new DataView(e.target!.result as ArrayBuffer)
        if (view.getUint16(0, false) !== 0xFFD8) return resolve(null)
        let off = 2
        while (off < view.byteLength) {
          const marker = view.getUint16(off, false); off += 2
          if (marker === 0xFFE1) {
            const es = String.fromCharCode(...new Uint8Array(e.target!.result as ArrayBuffer, off + 2, 4))
            if (es !== 'Exif') return resolve(null)
            const ts = off + 8; const le = view.getUint16(ts, false) === 0x4949
            const ifd0 = ts + view.getUint32(ts + 4, le); const ent = view.getUint16(ifd0, le)
            let gpsOff: number | null = null
            for (let i = 0; i < ent; i++)
              if (view.getUint16(ifd0 + 2 + i * 12, le) === 0x8825)
                gpsOff = view.getUint32(ifd0 + 2 + i * 12 + 8, le)
            if (gpsOff == null) return resolve(null)
            const gIfd = ts + gpsOff; const ge = view.getUint16(gIfd, le)
            let lr: string | undefined, lv: number | undefined, nr: string | undefined, nv: number | undefined
            for (let i = 0; i < ge; i++) {
              const b = gIfd + 2 + i * 12; const tag = view.getUint16(b, le)
              const vo = view.getUint32(b + 8, le)
              const r = (o: number) => { const n = view.getUint32(ts + o, le), d = view.getUint32(ts + o + 4, le); return d ? n / d : 0 }
              if (tag === 0x0001) lr = String.fromCharCode(view.getUint8(b + 8))
              if (tag === 0x0002) lv = r(vo) + r(vo + 8) / 60 + r(vo + 16) / 3600
              if (tag === 0x0003) nr = String.fromCharCode(view.getUint8(b + 8))
              if (tag === 0x0004) nv = r(vo) + r(vo + 8) / 60 + r(vo + 16) / 3600
            }
            if (lv != null && nv != null) return resolve({ lat: lr === 'S' ? -lv : lv, lng: nr === 'W' ? -nv : nv })
            return resolve(null)
          }
          off += view.getUint16(off, false)
        }
        resolve(null)
      } catch { resolve(null) }
    }
    reader.readAsArrayBuffer(file)
  })
}

export default function PinFarm() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', area: '', soil: 'ดินร่วน', water: 'น้ำฝน', district: '', village: '' })
  const [photo, setPhoto] = useState<string | null>(null)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [gpsSource, setGpsSource] = useState<string>('')
  const [gpsLoading, setGpsLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [farmId, setFarmId] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const requestGPS = () => {
    setGpsLoading(true); setErr(null)
    navigator.geolocation.getCurrentPosition(
      pos => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGpsSource('📡 GPS มือถือ'); setGpsLoading(false) },
      () => { setErr('ไม่สามารถดึงพิกัด GPS ได้ กรุณาอนุญาตการเข้าถึงตำแหน่ง'); setGpsLoading(false) }
    )
  }

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setPhoto(ev.target!.result as string)
    reader.readAsDataURL(file)
    const exif = await readExifCoords(file)
    if (exif) { setCoords(exif); setGpsSource('✨ พิกัดจาก EXIF รูปถ่าย') }
    else requestGPS()
  }

  const handleSave = async () => {
    if (!form.name.trim()) { setErr('กรุณากรอกชื่อแปลง'); return }
    if (!form.area || isNaN(parseFloat(form.area))) { setErr('กรุณากรอกพื้นที่เป็นตัวเลข'); return }
    if (!coords) { setErr('กรุณาถ่ายรูปแปลงหรือกดดึงพิกัด GPS'); return }
    setSaving(true); setErr(null)
    const res = await insertFarm({
      farmer_id: user?.id ?? 'mock',
      name: form.name.trim(),
      area: parseFloat(form.area),
      province: 'บุรีรัมย์',
      district: form.district.trim(),
      village: form.village.trim(),
      lat: coords.lat,
      lng: coords.lng,
      soil_type: form.soil,
      water_source: form.water,
    })
    setSaving(false)
    if (isSupabaseReady && res.error) { setErr(`บันทึกแปลงไม่สำเร็จ: ${res.error}`); return }
    setFarmId(res.data?.id ?? null)
    setDone(true)
  }

  if (done) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-5 text-center">
      <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
        <MapPin className="w-12 h-12 text-emerald-600" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">ปักหมุดแปลงสำเร็จ!</h2>
      {coords && (
        <div className="bg-white border-2 border-emerald-300 rounded-2xl p-4 mb-4 w-full max-w-sm">
          <div className="text-sm text-emerald-600 font-semibold mb-1">📍 พิกัดที่บันทึก</div>
          <div className="font-mono text-gray-800">{coords.lat.toFixed(6)}°N</div>
          <div className="font-mono text-gray-800">{coords.lng.toFixed(6)}°E</div>
          <a href={`https://www.google.com/maps?q=${coords.lat},${coords.lng}`}
            target="_blank" rel="noreferrer"
            className="mt-2 flex items-center justify-center gap-2 text-blue-600 text-sm font-medium">
            🗺️ เปิดใน Google Maps
          </a>
        </div>
      )}
      <p className="text-gray-500 text-sm mb-2">
        {isSupabaseReady ? '🟢 บันทึกลง Supabase: farms' : '🟡 Mock mode'}
      </p>
      {farmId && <p className="text-xs text-gray-400 font-mono mb-4">Farm ID: {farmId}</p>}
      <p className="text-gray-500 text-sm mb-6">หัวหน้ากลุ่มจะตรวจสอบและยืนยันแปลงของท่าน</p>
      <button onClick={() => navigate('/farmer')}
        className="w-full max-w-sm bg-emerald-600 text-white rounded-xl py-4 font-bold hover:bg-emerald-700 transition-colors">
        กลับหน้าหลัก
      </button>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-emerald-600 text-white px-5 py-4 flex items-center gap-3 sticky top-0 z-40">
        <button onClick={() => navigate(-1)} className="p-1"><ChevronLeft className="w-6 h-6" /></button>
        <div>
          <div className="font-bold text-lg">ปักหมุดแปลงปลูก</div>
          <div className="text-xs text-emerald-200">แจ้งตำแหน่งแปลงพร้อมรูปถ่าย</div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {err && (
          <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-red-700">เกิดข้อผิดพลาด</p>
              <p className="text-sm text-red-600">{err}</p>
            </div>
          </div>
        )}

        {/* Photo + GPS */}
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
          <h3 className="font-bold text-gray-700 text-sm">📸 ถ่ายรูปแปลง (พิกัดอัตโนมัติ)</h3>
          <label className={`${photo ? '' : 'h-44'} bg-gradient-to-br from-emerald-900 to-emerald-950 rounded-2xl flex flex-col items-center justify-center gap-2 border-2 border-dashed border-emerald-500 cursor-pointer hover:border-emerald-400 transition-colors overflow-hidden relative`}>
            {photo ? (
              <>
                <img src={photo} className="w-full rounded-2xl block" />
                <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-sm text-center py-2.5 flex items-center justify-center gap-2">
                  <Camera className="w-4 h-4" />เปลี่ยนรูป
                </div>
              </>
            ) : (
              <><ImagePlus className="w-10 h-10 text-emerald-400" /><p className="text-emerald-300 font-medium">ถ่ายรูปแปลง</p><p className="text-emerald-400 text-xs">พิกัดจะถูกดึงจากรูปอัตโนมัติ</p></>
            )}
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
          </label>

          {gpsLoading && (
            <div className="flex items-center gap-3 bg-emerald-950 rounded-xl p-3">
              <RefreshCw className="w-5 h-5 text-emerald-400 animate-spin" />
              <span className="text-emerald-300 text-sm">กำลังดึงพิกัด...</span>
            </div>
          )}

          {coords && !gpsLoading && (
            <div className="bg-emerald-50 border-2 border-emerald-400 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs text-emerald-600 font-semibold">{gpsSource}</div>
                <button onClick={requestGPS} className="text-xs text-emerald-700 border border-emerald-400 px-2 py-1 rounded-lg flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" />รีเฟรช
                </button>
              </div>
              <div className="font-mono text-sm text-gray-800 font-bold">
                {coords.lat.toFixed(6)}°N, {coords.lng.toFixed(6)}°E
              </div>
              <a href={`https://www.google.com/maps?q=${coords.lat},${coords.lng}`}
                target="_blank" rel="noreferrer"
                className="text-xs text-blue-600 font-medium mt-1 flex items-center gap-1">
                🗺️ เปิดใน Google Maps
              </a>
            </div>
          )}

          {!coords && !gpsLoading && (
            <button onClick={requestGPS}
              className="w-full bg-amber-400 text-amber-900 rounded-xl py-3 font-bold flex items-center justify-center gap-2 hover:bg-amber-500 transition-colors">
              <MapPin className="w-5 h-5" />ดึงพิกัด GPS มือถือ
            </button>
          )}
        </div>

        {/* Farm info */}
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
          <h3 className="font-bold text-gray-700 text-sm">📋 ข้อมูลแปลง</h3>
          {[
            { l: 'ชื่อแปลง *', k: 'name', p: 'เช่น แปลงที่ 1 หนองบัว' },
            { l: 'พื้นที่ (ไร่) *', k: 'area', p: '6.5' },
            { l: 'หมู่บ้าน', k: 'village', p: 'บ้าน...' },
            { l: 'อำเภอ', k: 'district', p: 'อำเภอ...' },
          ].map(({ l, k, p }) => (
            <div key={k}>
              <label className="text-xs font-semibold text-gray-600 block mb-1">{l}</label>
              <input value={form[k as keyof typeof form]}
                onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                placeholder={p}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500" />
            </div>
          ))}
          {[
            { l: 'ประเภทดิน', k: 'soil', opts: ['ดินร่วน', 'ดินเหนียว', 'ดินร่วนปนทราย', 'ดินทราย'] },
            { l: 'แหล่งน้ำ', k: 'water', opts: ['น้ำฝน', 'บ่อน้ำ', 'ชลประทาน', 'อ่างเก็บน้ำ'] },
          ].map(({ l, k, opts }) => (
            <div key={k}>
              <label className="text-xs font-semibold text-gray-600 block mb-1">{l}</label>
              <select value={form[k as keyof typeof form]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500">
                {opts.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          ))}
        </div>

        <button onClick={handleSave} disabled={saving}
          className={`w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold text-base shadow-md transition-all flex items-center justify-center gap-2 ${saving ? 'opacity-70' : 'hover:bg-emerald-700 active:scale-[.98]'}`}>
          {saving ? <><RefreshCw className="w-5 h-5 animate-spin" />กำลังบันทึก...</> : <><MapPin className="w-5 h-5" />ปักหมุดแปลง</>}
        </button>
      </div>
    </div>
  )
}
