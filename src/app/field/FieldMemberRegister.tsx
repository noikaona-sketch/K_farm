import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle, CreditCard, MapPin, RefreshCw, UserPlus } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../routes/AuthContext'

const genFarmerCode = () => `KF${Date.now().toString().slice(-6)}`

export default function FieldMemberRegister() {
  const nav = useNavigate()
  const { user } = useAuth()
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [idCard, setIdCard] = useState('')
  const [address, setAddress] = useState('')
  const [province, setProvince] = useState('')
  const [district, setDistrict] = useState('')
  const [subdistrict, setSubdistrict] = useState('')
  const [village, setVillage] = useState('')
  const [farmName, setFarmName] = useState('')
  const [areaRai, setAreaRai] = useState('')
  const [gpsLat, setGpsLat] = useState('')
  const [gpsLng, setGpsLng] = useState('')
  const [bankName, setBankName] = useState('')
  const [bankAccountNo, setBankAccountNo] = useState('')
  const [bankAccountName, setBankAccountName] = useState('')
  const [idImage, setIdImage] = useState<{ file: File; preview: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [ok, setOk] = useState('')
  const [error, setError] = useState('')

  const getGps = () => {
    setError('')
    if (!navigator.geolocation) { setError('เครื่องนี้ไม่รองรับ GPS'); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLat(String(pos.coords.latitude))
        setGpsLng(String(pos.coords.longitude))
      },
      () => setError('ไม่สามารถอ่านพิกัดได้')
    )
  }

  const runOcrMock = () => {
    if (!idImage) { setError('กรุณาถ่ายรูปบัตรก่อน'); return }
    setOk('อ่านข้อมูล OCR ตัวอย่างแล้ว กรุณาตรวจสอบก่อนบันทึก')
  }

  const save = async () => {
    setSaving(true); setError(''); setOk('')
    try {
      if (!supabase) throw new Error('ยังไม่เชื่อมฐานข้อมูล')
      if (!fullName || !phone) throw new Error('กรุณากรอกชื่อและเบอร์โทร')

      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .insert({
          full_name: fullName,
          phone,
          id_card: idCard || null,
          address: address || null,
          province: province || null,
          district: district || null,
          subdistrict: subdistrict || null,
          bank_name: bankName || null,
          bank_account_no: bankAccountNo || null,
          bank_account_name: bankAccountName || null,
          role: 'member',
          registration_source: 'field',
          created_by: user?.id ?? null,
          created_by_name: user?.name ?? 'ทีมภาคสนาม',
          id_card_ocr_json: {},
        })
        .select('id')
        .single()
      if (profileErr) throw new Error(profileErr.message)

      const { error: farmerErr } = await supabase
        .from('farmers')
        .insert({
          profile_id: profile.id,
          code: genFarmerCode(),
          province: province || null,
          district: district || null,
          subdistrict: subdistrict || null,
          village: village || null,
          farm_name: farmName || null,
          area_rai: Number(areaRai || 0),
          gps_lat: gpsLat ? Number(gpsLat) : null,
          gps_lng: gpsLng ? Number(gpsLng) : null,
          status: 'pending',
        })
      if (farmerErr) throw new Error(farmerErr.message)

      setOk('สมัครสมาชิกสำเร็จ รออนุมัติ')
      setFullName(''); setPhone(''); setIdCard(''); setAddress('')
      setProvince(''); setDistrict(''); setSubdistrict(''); setVillage('')
      setFarmName(''); setAreaRai(''); setGpsLat(''); setGpsLng('')
      setBankName(''); setBankAccountNo(''); setBankAccountName(''); setIdImage(null)
    } catch (e) { setError(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ') } finally { setSaving(false) }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => nav('/field')} className="bg-white border rounded-xl p-2"><ArrowLeft className="w-5 h-5" /></button>
      </div>

      <div className="bg-emerald-600 text-white rounded-3xl p-5 shadow-lg">
        <div className="flex items-center gap-3"><UserPlus className="w-8 h-8" /><div><h1 className="text-xl font-bold">สมัครสมาชิกภาคสนาม</h1><p className="text-sm text-emerald-100">บันทึกโดยทีมภาคสนาม</p></div></div>
      </div>

      {ok && <div className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 text-sm">{ok}</div>}
      {error && <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 p-3 text-sm">{error}</div>}

      <section className="bg-white rounded-2xl border p-4 space-y-3">
        <div className="font-bold flex items-center gap-2"><CreditCard className="w-5 h-5" />ข้อมูลบัตร / สมาชิก</div>
        <label className="w-full border rounded-xl py-3 font-bold flex items-center justify-center gap-2 cursor-pointer">
          📷 ถ่ายรูปบัตรประชาชน
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (!file) return; setIdImage({ file, preview: URL.createObjectURL(file) }) }} />
        </label>
        {idImage && <img src={idImage.preview} className="w-full max-h-56 object-cover rounded-xl border" />}
        <button type="button" onClick={runOcrMock} className="w-full border rounded-xl py-3 font-bold">อ่านข้อมูลจากบัตร (OCR)</button>
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="ชื่อ-นามสกุล" className="w-full border rounded-xl p-3" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="เบอร์โทร" className="w-full border rounded-xl p-3" />
        <input value={idCard} onChange={(e) => setIdCard(e.target.value)} placeholder="เลขบัตรประชาชน" className="w-full border rounded-xl p-3" />
        <textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="ที่อยู่ตามบัตร" className="w-full border rounded-xl p-3" />
      </section>

      <section className="bg-white rounded-2xl border p-4 space-y-3">
        <div className="font-bold flex items-center gap-2"><MapPin className="w-5 h-5" />ข้อมูลฟาร์ม</div>
        <input value={farmName} onChange={(e) => setFarmName(e.target.value)} placeholder="ชื่อแปลง" className="w-full border rounded-xl p-3" />
        <input value={areaRai} onChange={(e) => setAreaRai(e.target.value)} type="number" placeholder="พื้นที่ (ไร่)" className="w-full border rounded-xl p-3" />
        <input value={province} onChange={(e) => setProvince(e.target.value)} placeholder="จังหวัด" className="w-full border rounded-xl p-3" />
        <input value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="อำเภอ" className="w-full border rounded-xl p-3" />
        <input value={subdistrict} onChange={(e) => setSubdistrict(e.target.value)} placeholder="ตำบล" className="w-full border rounded-xl p-3" />
        <input value={village} onChange={(e) => setVillage(e.target.value)} placeholder="หมู่บ้าน" className="w-full border rounded-xl p-3" />
        <button type="button" onClick={getGps} className="w-full border rounded-xl py-3 font-bold flex items-center justify-center gap-2"><MapPin className="w-5 h-5" />ใช้พิกัดปัจจุบัน</button>
        {gpsLat && gpsLng && <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 text-sm text-blue-700">GPS: {gpsLat}, {gpsLng}</div>}
      </section>

      <section className="bg-white rounded-2xl border p-4 space-y-3">
        <div className="font-bold">ข้อมูลบัญชีธนาคาร</div>
        <input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="ธนาคาร" className="w-full border rounded-xl p-3" />
        <input value={bankAccountNo} onChange={(e) => setBankAccountNo(e.target.value)} placeholder="เลขบัญชี" className="w-full border rounded-xl p-3" />
        <input value={bankAccountName} onChange={(e) => setBankAccountName(e.target.value)} placeholder="ชื่อบัญชี" className="w-full border rounded-xl p-3" />
      </section>

      <button disabled={saving} onClick={save} className="w-full rounded-xl bg-emerald-600 disabled:bg-gray-300 text-white py-3 font-bold flex justify-center gap-2"><CheckCircle className="w-5 h-5" />{saving ? <><RefreshCw className="w-5 h-5 animate-spin" />กำลังบันทึก...</> : 'บันทึกสมัครสมาชิก'}</button>
    </div>
  )
}
