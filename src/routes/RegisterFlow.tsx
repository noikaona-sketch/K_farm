import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Check, AlertCircle, RefreshCw, User, CreditCard, Phone, MapPin, Building2 } from 'lucide-react'
import { useAuth } from './AuthContext'
import { registerFarmerMember } from '../lib/db'
import { isSupabaseReady } from '../lib/supabase'

const PROVINCES = ['บุรีรัมย์','สุรินทร์','ศรีสะเกษ','นครราชสีมา','ร้อยเอ็ด','อุบลราชธานี','ยโสธร','มุกดาหาร']
const BANKS = ['ธนาคารกรุงไทย','ธนาคารออมสิน','ธ.ก.ส.','ธนาคารกรุงเทพ','ธนาคารไทยพาณิชย์','ธนาคารกสิกรไทย','ธนาคารกรุงศรีอยุธยา']

interface FormState {
  full_name: string
  id_card: string
  phone: string
  province: string
  district: string
  village: string
  bank_name: string
  bank_account_no: string
  bank_account_name: string
}

const EMPTY: FormState = {
  full_name: '', id_card: '', phone: '',
  province: 'บุรีรัมย์', district: '', village: '',
  bank_name: 'ธ.ก.ส.', bank_account_no: '', bank_account_name: '',
}

