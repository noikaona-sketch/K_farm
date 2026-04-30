import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, type AppRole } from './AuthContext'
import { RefreshCw, AlertCircle } from 'lucide-react'
import logoImage from '../assets/logo.png'

const MOCK_USERS = [
  { id:'f1', name:'สมชาย ใจดี',        role:'farmer'    as AppRole, code:'KF001', phone:'0812345678', password:'1234' },
  { id:'f2', name:'สมหญิง รักษ์ไทย',   role:'farmer'    as AppRole, code:'KF002', phone:'0898765432', password:'1234' },
  { id:'l1', name:'ประสิทธิ์ นำทาง',   role:'leader'    as AppRole, code:'LD001', phone:'0844441111', password:'5678' },
  { id:'i1', name:'วิภา ตรวจการ',       role:'inspector' as AppRole, code:'IN001', phone:'0855552222', password:'9012' },
  { id:'a1', name:'ผู้ดูแลระบบ',         role:'admin'     as AppRole, code:'AD001', phone:'0866663333', password:'admin' },
]

const ROLE_HOME: Record<AppRole, string> = {
  farmer:'/farmer', leader:'/leader', inspector:'/inspector', admin:'/admin'
}

const ROLES = [
  { key:'farmer'    as AppRole, icon:'🌾', label:'เกษตรกร',              desc:'บันทึกการปลูก ขาย และสิทธิ์ต่างๆ',      hint:'KF001 / 1234' },
  { key:'leader'    as AppRole, icon:'👑', label:'หัวหน้ากลุ่ม',          desc:'ยืนยันแปลงและดูแลสมาชิกกลุ่ม',           hint:'LD001 / 5678' },
  { key:'inspector' as AppRole, icon:'🔍', label:'เจ้าหน้าที่ตรวจสอบ',    desc:'ตรวจสอบแปลงและออกผลการรับรอง',           hint:'IN001 / 9012' },
  { key:'admin'     as AppRole, icon:'⚙️', label:'ผู้ดูแลระบบ (โรงงาน)', desc:'บริหารจัดการราคาและข้อมูลทั้งหมด',        hint:'AD001 / admin' },
]

const BG: Record<AppRole, string> = {
  farmer:'bg-emerald-600', leader:'bg-amber-500', inspector:'bg-blue-600', admin:'bg-purple-700'
}

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [sel, setSel] = useState<AppRole|null>(null)
  const [code, setCode] = useState('')
  const [pw, setPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const cfg = ROLES.find(r => r.key === sel)

  const doLogin = () => {
    if (!sel || !code || !pw) { setErr('กรุณากรอกข้อมูลให้ครบ'); return }
    setLoading(true); setErr('')
    setTimeout(() => {
      const u = MOCK_USERS.find(u => u.role===sel && u.code===code.toUpperCase() && u.password===pw)
      if (u) { const { password:_, ...au } = u; login(au); navigate(ROLE_HOME[u.role], { replace:true }) }
      else { setErr('รหัสผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'); setLoading(false) }
    }, 700)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-800 via-emerald-700 to-emerald-600 flex flex-col items-center justify-center p-5">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-2xl overflow-hidden">
          <img src={logoImage} alt="Logo" className="w-full h-full object-cover" />
        </div>
        <h1 className="text-2xl font-bold text-white">ครอบครัวก้าวหน้า</h1>
        <p className="text-emerald-200 text-sm mt-1">SMART FARMER SYSTEM</p>
      </div>

      <div className="w-full max-w-sm">
        {!sel ? (
          <div className="space-y-3">
            <p className="text-white/80 text-sm text-center font-medium mb-4">เลือกประเภทผู้ใช้งาน</p>
            {ROLES.map(r => (
              <button key={r.key} onClick={() => { setSel(r.key); setCode(''); setPw(''); setErr('') }}
                className="w-full bg-white/10 backdrop-blur hover:bg-white/20 border border-white/20 rounded-2xl p-4 flex items-center gap-4 transition-all active:scale-[.98] group">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-110 transition-transform">{r.icon}</div>
                <div className="text-left flex-1">
                  <div className="text-white font-bold">{r.label}</div>
                  <div className="text-emerald-200 text-xs mt-0.5">{r.desc}</div>
                </div>
                <span className="text-white/40 text-xl">›</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className={`${BG[sel]} px-6 py-5 flex items-center gap-3`}>
              <button onClick={() => { setSel(null); setErr('') }}
                className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-lg hover:bg-white/30 flex-shrink-0">‹</button>
              <span className="text-2xl">{cfg!.icon}</span>
              <div>
                <div className="text-white font-bold">{cfg!.label}</div>
                <div className="text-white/70 text-xs">{cfg!.desc}</div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs text-amber-700 font-semibold">💡 ข้อมูลทดสอบ</p>
                <p className="text-xs text-amber-600 mt-0.5 font-mono">{cfg!.hint}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">รหัสผู้ใช้</label>
                <input type="text" value={code} onChange={e => { setCode(e.target.value); setErr('') }}
                  placeholder={cfg!.hint.split(' / ')[0]}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors uppercase"
                  onKeyDown={e => e.key==='Enter' && doLogin()} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">รหัสผ่าน</label>
                <div className="relative">
                  <input type={showPw?'text':'password'} value={pw} onChange={e => { setPw(e.target.value); setErr('') }}
                    placeholder="รหัสผ่าน"
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors pr-10"
                    onKeyDown={e => e.key==='Enter' && doLogin()} />
                  <button onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{showPw?'🙈':'👁️'}</button>
                </div>
              </div>
              {err && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <span className="text-red-600 text-sm">{err}</span>
                </div>
              )}
              <button onClick={doLogin} disabled={loading}
                className={`w-full ${BG[sel]} text-white py-4 rounded-xl font-bold text-base shadow-md flex items-center justify-center gap-2 transition-all ${loading?'opacity-70':'hover:opacity-90 active:scale-[.98]'}`}>
                {loading ? <><RefreshCw className="w-5 h-5 animate-spin" /><span>กำลังเข้าสู่ระบบ...</span></> : <span>เข้าสู่ระบบ {cfg!.icon}</span>}
              </button>
            </div>
          </div>
        )}
      </div>
      <p className="text-emerald-300/50 text-xs mt-8">K-Farm v2.0 • บุรีรัมย์</p>
    </div>
  )
}