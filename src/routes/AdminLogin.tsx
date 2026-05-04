import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, RefreshCw, AlertCircle } from 'lucide-react'
import { useAuth } from './AuthContext'
import { getAccessibleRoles } from '../lib/roles'
import logoImage from '../assets/logo.png'

// Mock admin credentials — in production replace with Supabase auth
const STAFF_ACCOUNTS = [
  { code: 'AD001', password: 'admin', name: 'ผู้ดูแลระบบ',      role: 'admin'       as const },
  { code: 'LD001', password: '5678',  name: 'ประสิทธิ์ นำทาง', role: 'leader'      as const },
  { code: 'IN001', password: '9012',  name: 'วิภา ตรวจการ',     role: 'inspector'   as const },
  { code: 'FS001', password: '1234',  name: 'สมศักดิ์ ภาคสนาม', role: 'field_staff' as const },
]

export default function AdminLogin() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [code, setCode] = useState('')
  const [pw, setPw] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const handleLogin = () => {
    setLoading(true); setErr(null)
    setTimeout(() => {
      const acc = STAFF_ACCOUNTS.find(a => a.code === code.toUpperCase() && a.password === pw)
      if (acc) {
        const authUser = {
          id: acc.code,
          profileId: acc.code,
          name: acc.name,
          role: acc.role,
          code: acc.code,
          phone: '',
          idCard: '',
          registrationStatus: 'approved' as const,
        }
        login(authUser)
        const dests = getAccessibleRoles(acc.role, false)
        navigate(dests[0]?.path ?? '/field', { replace: true })
      } else {
        setErr('รหัสผู้ใช้หรือรหัสผ่านไม่ถูกต้อง')
        setLoading(false)
      }
    }, 600)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-800 to-gray-900 flex flex-col items-center justify-center p-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3 overflow-hidden shadow-xl">
          <img src={logoImage} className="w-full h-full object-cover" />
        </div>
        <h1 className="text-xl font-bold text-white">ระบบสำหรับเจ้าหน้าที่</h1>
        <p className="text-gray-400 text-sm mt-0.5">Admin / Leader / Inspector</p>
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
            <p>Admin: AD001 / admin</p>
            <p>Leader: LD001 / 5678</p>
            <p>Inspector: IN001 / 9012</p>
            <p>ทีมภาคสนาม: FS001 / 1234</p>
          </div>
          {err && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex gap-2 items-center">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span className="text-red-600 text-sm">{err}</span>
            </div>
          )}
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1.5">รหัสผู้ใช้</label>
            <input value={code} onChange={e => { setCode(e.target.value); setErr(null) }}
              placeholder="AD001 / LD001 / IN001"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-500 uppercase"
              onKeyDown={e => e.key === 'Enter' && handleLogin()} />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1.5">รหัสผ่าน</label>
            <input type="password" value={pw} onChange={e => { setPw(e.target.value); setErr(null) }}
              placeholder="รหัสผ่าน"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-500"
              onKeyDown={e => e.key === 'Enter' && handleLogin()} />
          </div>
          <button onClick={handleLogin} disabled={loading}
            className={`w-full bg-gray-800 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 ${loading ? 'opacity-70' : 'hover:bg-gray-700'} transition-colors`}>
            {loading ? <><RefreshCw className="w-4 h-4 animate-spin" />กำลังเข้าสู่ระบบ...</> : 'เข้าสู่ระบบ'}
          </button>
        </div>
      </div>
    </div>
  )
}
