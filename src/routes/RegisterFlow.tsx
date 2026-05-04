import React, { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronLeft, Check, AlertCircle, RefreshCw,
  User, CreditCard, Phone, MapPin, Building2,camera,
} from 'lucide-react'
import { useAuth } from './AuthContext'
import { registerFarmerMember } from '../lib/db'
import { isSupabaseReady } from '../lib/supabase'

const PROVINCES = ['บุรีรัมย์','สุรินทร์','ศรีสะเกษ','นครราชสีมา','ร้อยเอ็ด','อุบลราชธานี','ยโสธร','มุกดาหาร']
const BANKS = ['ธนาคารกรุงไทย','ธนาคารออมสิน','ธ.ก.ส.','ธนาคารกรุงเทพ','ธนาคารไทยพาณิชย์','ธนาคารกสิกรไทย','ธนาคารกรุงศรีอยุธยา']

// ── Uncontrolled text input — zero re-render while typing ─────────────────────
function Field({
  label, name, placeholder, inputMode = 'text', note, icon: Icon, errMsg,
}: {
  label: string
  name: string
  placeholder: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
  note?: string
  icon?: React.ElementType
  errMsg?: string
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5 mb-1.5">
        {Icon && <Icon className="w-4 h-4 text-emerald-600" />}
        {label}
      </label>
      <input
        name={name}
        placeholder={placeholder}
        inputMode={inputMode}
        autoComplete="off"
        className={`w-full border-2 rounded-2xl px-4 py-3.5 text-base focus:outline-none transition-colors bg-white
          ${errMsg ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-emerald-500'}`}
      />
      {errMsg && <p className="text-red-500 text-xs mt-1 ml-1">{errMsg}</p>}
      {note && !errMsg && <p className="text-gray-400 text-xs mt-1 ml-1">{note}</p>}
    </div>
  )
}

