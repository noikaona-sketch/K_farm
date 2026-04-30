import React from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { Home, ClipboardList, Upload, CheckSquare, Search } from 'lucide-react'
import { useAuth } from '../routes/AuthContext'
import logoImage from '../assets/logo.png'

type MobileRole = 'farmer' | 'leader' | 'inspector'

const NAV = {
  farmer: [
    { to: '/farmer',          Icon: Home,         label: 'หน้าแรก' },
    { to: '/farmer/planting', Icon: ClipboardList, label: 'สถานะ' },
    { to: '/farmer/register', Icon: Upload,        label: 'ส่งงาน' },
  ],
  leader: [
    { to: '/leader',         Icon: Home,        label: 'หน้าแรก' },
    { to: '/leader/confirm', Icon: CheckSquare, label: 'อนุมัติ' },
  ],
  inspector: [
    { to: '/inspector',     Icon: Home,   label: 'หน้าแรก' },
    { to: '/inspector/form/ins1', Icon: Search, label: 'ตรวจสอบ' },
  ],
}

const ROLE_TITLE: Record<MobileRole, string> = {
  farmer: 'SMART FARMER SYSTEM',
  leader: 'LEADER DASHBOARD',
  inspector: 'INSPECTOR SYSTEM',
}

export default function MobileLayout({ role }: { role: MobileRole }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const navItems = NAV[role]

  return (
    <div className="max-w-[430px] mx-auto bg-gray-50 min-h-screen font-sans">
      {/* Header */}
      <div className="bg-emerald-600 text-white px-5 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center overflow-hidden shadow-md">
            <img src={logoImage} alt="Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="font-bold text-lg leading-tight">ครอบครัวก้าวหน้า</div>
            <div className="text-xs opacity-80 tracking-wide">{ROLE_TITLE[role]}</div>
          </div>
        </div>
        <button
          onClick={() => { logout(); navigate('/login', { replace: true }) }}
          className="bg-white/20 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-white/30 transition-colors"
        >
          {user?.name?.split(' ')[0] ?? 'ออก'}
        </button>
      </div>

      {/* Content */}
      <main className="pb-24">
        <Outlet />
      </main>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-gray-200 px-5 py-3 z-40 shadow-lg">
        <div className="flex items-center justify-around">
          {navItems.map(({ to, Icon, label }) => (
            <NavLink key={to} to={to} end={to.split('/').length <= 2}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 transition-colors ${isActive ? 'text-emerald-600' : 'text-gray-400'}`
              }>
              {({ isActive }) => (
                <>
                  <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
                  <span className={`text-xs ${isActive ? 'font-semibold' : ''}`}>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  )
}