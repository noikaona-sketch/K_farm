import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Camera, FileText, User, Check, AlertCircle, MapPin, RefreshCw, ImagePlus } from 'lucide-react'

// Read GPS from EXIF
function readExifCoords(file: File): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const view = new DataView(e.target!.result as ArrayBuffer)
        if (view.getUint16(0, false) !== 0xFFD8) return resolve(null)
        let offset = 2
        while (offset < view.byteLength) {
          const marker = view.getUint16(offset, false)
          offset += 2
          if (marker === 0xFFE1) {
            const exifStr = String.fromCharCode(...new Uint8Array(e.target!.result as ArrayBuffer, offset + 2, 4))
            if (exifStr !== 'Exif') return resolve(null)
            const tiffStart = offset + 8
            const le = view.getUint16(tiffStart, false) === 0x4949
            const ifd0 = tiffStart + view.getUint32(tiffStart + 4, le)
            const entries = view.getUint16(ifd0, le)
            let gpsOffset = null
            for (let i = 0; i < entries; i++) {
              if (view.getUint16(ifd0 + 2 + i * 12, le) === 0x8825)
                gpsOffset = view.getUint32(ifd0 + 2 + i * 12 + 8, le)
            }
            if (gpsOffset == null) return resolve(null)
            const gpsIfd = tiffStart + gpsOffset
            const ge = view.getUint16(gpsIfd, le)
            let latRef: string|undefined, latVal: number|undefined, lngRef: string|undefined, lngVal: number|undefined
            for (let i = 0; i < ge; i++) {
              const base = gpsIfd + 2 + i * 12
              const tag = view.getUint16(base, le)
              const vo = view.getUint32(base + 8, le)
              const rat = (off: number) => { const n=view.getUint32(tiffStart+off,le),d=view.getUint32(tiffStart+off+4,le); return d?n/d:0 }
              if (tag===0x0001) latRef=String.fromCharCode(view.getUint8(base+8))
              if (tag===0x0002) latVal=rat(vo)+rat(vo+8)/60+rat(vo+16)/3600
              if (tag===0x0003) lngRef=String.fromCharCode(view.getUint8(base+8))
              if (tag===0x0004) lngVal=rat(vo)+rat(vo+8)/60+rat(vo+16)/3600
            }
            if (latVal!=null && lngVal!=null)
              return resolve({ lat: latRef==='S'?-latVal:latVal, lng: lngRef==='W'?-lngVal:lngVal })
            return resolve(null)
          }
          offset += view.getUint16(offset, false)
        }
        resolve(null)
      } catch { resolve(null) }
    }
    reader.readAsArrayBuffer(file)
  })
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [method, setMethod] = useState<'ocr'|'manual'|null>(null)
  const [form, setForm] = useState({ name:'', phone:'', idcard:'' })
  const [plotFile, setPlotFile] = useState<File|null>(null)
  const [plotPreview, setPlotPreview] = useState<string|null>(null)
  const [coords, setCoords] = useState<{lat:number;lng:number}|null>(null)
  const [gpsSource, setGpsSource] = useState<string|null>(null)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrPreview, setOcrPreview] = useState<string|null>(null)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState<string|null>(null)

  const requestGPS = () => {
    setGpsLoading(true); setErr(null)
    navigator.geolocation.getCurrentPosition(
      pos => { setCoords({ lat:pos.coords.latitude, lng:pos.coords.longitude }); setGpsSource('device'); setGpsLoading(false) },
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
    if (exif) { setCoords(exif); setGpsSource('exif') }
    else requestGPS()
  }

  const handleOcrPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setOcrLoading(true); setErr(null)
    const reader = new FileReader()
    reader.onload = ev => setOcrPreview(ev.target!.result as string)
    reader.readAsDataURL(file)
    setTimeout(() => { setOcrLoading(false); setStep(3) }, 1500)
  }

  if (done) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-5 text-center">
      <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-5">
        <Check className="w-12 h-12 text-emerald-600" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-3">ส่งคำขอสำเร็จ!</h2>
      <p className="text-gray-600 text-base leading-relaxed mb-6">ข้อมูลของคุณถูกบันทึกแล้ว<br/>รอ Leader ในกลุ่มอนุมัติภายใน 1-2 วัน<br/>ระบบจะแจ้งเตือนผ่าน LINE ค่ะ</p>
      <div className="bg-emerald-50 rounded-2xl p-5 mb-6 text-left w-full max-w-sm">
        <div className="text-sm text-emerald-800 font-semibold mb-3">ขั้นตอนถัดไป</div>
        {['Leader ตรวจสอบข้อมูล','Admin อนุมัติ','รับสิทธิ์สมาชิกเต็มรูปแบบ'].map((t,i) => (
          <div key={i} className="flex items-center gap-3 text-gray-700 py-2">
            <Check className="w-4 h-4 text-emerald-600" /><span className="text-sm">{t}</span>
          </div>
        ))}
      </div>
      <button onClick={() => navigate('/farmer')} className="w-full max-w-sm bg-emerald-600 text-white rounded-xl py-4 font-bold hover:bg-emerald-700 transition-colors">
        กลับหน้าหลัก
      </button>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-emerald-600 text-white px-5 py-4 flex items-center gap-3 sticky top-0 z-40">
        <button onClick={() => step > 1 ? setStep(s => s-1) : navigate(-1)} className="p-1">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex-1">
          <div className="font-bold text-lg">ลงทะเบียนสมาชิก</div>
          <div className="text-xs opacity-80">ขั้นตอนที่ {step} จาก 4</div>
        </div>
        <div className="flex gap-1">
          {[1,2,3,4].map(s => <div key={s} className={`h-1.5 rounded-full transition-all ${s<=step?'bg-white w-6':'bg-white/30 w-3'}`}/>)}
        </div>
      </div>

      {/* Step 1 — เลือกวิธี */}
      {step === 1 && (
        <div className="p-5">
          <p className="font-bold text-base text-gray-800 mb-4">เลือกวิธีสมัคร</p>
          <div onClick={() => { setMethod('ocr'); setStep(2) }}
            className="bg-white rounded-2xl p-5 mb-4 flex items-center gap-4 cursor-pointer shadow-sm hover:shadow-md transition-shadow active:scale-[.98]">
            <div className="w-14 h-14 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <FileText className="w-7 h-7 text-emerald-600" />
            </div>
            <div className="flex-1">
              <div className="font-bold text-base text-gray-900">มีบิลจากโรงงาน</div>
              <div className="text-sm text-gray-500 mt-0.5">อนุมัติอัตโนมัติ ⚡</div>
            </div>
            <span className="text-gray-400 text-xl">›</span>
          </div>
          <div onClick={() => { setMethod('manual'); setStep(2) }}
            className="bg-white rounded-2xl p-5 flex items-center gap-4 cursor-pointer shadow-sm hover:shadow-md transition-shadow active:scale-[.98]">
            <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <User className="w-7 h-7 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="font-bold text-base text-gray-900">สมาชิกใหม่</div>
              <div className="text-sm text-gray-500 mt-0.5">รอ Admin อนุมัติ ⏳</div>
            </div>
            <span className="text-gray-400 text-xl">›</span>
          </div>
        </div>
      )}

      {/* Step 2A — OCR */}
      {step === 2 && method === 'ocr' && (
        <div className="p-5">
          <div className="flex items-center gap-2 mb-4"><Camera className="w-5 h-5 text-emerald-600"/><p className="font-bold text-base text-gray-800">ถ่ายรูปบิลสีชมพู</p></div>
          <div className="bg-blue-50 rounded-xl p-4 flex gap-3 text-sm text-blue-700 mb-4">
            <AlertCircle className="w-5 h-5 flex-shrink-0"/>
            <span>วางบิลบนพื้นเรียบ ถ่ายตรง ให้เห็นรหัสและยอดชัดเจน</span>
          </div>
          {ocrLoading ? (
            <div className="bg-emerald-950 rounded-2xl h-52 flex flex-col items-center justify-center mb-4">
              <RefreshCw className="w-12 h-12 text-emerald-400 animate-spin mb-3"/>
              <p className="text-emerald-300 text-sm">กำลังอ่านบิล...</p>
            </div>
          ) : (
            <label className="bg-gradient-to-br from-emerald-900 to-emerald-950 rounded-2xl h-52 flex flex-col items-center justify-center gap-3 border-2 border-dashed border-emerald-500 mb-4 cursor-pointer hover:border-emerald-400 transition-colors">
              {ocrPreview ? <img src={ocrPreview} className="w-full h-full object-cover rounded-2xl"/> : <>
                <Camera className="w-12 h-12 text-emerald-400"/>
                <div className="text-emerald-300 text-base font-medium">กดเพื่อถ่ายรูปบิล</div>
                <div className="text-emerald-400 text-sm">หรือเลือกจากอัลบั้ม</div>
              </>}
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleOcrPhoto}/>
            </label>
          )}
          <button onClick={() => setStep(3)} className="w-full bg-white text-emerald-700 border-2 border-emerald-600 rounded-xl py-4 text-base font-semibold hover:bg-emerald-50 transition-colors">
            ไม่มีบิล กรอกเองแทน →
          </button>
        </div>
      )}

      {/* Step 2B — Manual */}
      {step === 2 && method === 'manual' && (
        <div className="p-5">
          <div className="flex items-center gap-2 mb-4"><User className="w-5 h-5 text-emerald-600"/><p className="font-bold text-base text-gray-800">กรอกข้อมูล</p></div>
          {[{field:'name',label:'ชื่อ-นามสกุล',ph:'กรอกชื่อ-นามสกุล'},{field:'phone',label:'เบอร์โทร',ph:'08x-xxx-xxxx'},{field:'idcard',label:'เลขบัตร ปชช.',ph:'0-0000-00000-00-0'}].map(({field,label,ph}) => (
            <div key={field} className="mb-4">
              <label className="text-sm text-gray-600 block mb-2 font-medium">{label}</label>
              <input value={form[field as keyof typeof form]} onChange={e => setForm({...form,[field]:e.target.value})}
                placeholder={ph} className="w-full border-2 border-gray-200 rounded-xl px-4 py-3.5 text-sm outline-none focus:border-emerald-500 transition-colors"/>
            </div>
          ))}
          <button onClick={() => setStep(3)} className="w-full bg-emerald-600 text-white rounded-xl py-4 text-base font-bold hover:bg-emerald-700 transition-colors mt-2">ถัดไป →</button>
        </div>
      )}

      {/* Step 3 — ยืนยัน */}
      {step === 3 && (
        <div className="p-5">
          <div className="flex items-center gap-2 mb-4"><Check className="w-5 h-5 text-emerald-600"/><p className="font-bold text-base text-gray-800">ตรวจสอบข้อมูล</p></div>
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-5 mb-4 border-2 border-amber-300 shadow-sm">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-amber-200">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-amber-600"/>
              </div>
              <div><div className="text-xs text-amber-700 font-medium">ข้อมูลที่จะส่ง</div><div className="text-lg font-bold text-gray-900">{form.name || 'สมชาย ใจดี'}</div></div>
            </div>
            {[['เบอร์โทร', form.phone||'0812345678'],['เลขบัตร', form.idcard||'1-xxxx-xxxxx-xx-x']].map(([l,v]) => (
              <div key={l} className="flex justify-between py-2 border-b border-amber-100">
                <span className="text-sm text-gray-600">{l}</span><span className="text-sm font-semibold text-gray-900">{v}</span>
              </div>
            ))}
          </div>
          <div className="bg-blue-50 rounded-xl p-4 flex gap-3 text-sm text-blue-700 mb-4">
            <AlertCircle className="w-5 h-5 flex-shrink-0"/><span>ตรวจสอบข้อมูลให้ถูกต้องก่อนกดถัดไปนะคะ</span>
          </div>
          <button onClick={() => setStep(4)} className="w-full bg-emerald-600 text-white rounded-xl py-4 text-base font-bold hover:bg-emerald-700 transition-colors mb-3">
            <Check className="w-5 h-5 inline mr-2"/>ข้อมูลถูกต้อง — ถ่ายรูปแปลง
          </button>
        </div>
      )}

      {/* Step 4 — ถ่ายรูปแปลง + GPS */}
      {step === 4 && (
        <div className="p-5">
          <div className="flex items-center gap-2 mb-4"><Camera className="w-5 h-5 text-emerald-600"/><p className="font-bold text-base text-gray-800">ถ่ายรูปแปลง + ปักพิกัด</p></div>
          {err && <div className="bg-red-50 rounded-xl p-4 text-red-700 text-sm mb-4 flex items-center gap-2"><AlertCircle className="w-5 h-5"/>{err}</div>}

          <label className={`${plotPreview?'h-auto p-0':'h-52 p-4'} bg-gradient-to-br from-emerald-900 to-emerald-950 rounded-2xl flex flex-col items-center justify-center gap-3 border-2 border-dashed border-emerald-500 mb-4 cursor-pointer overflow-hidden relative hover:border-emerald-400 transition-colors`}>
            {plotPreview ? <>
              <img src={plotPreview} alt="แปลง" className="w-full rounded-2xl block"/>
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-sm text-center py-2.5 rounded-b-2xl flex items-center justify-center gap-2">
                <Camera className="w-4 h-4"/>เปลี่ยนรูป
              </div>
            </> : <>
              <ImagePlus className="w-12 h-12 text-emerald-400"/>
              <div className="text-emerald-300 text-base font-medium">ถ่ายรูปแปลงข้าวโพด</div>
              <div className="text-emerald-400 text-sm">ระบบจะดึงพิกัดจากรูปอัตโนมัติ</div>
            </>}
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePlotPhoto}/>
          </label>

          {gpsLoading && (
            <div className="flex items-center gap-3 p-4 bg-emerald-950 rounded-xl mb-3">
              <RefreshCw className="w-5 h-5 text-emerald-400 animate-spin"/><span className="text-emerald-300 text-sm">กำลังดึงพิกัด...</span>
            </div>
          )}

          {coords && !gpsLoading && (
            <div className="bg-white rounded-2xl p-4 mb-4 border-2 border-emerald-500 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-emerald-600"/>
                </div>
                <div className="flex-1">
                  <div className="text-xs text-emerald-700 font-medium">{gpsSource==='exif'?'✨ พิกัดจากรูปถ่าย':'📡 พิกัดจาก GPS มือถือ'}</div>
                  <div className="text-sm font-mono text-gray-900 font-semibold">{coords.lat.toFixed(6)}°N, {coords.lng.toFixed(6)}°E</div>
                </div>
                <button onClick={requestGPS} className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-500 rounded-lg px-3 py-2 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3"/>รีเฟรช
                </button>
              </div>
              <a href={`https://www.google.com/maps?q=${coords.lat},${coords.lng}`} target="_blank" rel="noreferrer"
                className="flex items-center justify-center gap-2 text-emerald-700 text-sm mt-3 font-medium">
                🗺️ เปิดดูใน Google Maps
              </a>
            </div>
          )}

          {!coords && plotFile && !gpsLoading && (
            <button onClick={requestGPS} className="w-full bg-amber-400 text-amber-900 rounded-xl py-4 text-base font-bold mb-3 hover:bg-amber-500 transition-colors flex items-center justify-center gap-2">
              <MapPin className="w-5 h-5"/>ขอพิกัดจาก GPS มือถือ
            </button>
          )}

          <button onClick={() => setDone(true)} disabled={!plotFile || !coords}
            className={`w-full bg-emerald-600 text-white rounded-xl py-4 text-base font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 ${(!plotFile||!coords)?'opacity-50':''}`}>
            <Check className="w-5 h-5"/>ยืนยันส่งคำขอลงทะเบียน
          </button>
        </div>
      )}
    </div>
  )
}