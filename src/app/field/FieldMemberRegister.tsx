import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle, CreditCard, MapPin, RefreshCw, Truck, UserPlus } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../routes/AuthContext'
import { preprocessImageForOcr } from '../../lib/imagePreprocess'
import { runIdentityOcr, type IdentityOcrResult } from '../../lib/identityOcr'

const genFarmerCode = () => `KF${Date.now().toString().slice(-6)}`
type RegisterType = 'member' | 'vehicle'

export default function FieldMemberRegister() {
  const nav = useNavigate()
  const { user } = useAuth()
  const [registerType, setRegisterType] = useState<RegisterType>('member')
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
  const [vehiclePlate, setVehiclePlate] = useState('')
  const [vehicleType, setVehicleType] = useState('6 ล้อ')
  const [driverName, setDriverName] = useState('')
  const [driverPhone, setDriverPhone] = useState('')
  const [idImage, setIdImage] = useState<{ file: File; preview: string } | null>(null)
  const [identityOcr, setIdentityOcr] = useState<IdentityOcrResult | null>(null)
  const [saving, setSaving] = useState(false)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ok, setOk] = useState('')
  const [error, setError] = useState('')

  const resetForm = () => {
    setFullName(''); setPhone(''); setIdCard(''); setAddress('')
    setProvince(''); setDistrict(''); setSubdistrict(''); setVillage('')
    setFarmName(''); setAreaRai(''); setGpsLat(''); setGpsLng('')
    setBankName(''); setBankAccountNo(''); setBankAccountName('')
    setVehiclePlate(''); setVehicleType('6 ล้อ'); setDriverName(''); setDriverPhone('')
    setIdImage(null); setIdentityOcr(null)
  }

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

  const applyOcrToForm = (ocr: IdentityOcrResult) => {
    if (ocr.full_name) {
      setFullName(ocr.full_name)
      setBankAccountName(ocr.full_name)
    }
    if (ocr.id_card) setIdCard(ocr.id_card)
    if (ocr.address) setAddress(ocr.address)
    if (ocr.province) setProvince(ocr.province)
    if (ocr.district) setDistrict(ocr.district)
    if (ocr.subdistrict) setSubdistrict(ocr.subdistrict)
  }

  const handleIdImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setOk('')
    setIdentityOcr(null)
    try {
      const processed = await preprocessImageForOcr(file, {
        maxSide: 1200,
        quality: 0.8,
        centerCrop: true,
      })
      setIdImage({ file: processed.file, preview: processed.dataUrl })
      setOcrLoading(true)
      const ocr = await runIdentityOcr(processed.file)
      setIdentityOcr(ocr)
      applyOcrToForm(ocr)
      setOk('อ่านข้อมูลจากบัตรแล้ว กรุณาตรวจสอบก่อนบันทึก')
    } catch (err) {
      console.warn('[FieldMemberRegister] OCR failed:', err)
      setIdImage({ file, preview: URL.createObjectURL(file) })
      setError(err instanceof Error ? err.message : 'อ่านข้อความจากรูปไม่สำเร็จ กรุณากรอกเอง')
    } finally {
      setOcrLoading(false)
    }
  }

  const runOcr = async () => {
    if (!idImage) { setError('กรุณาถ่ายรูปบัตรก่อน'); return }
    setError('')
    setOk('')
    setOcrLoading(true)
    try {
      const ocr = await runIdentityOcr(idImage.file)
      setIdentityOcr(ocr)
      applyOcrToForm(ocr)
      setOk('อ่านข้อมูลจากบัตรแล้ว กรุณาตรวจสอบก่อนบันทึก')
    } catch (err) {
      console.warn('[FieldMemberRegister] OCR failed:', err)
      setError(err instanceof Error ? err.message : 'อ่านข้อความจากรูปไม่สำเร็จ กรุณากรอกเอง')
    } finally {
      setOcrLoading(false)
    }
  }

  const saveMember = async () => {
    if (!fullName || !phone) throw new Error('กรุณากรอกชื่อและเบอร์โทร')

    const { data: profile, error: profileErr } = await supabase!
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
        base_type: 'farmer',
        registration_source: 'field',
        created_by: user?.id ?? null,
        created_by_name: user?.name ?? 'ทีมภาคสนาม',
        id_card_ocr_json: identityOcr ?? {},
        identity_ocr_json: identityOcr ?? null,
        identity_ocr_confidence: identityOcr?.confidence ?? null,
        identity_ocr_raw_text: identityOcr?.raw_text ?? null,
      })
      .select('id')
      .single()
    if (profileErr) throw new Error(profileErr.message)

    const { error: farmerErr } = await supabase!
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
  }

  const saveVehicle = async () => {
    if (!vehiclePlate.trim()) throw new Error('กรุณากรอกทะเบียนรถ')
    if (!driverName.trim() && !fullName.trim()) throw new Error('กรุณากรอกชื่อเจ้าของรถหรือคนขับ')
    if (!driverPhone.trim() && !phone.trim()) throw new Error('กรุณากรอกเบอร์โทร')

    const ownerName = fullName.trim() || driverName.trim()
    const contactPhone = phone.trim() || driverPhone.trim()
    const ocrJson = {
      ...(identityOcr ?? {}),
      vehicle_plate: vehiclePlate.trim(),
      vehicle_type: vehicleType,
      driver_name: driverName.trim() || ownerName,
      driver_phone: driverPhone.trim() || contactPhone,
      note: 'field vehicle registration',
    }

    const { error: profileErr } = await supabase!
      .from('profiles')
      .insert({
        full_name: ownerName,
        phone: contactPhone,
        id_card: idCard || null,
        address: address || null,
        province: province || null,
        district: district || null,
        subdistrict: subdistrict || null,
        role: 'vehicle',
        base_type: 'service',
        registration_source: 'field_vehicle',
        created_by: user?.id ?? null,
        created_by_name: user?.name ?? 'ทีมภาคสนาม',
        id_card_ocr_json: ocrJson,
        identity_ocr_json: identityOcr ?? null,
        identity_ocr_confidence: identityOcr?.confidence ?? null,
        identity_ocr_raw_text: identityOcr?.raw_text ?? null,
      })
    if (profileErr) throw new Error(profileErr.message)
  }

  const save = async () => {
    setSaving(true); setError(''); setOk('')
    try {
      if (!supabase) throw new Error('ยังไม่เชื่อมฐานข้อมูล')
      if (registerType === 'member') await saveMember()
      else await saveVehicle()

      setOk(registerType === 'member' ? 'สมัครสมาชิกสำเร็จ รออนุมัติ' : 'ลงทะเบียนรถสำเร็จ รออนุมัติ')
      resetForm()
    } catch (e) { setError(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ') } finally { setSaving(false) }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => nav('/field')} className="bg-white border rounded-xl p-2"><ArrowLeft className="w-5 h-5" /></button>
      </div>

      <div className="bg-emerald-600 text-white rounded-3xl p-5 shadow-lg">
        <div className="flex items-center gap-3"><UserPlus className="w-8 h-8" /><div><h1 className="text-xl font-bold">สมัครภาคสนาม</h1><p className="text-sm text-emerald-100">เลือกประเภทแล้วบันทึกโดยทีมภาคสนาม</p></div></div>
      </div>

      {ok && <div className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 text-sm">{ok}</div>}
      {error && <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 p-3 text-sm">{error}</div>}

      <section className="bg-white rounded-2xl border p-4 space-y-3">
        <div className="font-bold">ประเภทที่สมัคร</div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setRegisterType('member')}
            className={`rounded-xl border-2 p-3 text-sm font-bold flex items-center justify-center gap-2 ${registerType === 'member' ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-500'}`}>
            <UserPlus className="w-4 h-4" />สมาชิก
          </button>
          <button type="button" onClick={() => setRegisterType('vehicle')}
            className={`rounded-xl border-2 p-3 text-sm font-bold flex items-center justify-center gap-2 ${registerType === 'vehicle' ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-500'}`}>
            <Truck className="w-4 h-4" />รถ
          </button>
        </div>
      </section>

      <section className="bg-white rounded-2xl border p-4 space-y-3">
        <div className="font-bold flex items-center gap-2"><CreditCard className="w-5 h-5" />ข้อมูลบัตร / ผู้สมัคร</div>
        <label className="w-full border rounded-xl py-3 font-bold flex items-center justify-center gap-2 cursor-pointer">
          📷 ถ่ายรูปบัตรประชาชน
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleIdImageChange} />
        </label>
        {idImage && <img src={idImage.preview} className="w-full max-h-56 object-cover rounded-xl border" />}
        <button type="button" onClick={runOcr} disabled={ocrLoading || !idImage} className="w-full border rounded-xl py-3 font-bold disabled:opacity-50">
          {ocrLoading ? 'กำลังอ่านข้อมูลจากบัตร...' : 'อ่านข้อมูลจากบัตร (OCR)'}
        </button>
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={registerType === 'member' ? 'ชื่อ-นามสกุล' : 'ชื่อเจ้าของรถ'} className="w-full border rounded-xl p-3" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="เบอร์โทร" className="w-full border rounded-xl p-3" />
        <input value={idCard} onChange={(e) => setIdCard(e.target.value)} placeholder="เลขบัตรประชาชน" className="w-full border rounded-xl p-3" />
        <textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="ที่อยู่ตามบัตร" className="w-full border rounded-xl p-3" />
      </section>

      {registerType === 'member' ? (
        <>
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
        </>
      ) : (
        <section className="bg-white rounded-2xl border p-4 space-y-3">
          <div className="font-bold flex items-center gap-2"><Truck className="w-5 h-5" />ข้อมูลรถ</div>
          <input value={vehiclePlate} onChange={(e) => setVehiclePlate(e.target.value)} placeholder="ทะเบียนรถ เช่น 70-1234" className="w-full border rounded-xl p-3" />
          <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} className="w-full border rounded-xl p-3 bg-white">
            {['6 ล้อ', '10 ล้อ', 'รถพ่วง', 'รถเทรลเลอร์', 'อื่นๆ'].map(v => <option key={v}>{v}</option>)}
          </select>
          <input value={driverName} onChange={(e) => setDriverName(e.target.value)} placeholder="ชื่อคนขับ (ถ้าต่างจากเจ้าของรถ)" className="w-full border rounded-xl p-3" />
          <input value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)} placeholder="เบอร์คนขับ" className="w-full border rounded-xl p-3" />
          <div className="rounded-xl bg-amber-50 border border-amber-200 text-amber-700 p-3 text-xs">
            ตอนนี้ยังไม่มีตารางรถแยก จึงบันทึกข้อมูลรถไว้ใน profile ประเภท vehicle ก่อน
          </div>
        </section>
      )}

      <button disabled={saving || ocrLoading} onClick={save} className="w-full rounded-xl bg-emerald-600 disabled:bg-gray-300 text-white py-3 font-bold flex justify-center gap-2"><CheckCircle className="w-5 h-5" />{saving ? <><RefreshCw className="w-5 h-5 animate-spin" />กำลังบันทึก...</> : registerType === 'member' ? 'บันทึกสมัครสมาชิก' : 'บันทึกลงทะเบียนรถ'}</button>
    </div>
  )
}
