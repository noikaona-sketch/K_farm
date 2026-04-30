import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, type AppRole } from './AuthContext'

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

const ROLES: { key: AppRole; icon: string; label: string; desc: string; bg: string; hint: string }[] = [
  { key:'farmer',    icon:'🌾', label:'เกษตรกร',           desc:'บันทึกการปลูก ขาย และสิทธิ์ต่างๆ',    bg:'bg-green-600',  hint:'KF001 / 1234' },
  { key:'leader',    icon:'👑', label:'หัวหน้ากลุ่ม',      desc:'ยืนยันแปลงและดูแลสมาชิกกลุ่ม',         bg:'bg-yellow-500', hint:'LD001 / 5678' },
  { key:'inspector', icon:'🔍', label:'เจ้าหน้าที่ตรวจสอบ', desc:'ตรวจสอบแปลงและออกผลการรับรอง',         bg:'bg-blue-600',   hint:'IN001 / 9012' },
  { key:'admin',     icon:'⚙️', label:'ผู้ดูแลระบบ (โรงงาน)', desc:'บริหารราคา แผนที่ และข้อมูลทั้งหมด', bg:'bg-purple-700', hint:'AD001 / admin' },
]

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
      if (u) {
        const { password: _, ...authUser } = u
        login(authUser)
        navigate(ROLE_HOME[u.role], { replace: true })
      } else {
        setErr('รหัสผู้ใช้หรือรหัสผ่านไม่ถูกต้อง')
        setLoading(false)
      }
    }, 700)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-800 via-green-700 to-lime-600 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-3xl flex items-center justify-center text-5xl mx-auto mb-3 shadow-xl">🌽</div>
        <h1 className="text-3xl font-bold text-white">K-Farm</h1>
        <p className="text-green-200 text-sm mt-1">ระบบจัดการข้าวโพดอาหารสัตว์</p>
      </div>

      <div className="w-full max-w-sm">
        {!sel ? (
          <div className="space-y-3">
            <p className="text-white/80 text-sm text-center font-medium mb-3">เลือกประเภทผู้ใช้งาน</p>
            {ROLES.map(r => (
              <button key={r.key} onClick={() => { setSel(r.key); setCode(''); setPw(''); setErr('') }}
                className="w-full bg-white/10 backdrop-blur hover:bg-white/20 border border-white/20 rounded-2xl p-4 flex items-center gap-4 transition-all active:scale-[.98] group">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-110 transition-transform">{r.icon}</div>
                <div className="text-left flex-1">
                  <div className="text-white font-bold">{r.label}</div>
                  <div className="text-green-200 text-xs mt-0.5">{r.desc}</div>
                </div>
                <span className="text-white/40 text-xl">›</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className={`${cfg!.bg} px-6 py-5 flex items-center gap-3`}>
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
                <label className="block text-xs font-bold text-gray-600 mb-1.5">รหัสผู้ใช้</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{cfg!.icon}</span>
                  <input type="text" value={code} onChange={e=>{setCode(e.target.value);setErr('')}}
                    placeholder={cfg!.hint.split(' / ')[0]}
                    className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-400 uppercase"
                    onKeyDown={e=>e.key==='Enter'&&doLogin()} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">รหัสผ่าน</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔒</span>
                  <input type={showPw?'text':'password'} value={pw} onChange={e=>{setPw(e.target.value);setErr('')}}
                    placeholder="รหัสผ่าน"
                    className="w-full pl-9 pr-10 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-400"
                    onKeyDown={e=>e.key==='Enter'&&doLogin()} />
                  <button onClick={()=>setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{showPw?'🙈':'👁️'}</button>
                </div>
              </div>

              {err && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 flex items-center gap-2">
                  <span>⚠️</span><span className="text-red-600 text-xs font-medium">{err}</span>
                </div>
              )}

              <button onClick={doLogin} disabled={loading}
                className={`w-full ${cfg!.bg} text-white py-3.5 rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all ${loading?'opacity-70':'active:scale-[.98]'}`}>
                {loading ? <><span className="animate-spin inline-block">⟳</span><span>กำลังเข้าสู่ระบบ...</span></> : <><span>เข้าสู่ระบบ</span><span>{cfg!.icon}</span></>}
              </button>
            </div>
          </div>
        )}
      </div>
      <p className="text-green-300/50 text-xs mt-8">K-Farm v2.0 • บุรีรัมย์</p>
    </div>
  )
}
