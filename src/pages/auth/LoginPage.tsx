import React, { useState } from 'react';

export type AppRole = 'farmer' | 'leader' | 'inspector' | 'admin';

export interface AuthUser {
  id: string; name: string; role: AppRole; code: string; phone: string;
}

const MOCK_USERS: (AuthUser & { password: string })[] = [
  { id:'f1', name:'สมชาย ใจดี',      role:'farmer',    code:'KF001', phone:'0812345678', password:'1234' },
  { id:'f2', name:'สมหญิง รักษ์ไทย', role:'farmer',    code:'KF002', phone:'0898765432', password:'1234' },
  { id:'l1', name:'ประสิทธิ์ นำทาง', role:'leader',    code:'LD001', phone:'0844441111', password:'5678' },
  { id:'i1', name:'วิภา ตรวจการ',    role:'inspector', code:'IN001', phone:'0855552222', password:'9012' },
  { id:'a1', name:'ผู้ดูแลระบบ',      role:'admin',     code:'AD001', phone:'0866663333', password:'admin' },
];

const ROLE_CFG: Record<AppRole,{label:string;icon:string;bg:string;desc:string;hint:string}> = {
  farmer:    {label:'เกษตรกร',          icon:'🌾',bg:'bg-green-600',  desc:'บันทึกการปลูก ขาย และสิทธิ์ต่างๆ',   hint:'รหัส: KF001  รหัสผ่าน: 1234'},
  leader:    {label:'หัวหน้ากลุ่ม',     icon:'👑',bg:'bg-yellow-500',desc:'ยืนยันแปลงและดูแลสมาชิกกลุ่ม',        hint:'รหัส: LD001  รหัสผ่าน: 5678'},
  inspector: {label:'เจ้าหน้าที่ตรวจสอบ',icon:'🔍',bg:'bg-blue-600', desc:'ตรวจสอบแปลงและออกผลการรับรอง',        hint:'รหัส: IN001  รหัสผ่าน: 9012'},
  admin:     {label:'ผู้ดูแลระบบ',       icon:'⚙️',bg:'bg-purple-700',desc:'บริหารจัดการข้อมูลและราคาทั้งหมด',   hint:'รหัส: AD001  รหัสผ่าน: admin'},
};

export default function LoginPage({ onLogin }: { onLogin:(u:AuthUser)=>void }) {
  const [sel, setSel] = useState<AppRole|null>(null);
  const [code, setCode] = useState('');
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const doLogin = () => {
    if(!sel||!code||!pw){setErr('กรุณากรอกข้อมูลให้ครบ');return;}
    setLoading(true); setErr('');
    setTimeout(()=>{
      const u = MOCK_USERS.find(u=>u.role===sel&&u.code===code.toUpperCase()&&u.password===pw);
      if(u){const{password:_,...au}=u;onLogin(au);}
      else{setErr('รหัสผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');setLoading(false);}
    },700);
  };

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
            <p className="text-white/80 text-sm text-center font-medium mb-2">เลือกประเภทผู้ใช้งาน</p>
            {(Object.entries(ROLE_CFG) as [AppRole,typeof ROLE_CFG['farmer']][]).map(([role,cfg])=>(
              <button key={role} onClick={()=>{setSel(role);setCode('');setPw('');setErr('');}}
                className="w-full bg-white/10 backdrop-blur hover:bg-white/20 border border-white/20 rounded-2xl p-4 flex items-center gap-4 transition-all active:scale-98 group">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-110 transition-transform">{cfg.icon}</div>
                <div className="text-left flex-1">
                  <div className="text-white font-bold">{cfg.label}</div>
                  <div className="text-green-200 text-xs mt-0.5">{cfg.desc}</div>
                </div>
                <span className="text-white/40 text-xl">›</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className={`${ROLE_CFG[sel].bg} px-6 py-5 flex items-center gap-3`}>
              <button onClick={()=>{setSel(null);setErr('');}} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-lg hover:bg-white/30 transition-colors flex-shrink-0">‹</button>
              <div className="text-2xl">{ROLE_CFG[sel].icon}</div>
              <div>
                <div className="text-white font-bold">{ROLE_CFG[sel].label}</div>
                <div className="text-white/70 text-xs">{ROLE_CFG[sel].desc}</div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs text-amber-700 font-semibold">💡 ข้อมูลทดสอบ</p>
                <p className="text-xs text-amber-600 mt-0.5 font-mono">{ROLE_CFG[sel].hint}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">รหัสผู้ใช้</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{ROLE_CFG[sel].icon}</span>
                  <input type="text" value={code} onChange={e=>{setCode(e.target.value);setErr('');}}
                    placeholder={sel==='farmer'?'KF001':sel==='leader'?'LD001':sel==='inspector'?'IN001':'AD001'}
                    className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-400 uppercase"
                    onKeyDown={e=>e.key==='Enter'&&doLogin()}/>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">รหัสผ่าน</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔒</span>
                  <input type={showPw?'text':'password'} value={pw} onChange={e=>{setPw(e.target.value);setErr('');}}
                    placeholder="รหัสผ่าน"
                    className="w-full pl-9 pr-10 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-400"
                    onKeyDown={e=>e.key==='Enter'&&doLogin()}/>
                  <button onClick={()=>setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{showPw?'🙈':'👁️'}</button>
                </div>
              </div>

              {err && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 flex items-center gap-2">
                  <span className="text-red-500">⚠️</span>
                  <span className="text-red-600 text-xs font-medium">{err}</span>
                </div>
              )}

              <button onClick={doLogin} disabled={loading}
                className={`w-full ${ROLE_CFG[sel].bg} text-white py-3.5 rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 ${loading?'opacity-70':'active:scale-98'}`}>
                {loading?<><span className="animate-spin">⟳</span><span>กำลังเข้าสู่ระบบ...</span></>:<><span>เข้าสู่ระบบ</span><span>{ROLE_CFG[sel].icon}</span></>}
              </button>

              <p className="text-center text-xs text-gray-400">
                ยังไม่มีบัญชี?{' '}
                <button className="text-green-600 font-semibold">ลงทะเบียนเกษตรกร</button>
              </p>
            </div>
          </div>
        )}
      </div>
      <p className="text-green-300/50 text-xs mt-8">K-Farm v1.0 • บุรีรัมย์</p>
    </div>
  );
}
