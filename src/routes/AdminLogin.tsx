import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, RefreshCw, AlertCircle } from 'lucide-react'
import { useAuth } from './AuthContext'
import logoImage from '../assets/logo.png'
import { signInAdminWithPassword } from '../lib/authProfile'
import type { AppRole } from '../lib/roles'

function routeForRole(role: AppRole) {
  if (role === 'admin') return '/admin'
  if (role === 'field') return '/field'
  if (role === 'leader') return '/leader'
  if (role === 'service' || role === 'vehicle') return '/service'
  return '/inspector'
}

export default function AdminLogin() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const handleLogin = async () => {
    setLoading(true)
    setErr(null)
    try {
      if (!email.trim()) throw new Error('กรุณากรอก Email')
      if (!password) throw new Error('กรุณากรอกรหัสผ่าน')
      const user = await signInAdminWithPassword(email.trim(), password)
      login(user)
      navigate(routeForRole(user.role), { replace: true })
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'เข้าสู่ระบบไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-800 to-gray-900 flex flex-col items-center justify-center p-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3 overflow-hidden shadow-xl">
          <img src={logoImage} className="w-full h-full object-cover" />
        </div>
        <h1 className="text-xl font-bold text-white">ระบบสำหรับเจ้าหน้าที่</h1>
        <p className="text-gray-400 text-sm mt-0.5">Admin / Field / Leader / Inspector</p>
      </div>

      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="bg-gray-800 px-6 py-4 flex items-center gap-3">
          <button onClick={() => navigate('/login')} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <span className="text-white font-bold">เข้าสู่ระบบเจ้าหน้าที่</span>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-500 space-y-0.5">
            <p className="font-bold text-gray-700">ใช้ Email + Password จาก Supabase Auth</p>
            <p>ต้องผูกบัญชีไว้ใน profiles.auth_user_id ก่อนเข้าใช้งาน</p>
          </div>
          {err && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex gap-2 items-center">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span className="text-red-600 text-sm">{err}</span>
            </div>
          )}
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setErr(null) }}
              placeholder="admin@example.com"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-500"
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1.5">รหัสผ่าน</label>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setErr(null) }}
              placeholder="รหัสผ่าน"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-500"
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
          </div>
          <button
            onClick={handleLogin}
            disabled={loading}
            className={`w-full bg-gray-800 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 ${loading ? 'opacity-70' : 'hover:bg-gray-700'} transition-colors`}
          >
            {loading ? <><RefreshCw className="w-4 h-4 animate-spin" />กำลังเข้าสู่ระบบ...</> : 'เข้าสู่ระบบ'}
          </button>
        </div>
      </div>
    </div>
  )
}