export default function RegisterFlow() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const formRef = useRef<HTMLFormElement>(null)

  // Select refs (dropdowns stay controlled — no typing so no lag)
  const [province, setProvince] = useState('บุรีรัมย์')
  const [bankName, setBankName] = useState('ธ.ก.ส.')

  const [saving, setSaving] = useState(false)
  const [step, setStep] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [fieldErr, setFieldErr] = useState<Record<string, string>>({})
  const [identityPhoto, setIdentityPhoto] = useState<File | null>(null)
  const [identityPhotoPreview, setIdentityPhotoPreview] = useState<string | null>(null)

  const handleIdentityPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0] ?? null
  setIdentityPhoto(file)
  setIdentityPhotoPreview(prev => {
    if (prev) URL.revokeObjectURL(prev)
    return file ? URL.createObjectURL(file) : null
  })
  if (file && fieldErr.identity_photo) {
    setFieldErr(prev => {
      const next = { ...prev }
      delete next.identity_photo
      return next
    })
  }
}
  
  const getValues = () => {
    const fd = new FormData(formRef.current!)
    return {
      full_name:         (fd.get('full_name')         as string ?? '').trim(),
      id_card:           (fd.get('id_card')            as string ?? '').replace(/[-\s]/g, '').trim(),
      phone:             (fd.get('phone')              as string ?? '').replace(/[-\s]/g, '').trim(),
      district:          (fd.get('district')           as string ?? '').trim(),
      village:           (fd.get('village')            as string ?? '').trim(),
      bank_account_no:   (fd.get('bank_account_no')   as string ?? '').trim(),
      bank_account_name: (fd.get('bank_account_name') as string ?? '').trim(),
      province,
      bank_name: bankName,
    }
  }

  const validate = (v: ReturnType<typeof getValues>): Record<string, string> => {
    const e: Record<string, string> = {}
    if (!v.full_name)                      e.full_name         = 'กรุณากรอกชื่อ-นามสกุล'
    if (v.id_card.length !== 13)           e.id_card           = 'เลขบัตรประชาชน 13 หลัก'
    if (v.phone.length < 9)               e.phone             = 'กรุณากรอกเบอร์โทรให้ถูกต้อง'
    if (!v.district)                       e.district          = 'กรุณากรอกอำเภอ'
    if (!v.bank_account_no)               e.bank_account_no   = 'กรุณากรอกเลขบัญชี'
    if (!v.bank_account_name)             e.bank_account_name = 'กรุณากรอกชื่อบัญชี'
    if (!identityPhoto) e.identity_photo = 'กรุณาแนบรูปเอกสารยืนยันตัวตน'
    return e
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const values = getValues()
    const errors = validate(values)
    if (Object.keys(errors).length > 0) {
      setFieldErr(errors)
      // scroll to first error
      const firstKey = Object.keys(errors)[0]
      formRef.current?.querySelector<HTMLInputElement>(`[name="${firstKey}"]`)?.focus()
      return
    }
    setFieldErr({})
    setSaving(true); setErr(null)

    try {
      setStep('กำลังตรวจสอบข้อมูล...')
      console.info('[RegisterFlow] identity photo selected:', identityPhoto?.name)
      const res = await registerFarmerMember(values)
      if (res.error && isSupabaseReady) throw new Error(res.error)
      setStep('สมัครสำเร็จ! ✓')
      if (res.data) {
        login(res.data)
        navigate('/farmer', { replace: true })
      }
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่')
      console.error('[RegisterFlow]', ex)
    } finally {
      setSaving(false); setStep('')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-emerald-600 text-white px-5 py-4 flex items-center gap-3 sticky top-0 z-40 shadow-md">
        <button type="button" onClick={() => navigate('/login')}
          className="p-1.5 rounded-xl hover:bg-white/20 transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div>
          <div className="font-bold text-lg">สมัครสมาชิก</div>
          <div className="text-xs text-emerald-100">กรอกข้อมูลให้ครบถ้วน</div>
        </div>
        <div className="ml-auto text-xs text-emerald-200 bg-white/10 px-2.5 py-1 rounded-lg">
          {isSupabaseReady ? '🟢 ออนไลน์' : '🟡 Mock'}
        </div>
      </div>

      {/* Loading overlay */}
      {saving && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-3xl p-8 flex flex-col items-center gap-4 w-full max-w-xs shadow-2xl">
            <RefreshCw className="w-12 h-12 text-emerald-600 animate-spin" />
            <div className="text-center">
              <p className="font-bold text-gray-800">กำลังดำเนินการ...</p>
              <p className="text-emerald-600 text-sm mt-1">{step}</p>
            </div>
          </div>
        </div>
      )}

      {/* Form — uncontrolled via ref + FormData */}
      <form ref={formRef} onSubmit={handleSubmit} className="p-5 space-y-5 pb-10">

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700 leading-relaxed">
            <strong>รหัสผ่านชั่วคราวคือเบอร์โทรศัพท์</strong><br />
            ใช้ <strong>เลขบัตรประชาชน + เบอร์โทร</strong> ในการเข้าสู่ระบบครั้งต่อไป
          </div>
        </div>

        {/* Error */}
        {err && (
          <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-red-700 text-sm">สมัครไม่สำเร็จ</p>
              <p className="text-red-600 text-sm mt-0.5">{err}</p>
            </div>
          </div>
        )}

        {/* ── Section 1: ข้อมูลส่วนตัว ── */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
            <User className="w-5 h-5 text-emerald-600" />
            <h2 className="font-bold text-gray-800">ข้อมูลส่วนตัว</h2>
          </div>
          <Field label="ชื่อ-นามสกุล *" name="full_name" placeholder="กรอกชื่อ-นามสกุล"
            icon={User} errMsg={fieldErr.full_name} />
          <Field label="เลขบัตรประชาชน * (Username)" name="id_card"
            placeholder="1-xxxx-xxxxx-xx-x" inputMode="numeric" icon={CreditCard}
            note="13 หลัก — ใช้เข้าสู่ระบบ" errMsg={fieldErr.id_card} />
          <Field label="เบอร์โทรศัพท์ * (รหัสผ่านชั่วคราว)" name="phone"
            placeholder="08x-xxx-xxxx" inputMode="tel" icon={Phone}
            note="เบอร์ที่ใช้ตอนสมัคร = รหัสผ่าน" errMsg={fieldErr.phone} />
        </div>
<div>
  <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5 mb-1.5">
    <Camera className="w-4 h-4 text-emerald-600" />
    รูปเอกสารยืนยันตัวตน *
  </label>
  <input
    name="identity_photo"
    type="file"
    accept="image/*"
    capture="environment"
    onChange={handleIdentityPhotoChange}
    className={`w-full border-2 rounded-2xl px-4 py-3.5 text-sm bg-white
      ${fieldErr.identity_photo ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-emerald-500'}`}
  />
  {fieldErr.identity_photo && (
    <p className="text-red-500 text-xs mt-1 ml-1">{fieldErr.identity_photo}</p>
  )}
  {!fieldErr.identity_photo && (
    <p className="text-gray-400 text-xs mt-1 ml-1">ถ่ายหรือแนบรูปให้ชัดเจน</p>
  )}
  {identityPhotoPreview && (
    <img
      src={identityPhotoPreview}
      alt="ตัวอย่างรูปเอกสาร"
      className="mt-3 w-full max-h-56 object-contain rounded-2xl border border-gray-200 bg-gray-50"
    />
  )}
</div>
        
        {/* ── Section 2: ที่อยู่ ── */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
            <MapPin className="w-5 h-5 text-emerald-600" />
            <h2 className="font-bold text-gray-800">ที่อยู่</h2>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1.5">จังหวัด</label>
            <select value={province} onChange={e => setProvince(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3.5 text-base focus:outline-none focus:border-emerald-500 bg-white">
              {PROVINCES.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>

          <Field label="อำเภอ *" name="district" placeholder="กรอกอำเภอ"
            errMsg={fieldErr.district} />
          <Field label="หมู่บ้าน / ตำบล" name="village"
            placeholder="เช่น บ้านดง ต.นาดี" />
        </div>

        {/* ── Section 3: บัญชีธนาคาร ── */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
            <Building2 className="w-5 h-5 text-emerald-600" />
            <h2 className="font-bold text-gray-800">บัญชีธนาคาร (สำหรับรับเงิน)</h2>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1.5">ธนาคาร</label>
            <select value={bankName} onChange={e => setBankName(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3.5 text-base focus:outline-none focus:border-emerald-500 bg-white">
              {BANKS.map(b => <option key={b}>{b}</option>)}
            </select>
          </div>

          <Field label="เลขบัญชี *" name="bank_account_no"
            placeholder="xxx-x-xxxxx-x" inputMode="numeric"
            note="ไม่ต้องใส่เครื่องหมาย -" errMsg={fieldErr.bank_account_no} />
          <Field label="ชื่อบัญชี *" name="bank_account_name"
            placeholder="ชื่อ-นามสกุล ตามสมุดบัญชี"
            errMsg={fieldErr.bank_account_name} />
        </div>

        {/* Consent */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-700 leading-relaxed">
          การสมัครสมาชิกถือว่าท่านยินยอมให้จัดเก็บข้อมูลส่วนบุคคลเพื่อใช้ในกระบวนการรับซื้อข้าวโพดและการชำระเงิน
        </div>

        {/* Submit */}
        <button type="submit" disabled={saving}
          className={`w-full py-5 rounded-2xl font-bold text-lg shadow-xl flex items-center justify-center gap-3 transition-all
            ${saving
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[.98]'}`}>
          {saving
            ? <><RefreshCw className="w-6 h-6 animate-spin" />กำลังสมัคร...</>
            : <><Check className="w-6 h-6" />ยืนยันสมัครสมาชิก</>}
        </button>

        <p className="text-center text-gray-400 text-sm">
          มีบัญชีแล้ว?{' '}
          <button type="button" onClick={() => navigate('/signin')}
            className="text-emerald-600 font-bold">เข้าสู่ระบบ</button>
        </p>
      </form>
    </div>
  )
}
