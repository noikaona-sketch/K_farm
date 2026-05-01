import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, CreditCard, Phone, RefreshCw, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { useAuth } from './AuthContext'
import { loginWithIdCardPhone } from '../lib/db'
import { isSupabaseReady } from '../lib/supabase'

export default function SignIn() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [idCard, setIdCard] = useState('')
  const [phone, setPhone] = useState('')
  const [showPhone, setShowPhone] = useState(false)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const handleLogin = async () => {
    if (!idCard.trim()) { setErr('กรุณากรอกเลขบัตรประชาชน'); return }
    if (!phone.trim()) { setErr('กรุณากรอกเบอร์โทรศัพท์'); return }
    setLoading(true); setErr(null)

    try {
      const cleanId = idCard.replace(/[-\s]/g, '').trim()
      const cleanPhone = phone.replace(/[-\s]/g, '').trim()

      const res = await loginWithIdCardPhone(cleanId, cleanPhone)

      if (res.error && isSupabaseReady) {
        throw new Error(`เกิดข้อผิดพลาด: ${res.error}`)
      }

      if (!res.data) {
        setErr('ไม่พบข้อมูลสมาชิก กรุณาสมัครสมาชิกก่อน')
        return
      }

      login(res.data)   // persist ใน localStorage ผ่าน AuthContext

      // route ตาม role
      if (res.data.role === 'admin') navigate('/admin', { replace: true })
      else if (res.data.role === 'leader') navigate('/leader', { replace: true })
      else if (res.data.role === 'inspector') navigate('/inspector', { replace: true })
      else navigate('/farmer', { replace: true })

    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-800 via-emerald-700 to-emerald-600 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-12 pb-8">
        <button onClick={() => navigate('/login')} className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors">
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">เข้าสู่ระบบ</h1>
          <p className="text-emerald-200 text-sm">สำหรับสมาชิกที่ลงทะเบียนแล้ว</p>
        </div>
      </div>

      {/* Card */}
      <div className="flex-1 bg-gray-50 rounded-t-[2.5rem] px-6 pt-8 pb-10">
        <div className="max-w-sm mx-auto space-y-5">

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-blue-700">
            <p className="font-semibold mb-1">วิธีเข้าสู่ระบบ</p>
            <p>Username: <strong>เลขบัตรประชาชน</strong> 13 หลัก</p>
            <p>รหัสผ่าน: <strong>เบอร์โทรศัพท์</strong> ที่ลงทะเบียน</p>
          </div>

          {/* Error */}
          {err && (
            <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-red-700 text-sm">เข้าสู่ระบบไม่สำเร็จ</p>
                <p className="text-red-600 text-sm mt-0.5">{err}</p>
                {err.includes('สมัครสมาชิก') && (
                  <button onClick={() => navigate('/register')}
                    className="mt-2 text-emerald-600 font-bold text-sm underline">
                    กดสมัครสมาชิกที่นี่ →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ID Card */}
          <div>
            <label className="text-sm font-bold text-gray-700 block mb-2 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              เลขบัตรประชาชน (Username)
            </label>
            <input
              type="text"
              value={idCard}
              onChange={e => { setIdCard(e.target.value); setErr(null) }}
              placeholder="1-xxxx-xxxxx-xx-x"
              inputMode="numeric"
              maxLength={17}
              className="w-full border-2 border-gray-200 rounded-2xl px-5 py-4 text-lg font-mono focus:outline-none focus:border-emerald-500 transition-colors bg-white"
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
          </div>

          {/* Phone */}
          <div>
            <label className="text-sm font-bold text-gray-700 block mb-2 flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-emerald-600" />
              เบอร์โทรศัพท์ <span className="font-normal text-gray-400">(รหัสผ่านชั่วคราว)</span>
            </label>
            <div className="relative">
              <input
                type={showPhone ? 'text' : 'password'}
                value={phone}
                onChange={e => { setPhone(e.target.value); setErr(null) }}
                placeholder="08x-xxx-xxxx"
                inputMode="numeric"
                className="w-full border-2 border-gray-200 rounded-2xl px-5 py-4 text-lg pr-14 focus:outline-none focus:border-emerald-500 transition-colors bg-white"
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
              />
              <button
                onClick={() => setShowPhone(!showPhone)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPhone ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1.5 ml-1">เบอร์โทรที่ใช้ตอนสมัครสมาชิก</p>
          </div>

          {/* Login button */}
          <button
            onClick={handleLogin}
            disabled={loading}
            className={`w-full py-5 rounded-2xl font-bold text-xl shadow-xl flex items-center justify-center gap-3 transition-all mt-2
              ${loading ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[.98]'}`}
          >
            {loading
              ? <><RefreshCw className="w-6 h-6 animate-spin" />กำลังตรวจสอบ...</>
              : <><span className="text-2xl">🔑</span>เข้าสู่ระบบ</>
            }
          </button>

          <p className="text-center text-gray-400 text-sm">
            ยังไม่มีบัญชี?{' '}
            <button onClick={() => navigate('/register')} className="text-emerald-600 font-bold">สมัครสมาชิก</button>
          </p>

          {/* Admin link */}
          <div className="border-t border-gray-200 pt-4">
            <button onClick={() => navigate('/admin-login')}
              className="w-full text-gray-400 text-sm py-2 hover:text-gray-600 transition-colors">
              เข้าระบบสำหรับเจ้าหน้าที่ →
            </button>
          </div>

          {!isSupabaseReady && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 text-center">
              🟡 Mock mode — ทดสอบด้วย 1234567890123 / 0812345678
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
