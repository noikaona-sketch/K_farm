import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronLeft, Camera, FileText, User, Check,
  AlertCircle, MapPin, RefreshCw, ImagePlus, Wifi, WifiOff,
} from 'lucide-react'
import { useAuth, type RegStatus } from '../../routes/AuthContext'
import { insertProfile, insertFarmer } from '../../lib/db'
import { isSupabaseReady } from '../../lib/supabase'
import { uploadFarmPhoto } from '../../lib/storage'

function readExifCoords(file: File): Promise<{ lat: number; lng: number } | null> {
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
            if (lv != null && nv != null)
              return resolve({ lat: lr === 'S' ? -lv : lv, lng: nr === 'W' ? -nv : nv })
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

export default function RegisterPage() {
  const { user, login, setRegStatus } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [method, setMethod] = useState<'ocr' | 'manual' | null>(null)
  const [form, setForm] = useState({ name: '', phone: '', idcard: '', district: '', village: '', province: 'บุรีรัมย์' })
  const [plotFile, setPlotFile] = useState<File | null>(null)
  const [plotPreview, setPlotPreview] = useState<string | null>(null)
  const [ocrPreview, setOcrPreview] = useState<string | null>(null)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [gpsSource, setGpsSource] = useState<string | null>(null)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadStep, setUploadStep] = useState<string>('')   // ข้อความ loading
  const [done, setDone] = useState(false)
  const [insertedFarmerId, setInsertedFarmerId] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const requestGPS = () => {
    setGpsLoading(true); setErr(null)
    navigator.geolocation.getCurrentPosition(
      pos => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGpsSource('device'); setGpsLoading(false) },
      () => { setErr('ไม่สามารถดึงพิกัดได้ กรุณาอนุญาตการเข้าถึงตำแหน่ง'); setGpsLoading(false) }
    )
  }

  const handlePlotPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setPlotFile(file); setErr(null)
    const reader = new FileReader()
    reader.onload = ev => setPlotPreview(ev.target!.result as string)
    reader.readAsDataURL(file)
    const exif = await readExifCoords(file)
    if (exif) { setCoords(exif); setGpsSource('exif') } else requestGPS()
  }

  const handleOcrPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setOcrLoading(true); setErr(null)
    const reader = new FileReader()
    reader.onload = ev => setOcrPreview(ev.target!.result as string)
    reader.readAsDataURL(file)
    await new Promise(r => setTimeout(r, 1200))
    setOcrLoading(false); setStep(3)
  }

  const handleSubmit = async () => {
    if (!plotFile || !coords) return
    setSaving(true); setErr(null); setUploadStep('')

    try {
      // ── STEP 1: บันทึกข้อมูลส่วนตัว ──
      setUploadStep('กำลังบันทึกข้อมูลส่วนตัว...')
      const profileRes = await insertProfile({
        full_name: form.name.trim() || 'ไม่ระบุ',
        phone: form.phone.trim(),
        id_card: form.idcard.trim() || undefined,
        role: 'farmer',
      })
      if (isSupabaseReady && profileRes.error) {
        throw new Error(`บันทึกข้อมูลส่วนตัวไม่สำเร็จ: ${profileRes.error}`)
      }

      const farmerId = profileRes.data?.id ?? `mock-${Date.now()}`

      // ── STEP 2: อัปโหลดรูปแปลงไปยัง Storage bucket: farm-photos ──
      let photoUrl: string | null = null
      if (isSupabaseReady) {
        setUploadStep('กำลังอัปโหลดรูปแปลงไปยัง Storage...')
        try {
          photoUrl = await uploadFarmPhoto(plotFile, farmerId)
        } catch (uploadErr: unknown) {
          const uploadErrMsg = uploadErr instanceof Error ? uploadErr.message : 'อัปโหลดรูปไม่สำเร็จ'
          console.error('[RegisterPage] photo upload failed:', uploadErrMsg)
          // แจ้งเตือนแต่ยังดำเนินการต่อ — ไม่ให้รูปพัง flow ทั้งหมด
          setErr(`⚠️ ${uploadErrMsg} — ข้อมูลจะยังถูกบันทึกโดยไม่มีรูป`)
        }
      } else {
        console.info('[RegisterPage] mock mode — skipping Storage upload')
      }

      // ── STEP 3: บันทึกข้อมูลเกษตรกร พร้อม photo_url + พิกัด ──
      setUploadStep('กำลังบันทึกข้อมูลเกษตรกร...')
      const farmerRes = await insertFarmer({
        profile_id: profileRes.data?.id,
        code: user?.code ?? `KF${Date.now()}`,
        province: form.province,
        district: form.district.trim() || 'ไม่ระบุ',
        village: form.village.trim() || 'ไม่ระบุ',
        total_area: 0,
        tier: 'bronze',
        status: 'pending',
        photo_url: photoUrl ?? undefined,
        lat: coords.lat,
        lng: coords.lng,
      })
      if (isSupabaseReady && farmerRes.error) {
        throw new Error(`บันทึกข้อมูลเกษตรกรไม่สำเร็จ: ${farmerRes.error}`)
      }

      setInsertedFarmerId(farmerRes.data?.id ?? null)
      setUploadStep('บันทึกสำเร็จ! ✓')

      // ── STEP 4: อัปเดต AuthContext ทันที ──
      const registeredName = form.name.trim() || user?.name || 'ไม่ระบุ'
      login({
        ...(user!),
        name: registeredName,
        registrationStatus: 'pending_leader',
      })
      setRegStatus('pending_leader')

      setDone(true)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
      setErr(msg)
      console.error('[RegisterPage] submit error:', msg)
    } finally {
      setSaving(false)
      setUploadStep('')
    }
  }

  if (done) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-5 text-center">
      <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-5">
        <Check className="w-12 h-12 text-emerald-600" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-3">ส่งคำขอสำเร็จ!</h2>
      {isSupabaseReady
        ? <p className="text-emerald-600 text-sm font-semibold mb-1">🟢 บันทึกลง Supabase เรียบร้อย</p>
        : <p className="text-amber-600 text-sm font-semibold mb-1">🟡 Mock mode (ไม่มี Supabase credentials)</p>
      }
      {isSupabaseReady && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 mb-2 text-xs text-emerald-700 font-medium">
          📸 รูปแปลงบันทึกลง Storage: <span className="font-mono">farm-photos/farmers/...</span>
        </div>
      )}
      {insertedFarmerId && (
        <p className="text-xs text-gray-400 font-mono mb-3">Farmer ID: {insertedFarmerId}</p>
      )}
      <p className="text-gray-500 text-sm leading-relaxed mb-6">
        รอ Leader ในกลุ่มอนุมัติภายใน 1–2 วัน<br />
        ระบบจะแจ้งเตือนผ่าน LINE ค่ะ
      </p>
      <div className="bg-emerald-50 rounded-2xl p-5 mb-6 text-left w-full max-w-sm">
        <p className="text-sm text-emerald-800 font-bold mb-3">ขั้นตอนถัดไป</p>
        {['Leader ตรวจสอบข้อมูล', 'Admin อนุมัติ', 'รับสิทธิ์สมาชิกเต็มรูปแบบ'].map((t, i) => (
          <div key={i} className="flex items-center gap-2 py-1.5">
            <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="text-sm text-gray-700">{t}</span>
          </div>
        ))}
      </div>
      <button onClick={() => navigate('/farmer')}
        className="w-full max-w-sm bg-emerald-600 text-white rounded-xl py-4 font-bold hover:bg-emerald-700 transition-colors">
        กลับหน้าหลัก
      </button>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-emerald-600 text-white px-5 py-4 flex items-center gap-3 sticky top-0 z-40">
        <button onClick={() => step > 1 ? setStep(s => s - 1) : navigate(-1)} className="p-1">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex-1">
          <div className="font-bold text-lg">ลงทะเบียนสมาชิก</div>
          <div className="flex items-center gap-1.5 text-xs opacity-90">
            <span>ขั้นตอนที่ {step} จาก 4</span>
            <span>•</span>
            {isSupabaseReady
              ? <><Wifi className="w-3 h-3" /><span>Supabase</span></>
              : <><WifiOff className="w-3 h-3" /><span>Mock mode</span></>
            }
          </div>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className={`h-1.5 rounded-full transition-all ${s <= step ? 'bg-white w-6' : 'bg-white/30 w-3'}`} />
          ))}
        </div>
      </div>

      {/* No-Supabase warning banner */}
      {!isSupabaseReady && (
        <div className="mx-5 mt-4 bg-amber-50 border-2 border-amber-300 rounded-xl p-3">
          <div className="flex items-start gap-2">
            <WifiOff className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-800">ไม่มี Supabase — Mock mode</p>
              <p className="text-xs text-amber-700 mt-0.5">
                ข้อมูลจะ<strong>ไม่</strong>ถูกบันทึกจริง ต้องตั้ง VITE_SUPABASE_URL
                และ VITE_SUPABASE_ANON_KEY ใน Vercel แล้ว Redeploy
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Step 1 */}
      {step === 1 && (
        <div className="p-5 space-y-4">
          <p className="font-bold text-base text-gray-800">เลือกวิธีสมัคร</p>
          {[
            { m: 'ocr' as const, Icon: FileText, bg: 'bg-emerald-50', label: 'มีบิลจากโรงงาน', sub: 'อนุมัติอัตโนมัติ ⚡' },
            { m: 'manual' as const, Icon: User, bg: 'bg-blue-50', label: 'สมาชิกใหม่', sub: 'รอ Admin อนุมัติ ⏳' },
          ].map(({ m, Icon, bg, label, sub }) => (
            <div key={m} onClick={() => { setMethod(m); setStep(2) }}
              className="bg-white rounded-2xl p-5 flex items-center gap-4 cursor-pointer shadow-sm hover:shadow-md transition-all active:scale-[.98]">
              <div className={`w-14 h-14 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                <Icon className="w-7 h-7 text-emerald-600" />
              </div>
              <div className="flex-1">
                <div className="font-bold text-base text-gray-900">{label}</div>
                <div className="text-sm text-gray-500 mt-0.5">{sub}</div>
              </div>
              <span className="text-gray-400 text-xl">›</span>
            </div>
          ))}
        </div>
      )}

      {/* Step 2A — OCR */}
      {step === 2 && method === 'ocr' && (
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-emerald-600" />
            <p className="font-bold text-base text-gray-800">ถ่ายรูปบิลสีชมพู</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 flex gap-3 text-sm text-blue-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>วางบิลบนพื้นเรียบ ถ่ายตรง ให้เห็นรหัสและยอดชัดเจน</span>
          </div>
          {ocrLoading ? (
            <div className="bg-emerald-950 rounded-2xl h-52 flex flex-col items-center justify-center">
              <RefreshCw className="w-12 h-12 text-emerald-400 animate-spin mb-3" />
              <p className="text-emerald-300 text-sm">กำลังอ่านบิล...</p>
            </div>
          ) : (
            <label className="bg-gradient-to-br from-emerald-900 to-emerald-950 rounded-2xl h-52 flex flex-col items-center justify-center gap-3 border-2 border-dashed border-emerald-500 cursor-pointer hover:border-emerald-400 transition-colors overflow-hidden">
              {ocrPreview
                ? <img src={ocrPreview} className="w-full h-full object-cover" />
                : <><Camera className="w-12 h-12 text-emerald-400" /><p className="text-emerald-300 font-medium">กดเพื่อถ่ายรูปบิล</p><p className="text-emerald-400 text-sm">หรือเลือกจากอัลบั้ม</p></>}
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleOcrPhoto} />
            </label>
          )}
          <button onClick={() => setStep(3)}
            className="w-full bg-white text-emerald-700 border-2 border-emerald-600 rounded-xl py-4 font-semibold hover:bg-emerald-50 transition-colors">
            ไม่มีบิล กรอกเองแทน →
          </button>
        </div>
      )}

      {/* Step 2B — Manual */}
      {step === 2 && method === 'manual' && (
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-emerald-600" />
            <p className="font-bold text-base text-gray-800">กรอกข้อมูลสมาชิก</p>
          </div>
          {[
            { field: 'name', label: 'ชื่อ-นามสกุล *', ph: 'กรอกชื่อ-นามสกุล' },
            { field: 'phone', label: 'เบอร์โทรศัพท์ *', ph: '08x-xxx-xxxx' },
            { field: 'idcard', label: 'เลขบัตรประชาชน', ph: '0-0000-00000-00-0' },
            { field: 'village', label: 'หมู่บ้าน', ph: 'บ้าน...' },
            { field: 'district', label: 'อำเภอ', ph: 'อำเภอ...' },
          ].map(({ field, label, ph }) => (
            <div key={field}>
              <label className="text-sm text-gray-600 font-medium block mb-1.5">{label}</label>
              <input
                value={form[field as keyof typeof form]}
                onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                placeholder={ph}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3.5 text-sm outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          ))}
          <button onClick={() => setStep(3)}
            className="w-full bg-emerald-600 text-white rounded-xl py-4 font-bold hover:bg-emerald-700 transition-colors mt-2">
            ถัดไป →
          </button>
        </div>
      )}

      {/* Step 3 — Confirm */}
      {step === 3 && (
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-emerald-600" />
            <p className="font-bold text-base text-gray-800">ตรวจสอบข้อมูล</p>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-5 border-2 border-amber-300">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-amber-200">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <div className="text-xs text-amber-700 font-medium">ข้อมูลที่จะบันทึก</div>
                <div className="text-lg font-bold text-gray-900">{form.name || 'ไม่ได้ระบุชื่อ'}</div>
              </div>
            </div>
            {[['เบอร์โทร', form.phone || '-'], ['เลขบัตร', form.idcard || '-'], ['อำเภอ', form.district || '-'], ['หมู่บ้าน', form.village || '-']].map(([l, v]) => (
              <div key={l} className="flex justify-between py-2 border-b border-amber-100 last:border-0">
                <span className="text-sm text-gray-500">{l}</span>
                <span className="text-sm font-semibold text-gray-900">{v}</span>
              </div>
            ))}
          </div>
          <div className="bg-blue-50 rounded-xl p-4 flex gap-3 text-sm text-blue-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>ตรวจสอบข้อมูลให้ถูกต้องก่อนกดถัดไป</span>
          </div>
          <button onClick={() => setStep(4)}
            className="w-full bg-emerald-600 text-white rounded-xl py-4 font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2">
            <Check className="w-5 h-5" /> ข้อมูลถูกต้อง — ถ่ายรูปแปลง
          </button>
        </div>
      )}

      {/* Step 4 — Photo + GPS + Submit */}
      {step === 4 && (
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-emerald-600" />
            <p className="font-bold text-base text-gray-800">ถ่ายรูปแปลง + ปักพิกัด</p>
          </div>

          {err && (
            <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-700">บันทึกไม่สำเร็จ</p>
                <p className="text-sm text-red-600 mt-0.5 whitespace-pre-line">{err}</p>
              </div>
            </div>
          )}

          {saving && (
            <div className="fixed inset-0 bg-black/70 flex flex-col items-center justify-center z-50 p-6">
              <div className="bg-white rounded-3xl p-8 flex flex-col items-center gap-4 max-w-xs w-full shadow-2xl">
                <RefreshCw className="w-12 h-12 text-emerald-600 animate-spin" />
                <div className="text-center">
                  <p className="text-gray-800 font-bold text-base">กำลังดำเนินการ...</p>
                  <p className="text-emerald-600 text-sm mt-1 font-medium min-h-[20px]">{uploadStep}</p>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full animate-pulse w-3/4" />
                </div>
              </div>
            </div>
          )}

          <label className={`${plotPreview ? '' : 'h-52'} bg-gradient-to-br from-emerald-900 to-emerald-950 rounded-2xl flex flex-col items-center justify-center gap-3 border-2 border-dashed border-emerald-500 cursor-pointer hover:border-emerald-400 transition-colors overflow-hidden relative`}>
            {plotPreview ? (
              <>
                <img src={plotPreview} alt="แปลง" className="w-full rounded-2xl block" />
                <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-sm text-center py-2.5 flex items-center justify-center gap-2">
                  <Camera className="w-4 h-4" /> เปลี่ยนรูป
                </div>
              </>
            ) : (
              <><ImagePlus className="w-12 h-12 text-emerald-400" /><p className="text-emerald-300 font-medium">ถ่ายรูปแปลงข้าวโพด</p><p className="text-emerald-400 text-sm">ระบบจะดึงพิกัดจากรูปอัตโนมัติ</p></>
            )}
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePlotPhoto} />
          </label>

          {gpsLoading && (
            <div className="flex items-center gap-3 p-4 bg-emerald-950 rounded-xl">
              <RefreshCw className="w-5 h-5 text-emerald-400 animate-spin" />
              <span className="text-emerald-300 text-sm">กำลังดึงพิกัด...</span>
            </div>
          )}

          {coords && !gpsLoading && (
            <div className="bg-white rounded-2xl p-4 border-2 border-emerald-500 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-emerald-700 font-medium">
                    {gpsSource === 'exif' ? '✨ พิกัดจากรูปถ่าย (EXIF)' : '📡 พิกัดจาก GPS มือถือ'}
                  </div>
                  <div className="text-sm font-mono text-gray-900">
                    {coords.lat.toFixed(6)}°N, {coords.lng.toFixed(6)}°E
                  </div>
                </div>
                <button onClick={requestGPS}
                  className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-400 rounded-lg px-3 py-1.5 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" /> รีเฟรช
                </button>
              </div>
              <a href={`https://www.google.com/maps?q=${coords.lat},${coords.lng}`}
                target="_blank" rel="noreferrer"
                className="flex items-center justify-center gap-2 text-emerald-700 text-sm mt-1 font-medium">
                🗺️ เปิดดูใน Google Maps
              </a>
            </div>
          )}

          {!coords && plotFile && !gpsLoading && (
            <button onClick={requestGPS}
              className="w-full bg-amber-400 text-amber-900 rounded-xl py-4 font-bold hover:bg-amber-500 transition-colors flex items-center justify-center gap-2">
              <MapPin className="w-5 h-5" /> ขอพิกัดจาก GPS มือถือ
            </button>
          )}

          <button onClick={handleSubmit} disabled={!plotFile || !coords || saving}
            className={`w-full bg-emerald-600 text-white rounded-xl py-4 font-bold transition-colors flex items-center justify-center gap-2 ${(!plotFile || !coords || saving) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-emerald-700 active:scale-[.98]'}`}>
            {saving
              ? <><RefreshCw className="w-5 h-5 animate-spin" />กำลังส่งคำขอ...</>
              : <><Check className="w-5 h-5" />ยืนยันส่งคำขอลงทะเบียน</>
            }
          </button>
        </div>
      )}
    </div>
  )
}
