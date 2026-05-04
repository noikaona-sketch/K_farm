import React, { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, RefreshCw, Check, Camera, MapPin, AlertCircle, ImagePlus, Flame } from 'lucide-react'
import { useAuth } from '../../routes/AuthContext'
import { isSupabaseReady, supabase } from '../../lib/supabase'
import { uploadFarmPhoto } from '../../lib/storage'

const ACTIVITY_TYPES = ['กิจกรรมไม่เผาตอซัง','ตรวจก่อนเก็บเกี่ยว','ตรวจหลังเก็บเกี่ยว','รับรองผ่านกิจกรรม']

async function saveNoBurn(data: Record<string, unknown>): Promise<void> {
  if (!supabase) { console.info('[mock] saveNoBurn', data); return }
  const { error } = await supabase.from('no_burn_applications').insert(data)
  if (error) throw new Error(error.message)
}

export default function FieldNoBurnCheck() {
  const { user }  = useAuth()
  const navigate  = useNavigate()
  const formRef   = useRef<HTMLFormElement>(null)
  const [photo, setPhoto]       = useState<string|null>(null)
  const [photoFile, setPhotoFile] = useState<File|null>(null)
  const [coords, setCoords]     = useState<{lat:number;lng:number}|null>(null)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [passed, setPassed]     = useState<boolean|null>(null)  // ผ่าน/ไม่ผ่าน
  const [saving, setSaving]     = useState(false)
  const [done, setDone]         = useState(false)
  const [err, setErr]           = useState<string|null>(null)

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onload = ev => setPhoto(ev.target!.result as string)
    reader.readAsDataURL(file)
    if (!coords) navigator.geolocation.getCurrentPosition(
      p => setCoords({lat:p.coords.latitude, lng:p.coords.longitude}),
      () => {}
    )
  }

  const getGPS = () => {
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      p => { setCoords({lat:p.coords.latitude, lng:p.coords.longitude}); setGpsLoading(false) },
      () => { setErr('ดึง GPS ไม่ได้'); setGpsLoading(false) }
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passed === null) { setErr('กรุณาระบุว่าผ่านหรือไม่ผ่าน'); return }
    if (!coords) { setErr('กรุณาถ่ายรูปหรือดึง GPS ก่อนบันทึก'); return }
    const fd = new FormData(formRef.current!)
    const farmerId = (fd.get('farmer_id') as string??'').trim()
    if (!farmerId) { setErr('กรุณากรอก Profile ID สมาชิก'); return }

    setSaving(true); setErr(null)
    try {
      let photoUrl: string|null = null
      if (photoFile && isSupabaseReady) {
        try { photoUrl = await uploadFarmPhoto(photoFile, farmerId) }
        catch { /* non-fatal */ }
      }
      await saveNoBurn({
        farmer_id:       farmerId,
        inspector_id:    user?.id,
        activity_type:   fd.get('activity_type'),
        commitment:      fd.get('commitment'),
        status:          passed ? 'approved' : 'rejected',
        review_note:     fd.get('note') || null,
        lat:             coords.lat,
        lng:             coords.lng,
        photo_url:       photoUrl,
        bonus_per_ton:   passed ? 100 : 0,
        created_at:      new Date().toISOString(),
      })
      setDone(true)
    } catch(ex) {
      setErr(ex instanceof Error ? ex.message : 'บันทึกไม่สำเร็จ')
    } finally { setSaving(false) }
  }

  if (done) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
      <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 text-4xl
        ${passed?'bg-emerald-100':'bg-red-100'}`}>
        {passed?'✅':'❌'}
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        {passed?'รับรองไม่เผาสำเร็จ!':'บันทึกไม่ผ่านสำเร็จ'}
      </h2>
      {passed && <p className="text-emerald-600 text-sm mb-2">สมาชิกจะได้รับโบนัส +100 บาท/ตัน</p>}
      <p className="text-gray-500 text-sm mb-6">{isSupabaseReady?'🟢 บันทึกลง Supabase':'🟡 Mock mode'}</p>
      <div className="flex gap-3 w-full max-w-xs">
        <button onClick={()=>{setDone(false);setPassed(null);setPhoto(null);setCoords(null)}}
          className="flex-1 border-2 border-gray-200 text-gray-700 py-3 rounded-2xl font-bold hover:bg-gray-50">ตรวจรายถัดไป</button>
        <button onClick={()=>navigate(-1)}
          className="flex-1 bg-cyan-600 text-white py-3 rounded-2xl font-bold hover:bg-cyan-700">กลับ</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-cyan-600 text-white px-5 py-4 flex items-center gap-3 sticky top-0 z-40">
        <button onClick={()=>navigate(-1)} className="p-1"><ChevronLeft className="w-6 h-6"/></button>
        <div>
          <div className="font-bold text-lg">กิจกรรมไม่เผา</div>
          <div className="text-xs text-cyan-100">ตรวจสอบและรับรองโดย {user?.name}</div>
        </div>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="p-5 space-y-4 pb-10">
        {err && (
          <div className="bg-red-50 border-2 border-red-300 rounded-xl p-3 flex gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0"/>
            <p className="text-red-700 text-sm">{err}</p>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
          <h2 className="font-bold text-gray-800">ข้อมูลการตรวจ</h2>
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1.5">Profile ID สมาชิก *</label>
            <input name="farmer_id" placeholder="UUID ของสมาชิก"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-cyan-500"/>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1.5">ประเภทกิจกรรม</label>
            <select name="activity_type"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:border-cyan-500">
              {ACTIVITY_TYPES.map(t=><option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1.5">คำมั่นสัญญา / หมายเหตุ</label>
            <input name="commitment" defaultValue="ไม่เผาตอซัง" placeholder="รายละเอียด"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500"/>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1.5">บันทึกเพิ่มเติม</label>
            <textarea name="note" rows={2} placeholder="สภาพแปลง รายละเอียดการตรวจ..."
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500 resize-none"/>
          </div>
        </div>

        {/* ผลการตรวจ — ใหญ่ชัดเจน */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-bold text-gray-800 mb-3">ผลการตรวจ *</h2>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={()=>setPassed(true)}
              className={`py-6 rounded-2xl font-bold text-lg flex flex-col items-center gap-2 border-3 transition-all
                ${passed===true?'bg-emerald-600 text-white border-emerald-600 shadow-md':'bg-white border-2 border-gray-200 text-gray-500 hover:border-emerald-300'}`}>
              <Check className="w-8 h-8"/>
              <span>ผ่าน</span>
              {passed===true && <span className="text-xs opacity-80">+100 บาท/ตัน</span>}
            </button>
            <button type="button" onClick={()=>setPassed(false)}
              className={`py-6 rounded-2xl font-bold text-lg flex flex-col items-center gap-2 border-3 transition-all
                ${passed===false?'bg-red-500 text-white border-red-500 shadow-md':'bg-white border-2 border-gray-200 text-gray-500 hover:border-red-300'}`}>
              <Flame className="w-8 h-8"/>
              <span>ไม่ผ่าน</span>
            </button>
          </div>
        </div>

        {/* รูปถ่าย + GPS */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
          <h2 className="font-bold text-gray-800">รูปถ่ายหลักฐาน</h2>
          <label className={`${photo?'':'h-40'} bg-gray-900 rounded-2xl flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-600 cursor-pointer hover:border-cyan-500 transition-colors overflow-hidden relative`}>
            {photo
              ? <><img src={photo} className="w-full rounded-2xl block"/>
                  <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-sm text-center py-2 flex items-center justify-center gap-1">
                    <Camera className="w-4 h-4"/>เปลี่ยนรูป
                  </div></>
              : <><ImagePlus className="w-8 h-8 text-gray-500"/><p className="text-gray-400 text-sm">ถ่ายรูปแปลง / หลักฐาน</p></>}
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto}/>
          </label>

          {coords ? (
            <div className="bg-cyan-50 border-2 border-cyan-300 rounded-xl p-3">
              <div className="text-xs text-cyan-600 font-semibold">📍 พิกัด GPS</div>
              <div className="font-mono text-sm mt-0.5">{coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}</div>
            </div>
          ) : (
            <button type="button" onClick={getGPS} disabled={gpsLoading}
              className="w-full bg-amber-400 text-amber-900 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-amber-500 transition-colors">
              {gpsLoading?<RefreshCw className="w-4 h-4 animate-spin"/>:<MapPin className="w-4 h-4"/>}
              {gpsLoading?'กำลังดึงพิกัด...':'ดึงพิกัด GPS'}
            </button>
          )}
        </div>

        <button type="submit" disabled={saving||passed===null}
          className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 shadow-lg transition-all
            ${passed===null?'bg-gray-200 text-gray-400 cursor-not-allowed'
            :saving?'bg-gray-200 text-gray-400 cursor-wait'
            :passed?'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[.98]'
            :'bg-red-500 text-white hover:bg-red-600 active:scale-[.98]'}`}>
          {saving?<><RefreshCw className="w-5 h-5 animate-spin"/>กำลังบันทึก...</>
          :passed===null?'เลือกผลการตรวจก่อน'
          :<><Check className="w-5 h-5"/>บันทึก{passed?'ผ่าน':'ไม่ผ่าน'}</>}
        </button>
      </form>
    </div>
  )
}
