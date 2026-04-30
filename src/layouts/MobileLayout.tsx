import React from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../routes/AuthContext'

type MobileRole = 'farmer' | 'leader' | 'inspector'

const NAV: Record<MobileRole, { to: string; icon: string; label: string }[]> = {
  farmer: [
    { to: '/farmer',          icon: '🏠', label: 'หน้าหลัก' },
    { to: '/farmer/farms',    icon: '🌿', label: 'แปลงของฉัน' },
    { to: '/farmer/planting', icon: '🌽', label: 'บันทึก' },
    { to: '/farmer/prices',   icon: '💰', label: 'ราคา' },
    { to: '/farmer/tier',     icon: '⭐', label: 'ระดับ' },
  ],
  leader: [
    { to: '/leader',         icon: '📊', label: 'ภาพรวม' },
    { to: '/leader/confirm', icon: '✅', label: 'ยืนยันแปลง' },
  ],
  inspector: [
    { to: '/inspector',      icon: '📋', label: 'งานของฉัน' },
  ],
}

const ROLE_TITLE: Record<MobileRole, string> = {
  farmer: 'ระบบเกษตรกร',
  leader: 'หัวหน้ากลุ่ม',
  inspector: 'ระบบตรวจสอบ',
}

export default function MobileLayout({ role }: { role: MobileRole }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const navItems = NAV[role]

  const handleLogout = () => { logout(); navigate('/login', { replace: true }) }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto relative shadow-xl">
      {/* Header */}
      <header className="bg-gradient-to-r from-green-700 to-green-600 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-md">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">🌽</span>
          <div>
            <div className="font-bold text-base leading-tight">K-Farm</div>
            <div className="text-green-200 text-[11px]">{ROLE_TITLE[role]}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className="text-xs font-semibold leading-tight">{user?.name}</div>
            <div className="text-[10px] text-green-200">{user?.code}</div>
          </div>
          <button onClick={handleLogout} title="ออกจากระบบ"
            className="w-9 h-9 rounded-full bg-white/20 border border-white/30 flex items-center justify-center font-bold text-sm hover:bg-white/30 transition-colors">
            {user?.name?.charAt(0) ?? '?'}
          </button>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-200 shadow-lg z-40">
        <div className="grid h-16" style={{ gridTemplateColumns: `repeat(${navItems.length}, 1fr)` }}>
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} end={item.to.split('/').length <= 2}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 relative transition-all ${isActive ? 'text-green-600' : 'text-gray-400 hover:text-gray-600'}`
              }>
              {({ isActive }) => (
                <>
                  <span className={`text-xl transition-transform ${isActive ? 'scale-110' : ''}`}>{item.icon}</span>
                  <span className={`text-[10px] font-medium ${isActive ? 'text-green-600' : ''}`}>{item.label}</span>
                  {isActive && <div className="absolute bottom-0 w-8 h-0.5 bg-green-600 rounded-t-full" />}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
