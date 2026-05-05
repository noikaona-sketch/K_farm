import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle, CreditCard, MapPin, RefreshCw, UserPlus, Building2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../routes/AuthContext'
import { preprocessImageForOcr } from '../../lib/imagePreprocess'
import { runIdentityOcr, type IdentityOcrResult } from '../../lib/identityOcr'

const genFarmerCode = () => `KF${Date.now().toString().slice(-6)}`
const PROVINCES = ['บุรีรัมย์','สุรินทร์','ศรีสะเกษ','นครราชสีมา','ร้อยเอ็ด','อุบลราชธานี','ยโสธร','มุกดาหาร']
const BANKS = ['ธนาคารกรุงไทย','ธนาคารออมสิน','ธ.ก.ส.','ธนาคารกรุงเทพ','ธนาคารไทยพาณิชย์','ธนาคารกสิกรไทย','ธนาคารกรุงศรีอยุธยา']

function isThaiFullName(name: string) {
  return /^[ก-๙\s.]+$/.test(name.trim())
}

export default function FieldMemberRegister() {
  const nav = useNavigate()
  const { user } = useAuth()
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [idCard, setIdCard] = useState('')
  const [address, setAddress] = useState('')
  const [province, setProvince] = useState('บุรีรัมย์')
  const [district, setDistrict] = useState('')
  const [subdistrict, setSubdistrict] = useState('')
  const [bankName, setBankName] = useState('ธ.ก.ส.')
  const [bankAccountNo, setBankAccountNo] = useState('')
  const [bankAccountName, setBankAccountName] = useState('')
  const [idImage, setIdImage] = useState<{ file: File; preview: string } | null>(null)
  const [identityOcr, setIdentityOcr] = useState<IdentityOcrResult | null>(null)
  const [saving, setSaving] = useState(false)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [showOcrRaw, setShowOcrRaw] = useState(false)
  const [ok, setOk] = useState('')
  const [error, setError] = useState('')

  const resetForm = () => {
    setFullName(''); setPhone(''); setIdCard(''); setAddress('')
    setProvince('บุรีรัมย์'); setDistrict(''); setSubdistrict('')
    setBankName('ธ.ก.ส.'); setBankAccountNo(''); setBankAccountName('')
    setIdImage(null); setIdentityOcr(null); setShowOcrRaw(false)
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
    setShowOcrRaw(false)
    setOcrLoading(true)
    try {
      const processed = await preprocessImageForOcr(file, {
        maxSide: 1200,
        quality: 0.8,
        centerCrop: true,
      })
      setIdImage({ file: processed.file, preview: processed.dataUrl })
      const ocr = await runIdentityOcr(processed.file)
      console.info('[FieldMemberRegister OCR]', ocr)
      setIdentityOcr(ocr)
      setShowOcrRaw(true)
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

  const validate = () => {
    const cleanId = idCard.replace(/[-\s]/g, '').trim()
    const cleanPhone = phone.replace(/[-\s]/g, '').trim()
    if (!fullName.trim()) throw new Error('กรุณากรอกชื่อ-นามสกุล')
    if (!isThaiFullName(fullName)) throw new Error('กรุณากรอกชื่อ-นามสกุลเป็นภาษาไทย')
    if (cleanId.length !== 13) throw new Error('เลขบัตรประชาชนต้องมี 13 หลัก')
    if (cleanPhone.length < 9) throw new Error('กรุณากรอกเบอร์โทรให้ถูกต้อง')
    if (!district.trim()) throw new Error('กรุณากรอกอำเภอ')
    if (!subdistrict.trim()) throw new Error('กรุณากรอกตำบล')
    if (!bankAccountNo.trim()) throw new Error('กรุณากรอกเลขบัญชี')
    if (bankAccountName.trim() !== fullName.trim()) throw new Error('ชื่อบัญชีต้องตรงกับชื่อผู้สมัคร')
    return { cleanId, cleanPhone }
  }

  const saveMember = async () => {
    const { cleanId, cleanPhone } = validate()

    const { data: profile, error: profileErr } = await supabase!
      .from('profiles')
      .insert({
        full_name: fullName.trim(),
        phone: cleanPhone,
        id_card: cleanId,
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
        village: address || null,
        status: 'pending',
      })
    if (farmerErr) throw new Error(farmerErr.message)
  }

  const save = async () => {
    setSaving(true); setError(''); setOk('')
    try {
      if (!supabase) throw new Error('ยังไม่เชื่อมฐานข้อมูล')
      await saveMember()
      setOk('สมัครสมาชิกสำเร็จ รออนุมัติ')
      resetForm()
    } catch (e) { setError(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ') } finally { setSaving(false) }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => nav('/field')} className="bg-white border rounded-xl p-2"><ArrowLeft className="w-5 h-5" /></button>
      </div>

      <div className="bg-emerald-600 text-white rounded-3xl p-5 shadow-lg">
        <div className="flex items-center gap-3"><UserPlus className="w-8 h-8" /><div><h1 className="text-xl font-bold">สมัครสมาชิกภาคสนาม</h1><p className="text-sm text-emerald-100">รูปแบบเดียวกับสมัครสมาชิก</p></div></div>
      </div>

      {ok && <div className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 text-sm">{ok}</div>}
      {error && <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 p-3 text-sm">{error}</div>}

      <section className="bg-white rounded-2xl border p-4 space-y-3">
        <div className="font-bold flex items-center gap-2"><CreditCard className="w-5 h-5" />ข้อมูลส่วนตัว</div>
        <label className="w-full border rounded-xl py-3 font-bold flex items-center justify-center gap-2 cursor-pointer">
          📷 ถ่ายรูปบัตรประชาชน
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleIdImageChange} />
        </label>
        {ocrLoading && <div className="rounded-xl bg-blue-50 border border-blue-200 text-blue-700 p-3 text-sm flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" />กำลังอ่านข้อมูลจากบัตร...</div>}
        {idImage && <img src={idImage.preview} className="w-full max-h-56 object-cover rounded-xl border" />}
        {identityOcr?.raw_text && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700">
            <button type="button" onClick={() => setShowOcrRaw(v => !v)} className="font-bold text-emerald-700 mb-2">
              {showOcrRaw ? 'ซ่อนข้อความ OCR' : 'แสดงข้อความ OCR ทั้งหมด'}
            </button>
            {showOcrRaw && (
              <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed">
                {identityOcr.raw_text}
              </pre>
            )}
          </div>
        )}
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="ชื่อ-นามสกุล ภาษาไทย *" className="w-full border rounded-xl p-3" />
        <input value={idCard} onChange={(e) => setIdCard(e.target.value)} placeholder="เลขบัตรประชาชน 13 หลัก *" inputMode="numeric" className="w-full border rounded-xl p-3" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="เบอร์โทรศัพท์ *" className="w-full border rounded-xl p-3" />
      </section>

      <section className="bg-white rounded-2xl border p-4 space-y-3">
        <div className="font-bold flex items-center gap-2"><MapPin className="w-5 h-5" />ที่อยู่</div>
        <select value={province} onChange={(e) => setProvince(e.target.value)} className="w-full border rounded-xl p-3 bg-white">
          {PROVINCES.map(p => <option key={p}>{p}</option>)}
        </select>
        <input value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="อำเภอ *" className="w-full border rounded-xl p-3" />
        <input value={subdistrict} onChange={(e) => setSubdistrict(e.target.value)} placeholder="ตำบล *" className="w-full border rounded-xl p-3" />
        <textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="ที่อยู่ / หมู่บ้าน" className="w-full border rounded-xl p-3" />
      </section>

      <section className="bg-white rounded-2xl border p-4 space-y-3">
        <div className="font-bold flex items-center gap-2"><Building2 className="w-5 h-5" />บัญชีธนาคาร</div>
        <select value={bankName} onChange={(e) => setBankName(e.target.value)} className="w-full border rounded-xl p-3 bg-white">
          {BANKS.map(b => <option key={b}>{b}</option>)}
        </select>
        <input value={bankAccountNo} onChange={(e) => setBankAccountNo(e.target.value)} placeholder="เลขบัญชี *" inputMode="numeric" className="w-full border rounded-xl p-3" />
        <input value={bankAccountName} onChange={(e) => setBankAccountName(e.target.value)} placeholder="ชื่อบัญชีต้องตรงกับชื่อผู้สมัคร *" className="w-full border rounded-xl p-3" />
      </section>

      <button disabled={saving || ocrLoading} onClick={save} className="w-full rounded-xl bg-emerald-600 disabled:bg-gray-300 text-white py-3 font-bold flex justify-center gap-2"><CheckCircle className="w-5 h-5" />{saving ? <><RefreshCw className="w-5 h-5 animate-spin" />กำลังบันทึก...</> : 'บันทึกสมัครสมาชิก'}</button>
    </div>
  )
}
