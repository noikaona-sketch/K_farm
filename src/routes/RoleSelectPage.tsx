import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { getAccessibleRoles } from '../lib/roles'
import logoImage from '../assets/logo.png'

export default function RoleSelectPage() {
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()

  if (!user) {
    navigate('/login', { replace: true })
    return null
  }

  const canInspect = Boolean((user as unknown as Record<string,unknown>).canInspect)
  const destinations = getAccessibleRoles(user.role, canInspect)

  // ถ้ามีแค่ 1 ตัวเลือก → redirect ทันทีไม่ต้องรอ
  if (destinations.length <= 1) {
    const path = destinations[0]?.path ?? '/farmer'
    navigate(path, { replace: true })
    return null
  }

  const handleSelect = (path: string) => {
    navigate(path, { replace: true })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-800 via-emerald-700 to-emerald-600 flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3 overflow-hidden shadow-xl">
          <img src={logoImage} className="w-full h-full object-cover" />
        </div>
        <p className="text-emerald-100 text-sm">สวัสดี คุณ{user.name}</p>
        <p className="text-emerald-200 text-xs mt-0.5">คุณมีสิทธิ์เข้าได้หลายส่วน กรุณาเลือก</p>
        <p className="text-emerald-300/60 text-[10px] mt-0.5">admin กำหนดสิทธิ์ในระบบหลังบ้าน</p>
      </div>

      {/* Choice cards */}
      <div className="w-full max-w-sm space-y-3">
        {destinations.map(d => (
          <button
            key={d.key}
            onClick={() => handleSelect(d.path)}
            className="w-full bg-white rounded-2xl p-5 flex items-center gap-4 shadow-xl hover:bg-emerald-50 active:scale-[.98] transition-all text-left"
          >
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center text-3xl flex-shrink-0">
              {d.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-gray-900 text-base">{d.label}</div>
              <div className="text-gray-500 text-xs mt-0.5 leading-relaxed">{d.sublabel}</div>
              <div className={`mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block
                ${d.platform === 'line'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-gray-100 text-gray-600'}`}>
                {d.platform === 'line' ? '📱 LINE Mini App' : '💻 Web Browser'}
              </div>
            </div>
            <div className="text-gray-300 text-xl flex-shrink-0">›</div>
          </button>
        ))}
      </div>

      <button
        onClick={() => { import('./AuthContext').then(m => {}); navigate('/login', { replace: true }) }}
        className="mt-8 text-emerald-200/60 text-sm hover:text-emerald-200 transition-colors"
      >
        ออกจากระบบ
      </button>
    </div>
  )
}
