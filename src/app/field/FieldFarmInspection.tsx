import React, { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, RefreshCw, Check, Camera, MapPin, AlertCircle, ImagePlus } from 'lucide-react'
import { useAuth } from '../../routes/AuthContext'
import { isSupabaseReady, supabase } from '../../lib/supabase'
import { uploadFarmPhoto } from '../../lib/storage'

const INSPECTION_TYPES = ['ก่อนปลูก','กลางฤดู','ก่อนเก็บเกี่ยว','หลังเก็บเกี่ยว','ตรวจไม่เผา']
const RESULTS = ['ผ่าน','ไม่ผ่าน','รอข้อมูลเพิ่ม']

async function saveInspection(data: Record<string, unknown>): Promise<void> {
  if (!supabase) { console.info('[mock] saveInspection', data); return }
  const { error } = await supabase.from('field_inspections').insert(data)
  if (error) throw new Error(error.message)
}

export default function FieldFarmInspection() {
  const { user }  = useAuth()
  const navigate  = useNavigate()
  const formRef   = useRef<HTMLFormElement>(null)
  const [photo, setPhoto]     = useState<string|null>(null)
  const [photoFile, setPhotoFile] = useState<File|null>(null)
  const [coords, setCoords]   = useState<{lat:number;lng:number}|null>(null)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [step, setStep]       = useState('')
  const [done, setDone]       = useState(false)
  const [err, setErr]         = useState<string|null>(null)

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onload = ev => setPhoto(ev.target!.result as string)
    reader.readAsDataURL(file)
    // try get GPS from device
    if (!coords) navigator.geolocation.getCurrentPosition(
      p => setCoords({lat:p.coords.latitude, lng:p.coords.longitude}),
      () => {}
    )
  }

  const getGPS = () => {
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      p => { setCoords({lat:p.coords.latitude, lng:p.coords.longitude}); setGpsLoading(false) },
      () => { setErr('ไม่สามารถดึง GPS ได้'); setGpsLoading(false) }
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const fd = new FormData(formRef.current!)
    const farmerId   = (fd.get('farmer_id') as string??'').trim()
    const type       = fd.get('inspection_type') as string
    const result     = fd.get('result') as string
    const note       = (fd.get('note') as string??'').trim()

    if (!farmerId) { setErr('กรุณากรอก Profile ID สมาชิก'); return }
    if (!coords)   { setErr('กรุณาถ่ายรูปหรือดึงพิกัด GPS'); return }

    setSaving(true); setErr(null)
    try {
      setStep('กำลังอัปโหลดรูป...')
      let photoUrl: string|null = null
      if (photoFile && isSupabaseReady) {
        try { photoUrl = await uploadFarmPhoto(photoFile, farmerId) }
        catch { /* non-fatal */ }
      }

      setStep('กำลังบันทึกผลการตรวจ...')
      await saveInspection({
        inspector_id:     user?.id,
        farmer_profile_id: farmerId,
        inspection_type:  type,
        result,
        note,
        lat:              coords.lat,
        lng:              coords.lng,
        photo_url:        photoUrl,
        inspected_at:     new Date().toISOString(),
      })
      setDone(true)
    } catch(ex) {
      setErr(ex instanceof Error ? ex.message : 'บันทึกไม่สำเร็จ')
    } finally { setSaving(false); setStep('') }
  }

  if (done) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-4 text-4xl">✅</div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">บันทึกการตรวจสำเร็จ!</h2>
      {coords && (
        <a href={`https://maps.google.com/?q=${coords.lat},${coords.lng}`} target="_blank" rel="noreferrer"
          className="text-blue-600 text-sm mb-4">🗺️ เปิดใน Google Maps</a>
      )}
      <p className="text-gray-500 text-sm mb-6">{isSupabaseReady ? '🟢 บันทึกลง Supabase' : '🟡 Mock mode'}</p>
      <div className="flex gap-3 w-full max-w-xs">
        <button onClick={()=>setDone(false)}
          className="flex-1 border-2 border-gray-200 text-gray-700 py-3 rounded-2xl font-bold hover:bg-gray-50">
          ตรวจแปลงอื่น
        </button>
        <button onClick={()=>navigate(-1)}
          className="flex-1 bg-cyan-600 text-white py-3 rounded-2xl font-bold hover:bg-cyan-700">
          กลับ
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-cyan-600 text-white px-5 py-4 flex items-center gap-3 sticky top-0 z-40">
        <button onClick={()=>navigate(-1)} className="p-1"><ChevronLeft className="w-6 h-6"/></button>
        <div>
          <div className="font-bold text-lg">ตรวจแปลง</div>
          <div className="text-xs text-cyan-100">บันทึกผลการตรวจโดย {user?.name}</div>
        </div>
      </div>

      {saving && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-8 flex flex-col items-center gap-3 w-72 shadow-2xl">
            <RefreshCw className="w-10 h-10 text-cyan-600 animate-spin"/>
            <p className="font-bold text-gray-800">กำลังบันทึก</p>
            <p className="text-cyan-600 text-sm">{step}</p>
          </div>
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit} className="p-5 space-y-4 pb-10">
        {err && (
          <div className="bg-red-50 border-2 border-red-300 rounded-xl p-3 flex gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5"/>
            <p className="text-red-700 text-sm">{err}</p>
          </div>
        )}

        {/* Member ID */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
          <h2 className="font-bold text-gray-800">ข้อมูลแปลง</h2>
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1.5">Profile ID สมาชิก *</label>
            <input name="farmer_id" placeholder="UUID ของสมาชิก"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-cyan-500"/>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1.5">ประเภทการตรวจ</label>
            <select name="inspection_type"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:border-cyan-500">
              {INSPECTION_TYPES.map(t=><option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1.5">ผลการตรวจ</label>
            <div className="flex gap-2">
              {RESULTS.map(r=>(
                <label key={r} className="flex-1">
                  <input type="radio" name="result" value={r} defaultChecked={r==='ผ่าน'} className="hidden peer"/>
                  <div className={`text-center py-2.5 rounded-xl border-2 text-xs font-bold cursor-pointer transition-all
                    peer-checked:border-cyan-500 peer-checked:bg-cyan-50 peer-checked:text-cyan-700
                    border-gray-200 text-gray-500 hover:border-gray-300`}>{r}</div>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1.5">บันทึก / หมายเหตุ</label>
            <textarea name="note" rows={3} placeholder="รายละเอียดการตรวจ สภาพแปลง..."
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500 resize-none"/>
          </div>
        </div>

        {/* Photo + GPS */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
          <h2 className="font-bold text-gray-800">รูปถ่ายและพิกัด</h2>
          <label className={`${photo?'':'h-40'} bg-gray-900 rounded-2xl flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-600 cursor-pointer hover:border-cyan-500 transition-colors overflow-hidden relative`}>
            {photo
              ? <><img src={photo} className="w-full rounded-2xl block"/>
                  <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-sm text-center py-2 flex items-center justify-center gap-2">
                    <Camera className="w-4 h-4"/>เปลี่ยนรูป
                  </div></>
              : <><ImagePlus className="w-8 h-8 text-gray-500"/><p className="text-gray-400 text-sm">ถ่ายรูปแปลง</p></>}
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto}/>
          </label>

          {coords ? (
            <div className="bg-cyan-50 border-2 border-cyan-300 rounded-xl p-3">
              <div className="text-xs text-cyan-600 font-semibold">📍 พิกัด GPS</div>
              <div className="font-mono text-sm text-gray-800 mt-0.5">{coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}</div>
              <a href={`https://maps.google.com/?q=${coords.lat},${coords.lng}`} target="_blank" rel="noreferrer"
                className="text-xs text-blue-600 mt-1 block">🗺️ ดูใน Google Maps</a>
            </div>
          ) : (
            <button type="button" onClick={getGPS} disabled={gpsLoading}
              className="w-full bg-amber-400 text-amber-900 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-amber-500 transition-colors">
              {gpsLoading?<RefreshCw className="w-4 h-4 animate-spin"/>:<MapPin className="w-4 h-4"/>}
              {gpsLoading?'กำลังดึงพิกัด...':'ดึงพิกัด GPS'}
            </button>
          )}
        </div>

        <button type="submit" disabled={saving}
          className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 shadow-lg transition-all
            ${saving?'bg-gray-200 text-gray-400 cursor-wait':'bg-cyan-600 text-white hover:bg-cyan-700 active:scale-[.98]'}`}>
          {saving?<><RefreshCw className="w-5 h-5 animate-spin"/>บันทึก...</>:<><Check className="w-5 h-5"/>บันทึกผลการตรวจ</>}
        </button>
      </form>
    </div>
  )
}