export default function RegisterFlow() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [form, setForm] = useState<FormState>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [step, setStep] = useState<string>('')
  const [err, setErr] = useState<string | null>(null)
  const [fieldErr, setFieldErr] = useState<Partial<Record<keyof FormState, string>>>({})

  const u = (k: keyof FormState, v: string) => {
    setForm(f => ({ ...f, [k]: v }))
    setFieldErr(fe => ({ ...fe, [k]: undefined }))
    setErr(null)
  }

  const validate = (): boolean => {
    const errors: Partial<Record<keyof FormState, string>> = {}
    if (!form.full_name.trim()) errors.full_name = 'กรุณากรอกชื่อ-นามสกุล'
    if (!form.id_card.trim() || form.id_card.replace(/[-\s]/g,'').length !== 13)
      errors.id_card = 'เลขบัตรประชาชน 13 หลัก'
    if (!form.phone.trim() || form.phone.replace(/[-\s]/g,'').length < 9)
      errors.phone = 'กรุณากรอกเบอร์โทรให้ถูกต้อง'
    if (!form.district.trim()) errors.district = 'กรุณากรอกอำเภอ'
    if (!form.bank_account_no.trim()) errors.bank_account_no = 'กรุณากรอกเลขบัญชี'
    if (!form.bank_account_name.trim()) errors.bank_account_name = 'กรุณากรอกชื่อบัญชี'
    setFieldErr(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSaving(true); setErr(null); setStep('')

    try {
      setStep('กำลังตรวจสอบข้อมูล...')
      const res = await registerFarmerMember({
        full_name: form.full_name.trim(),
        id_card: form.id_card.replace(/[-\s]/g, '').trim(),
        phone: form.phone.replace(/[-\s]/g, '').trim(),
        province: form.province,
        district: form.district.trim(),
        village: form.village.trim(),
        bank_name: form.bank_name,
        bank_account_no: form.bank_account_no.trim(),
        bank_account_name: form.bank_account_name.trim(),
      })

      if (res.error && isSupabaseReady) {
        throw new Error(res.error)
      }

      setStep('สมัครสำเร็จ! ✓')
      if (res.data) {
        login(res.data)           // บันทึกลง localStorage ผ่าน AuthContext
        navigate('/farmer', { replace: true })
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่')
      console.error('[RegisterFlow]', e)
    } finally {
      setSaving(false)
      setStep('')
    }
  }

  const Field = ({
    label, k, placeholder, type = 'text', note, icon: Icon,
  }: {
    label: string; k: keyof FormState; placeholder: string;
    type?: string; note?: string; icon?: React.ElementType;
  }) => (
    <div>
      <label className="text-sm font-semibold text-gray-700 block mb-1.5 flex items-center gap-1.5">
        {Icon && <Icon className="w-4 h-4 text-emerald-600" />}
        {label}
      </label>
      <input
        type={type}
        value={form[k]}
        onChange={e => u(k, e.target.value)}
        placeholder={placeholder}
        inputMode={type === 'number' || k === 'phone' || k === 'id_card' || k === 'bank_account_no' ? 'numeric' : 'text'}
        className={`w-full border-2 rounded-2xl px-4 py-3.5 text-base focus:outline-none transition-colors
          ${fieldErr[k] ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white focus:border-emerald-500'}`}
      />
      {fieldErr[k] && <p className="text-red-500 text-xs mt-1 ml-1">{fieldErr[k]}</p>}
      {note && !fieldErr[k] && <p className="text-gray-400 text-xs mt-1 ml-1">{note}</p>}
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-emerald-600 text-white px-5 py-4 flex items-center gap-3 sticky top-0 z-40 shadow-md">
        <button onClick={() => navigate('/login')} className="p-1.5 rounded-xl hover:bg-white/20 transition-colors">
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

      <div className="p-5 space-y-5 pb-10">
        {/* Info note */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700 leading-relaxed">
            <strong>รหัสผ่านชั่วคราวคือเบอร์โทรศัพท์ของท่าน</strong><br />
            ใช้เลขบัตรประชาชน + เบอร์โทรในการเข้าสู่ระบบครั้งต่อไป
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

        {/* Section 1: ข้อมูลส่วนตัว */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
            <User className="w-5 h-5 text-emerald-600" />
            <h2 className="font-bold text-gray-800">ข้อมูลส่วนตัว</h2>
          </div>
          <Field label="ชื่อ-นามสกุล *" k="full_name" placeholder="กรอกชื่อ-นามสกุล" icon={User} />
          <Field
            label="เลขบัตรประชาชน * (ใช้เป็น Username)" k="id_card"
            placeholder="1-xxxx-xxxxx-xx-x" icon={CreditCard}
            note="13 หลัก — ใช้เข้าสู่ระบบ"
          />
          <Field
            label="เบอร์โทรศัพท์ * (ใช้เป็นรหัสผ่านชั่วคราว)" k="phone"
            placeholder="08x-xxx-xxxx" icon={Phone}
            note="เบอร์มือถือ — ใช้เป็นรหัสผ่านในการเข้าสู่ระบบ"
          />
        </div>

        {/* Section 2: ที่อยู่ */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
            <MapPin className="w-5 h-5 text-emerald-600" />
            <h2 className="font-bold text-gray-800">ที่อยู่</h2>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1.5">จังหวัด</label>
            <select value={form.province} onChange={e => u('province', e.target.value)}
              className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3.5 text-base focus:outline-none focus:border-emerald-500 bg-white">
              {PROVINCES.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <Field label="อำเภอ *" k="district" placeholder="กรอกอำเภอ" />
          <Field label="หมู่บ้าน / ตำบล" k="village" placeholder="เช่น บ้านดง ต.นาดี" />
        </div>

        {/* Section 3: บัญชีธนาคาร */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
            <Building2 className="w-5 h-5 text-emerald-600" />
            <h2 className="font-bold text-gray-800">บัญชีธนาคาร (สำหรับรับเงิน)</h2>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1.5">ธนาคาร</label>
            <select value={form.bank_name} onChange={e => u('bank_name', e.target.value)}
              className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3.5 text-base focus:outline-none focus:border-emerald-500 bg-white">
              {BANKS.map(b => <option key={b}>{b}</option>)}
            </select>
          </div>
          <Field label="เลขบัญชี *" k="bank_account_no" placeholder="xxx-x-xxxxx-x" note="ไม่ต้องใส่เครื่องหมาย -" />
          <Field label="ชื่อบัญชี *" k="bank_account_name" placeholder="ชื่อ-นามสกุล ตามสมุดบัญชี" />
        </div>

        {/* Consent note */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-700 leading-relaxed">
          การสมัครสมาชิกถือว่าท่านยินยอมให้จัดเก็บข้อมูลส่วนบุคคลเพื่อใช้ในกระบวนการรับซื้อข้าวโพดและการชำระเงิน
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={saving}
          className={`w-full py-5 rounded-2xl font-bold text-lg shadow-xl flex items-center justify-center gap-3 transition-all
            ${saving ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[.98]'}`}
        >
          {saving
            ? <><RefreshCw className="w-6 h-6 animate-spin" />กำลังสมัคร...</>
            : <><Check className="w-6 h-6" />ยืนยันสมัครสมาชิก</>
          }
        </button>

        <p className="text-center text-gray-400 text-sm">
          มีบัญชีแล้ว?{' '}
          <button onClick={() => navigate('/signin')} className="text-emerald-600 font-bold">เข้าสู่ระบบ</button>
        </p>
      </div>
    </div>
  )
}
