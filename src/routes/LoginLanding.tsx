import React from 'react'
import { useNavigate } from 'react-router-dom'
import logoImage from '../assets/logo.png'

export default function LoginLanding() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-800 via-emerald-700 to-lime-600 flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="text-center mb-10">
        <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-2xl overflow-hidden">
          <img src={logoImage} alt="Logo" className="w-full h-full object-cover" />
        </div>
        <h1 className="text-3xl font-bold text-white">ครอบครัวก้าวหน้า</h1>
        <p className="text-emerald-200 mt-1 text-sm tracking-widest uppercase">Smart Farmer System</p>
      </div>

      <div className="w-full max-w-sm space-y-4">
        {/* หมายเหตุ */}
        <div className="bg-amber-400/20 border border-amber-300/40 rounded-2xl px-4 py-3 text-center">
          <p className="text-amber-100 text-sm">
            หากยังไม่เคยสมัคร กรุณาลงทะเบียนก่อน
          </p>
        </div>

        {/* ลงทะเบียน (primary) */}
        <button
          onClick={() => navigate('/register')}
          className="w-full bg-white text-emerald-700 py-5 rounded-2xl font-bold text-lg shadow-xl hover:bg-emerald-50 active:scale-[.98] transition-all flex items-center justify-center gap-3"
        >
          <span className="text-2xl">📋</span>
          <div className="text-left">
            <div className="font-bold">สมัครสมาชิก / ลงทะเบียน</div>
            <div className="text-xs text-emerald-500 font-normal">สำหรับสมาชิกใหม่</div>
          </div>
        </button>

        {/* เข้าสู่ระบบ (secondary) */}
        <button
          onClick={() => navigate('/signin')}
          className="w-full bg-emerald-600/80 border-2 border-white/30 text-white py-5 rounded-2xl font-bold text-lg hover:bg-emerald-500/80 active:scale-[.98] transition-all flex items-center justify-center gap-3 backdrop-blur"
        >
          <span className="text-2xl">🔑</span>
          <div className="text-left">
            <div className="font-bold">เข้าสู่ระบบ</div>
            <div className="text-xs text-emerald-100 font-normal">สมาชิกที่ลงทะเบียนแล้ว</div>
          </div>
        </button>

        {/* Admin entry */}
        <button
          onClick={() => navigate('/admin-login')}
          className="w-full text-emerald-200/60 text-sm py-2 hover:text-emerald-200 transition-colors"
        >
          เข้าระบบสำหรับเจ้าหน้าที่ →
        </button>
      </div>

      <p className="text-emerald-300/40 text-xs mt-10">K-Farm v2.0 • บุรีรัมย์</p>
    </div>
  )
}
