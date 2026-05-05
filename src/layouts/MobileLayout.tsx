import React from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../routes/AuthContext'
import { BASE_TYPE_LABEL, ROLE_LABEL } from '../lib/roles'
import logoImage from '../assets/logo.png'

export default function MobileLayout() {
  const { user, logout, appTabs } = useAuth()
  const navigate = useNavigate()
  const role = user?.role ?? 'member'
  const tabs = appTabs.length > 0 ? appTabs : []
  const label = user?.baseType ? BASE_TYPE_LABEL[user.baseType] : ROLE_LABEL[role]

  const handleLogout = () => { logout(); navigate('/login', { replace: true }) }

  return (
    <div className="max-w-[430px] mx-auto bg-gray-50 min-h-screen font-sans flex flex-col">
      {/* Header */}
      <header className="bg-emerald-600 text-white px-5 py-3.5 flex items-center justify-between sticky top-0 z-40 shadow-md">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 bg-white rounded-2xl flex items-center justify-center overflow-hidden shadow flex-shrink-0">
            <img src={logoImage} alt="Logo" className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-base leading-tight truncate">ครอบครัวก้าวหน้า</div>
            <div className="text-[10px] text-emerald-100 uppercase tracking-widest">
              {label}{user?.grade ? ` • เกรด ${user.grade}` : ''}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-semibold leading-tight truncate max-w-[100px]">
              {user?.name?.split(' ')[0]}
            </div>
            <div className="text-[10px] text-emerald-200">{user?.code ?? ''}</div>
          </div>
          <button onClick={handleLogout}
            className="w-9 h-9 rounded-full bg-white/20 border border-white/30 flex items-center justify-center font-bold text-sm hover:bg-white/30 transition-colors">
            {user?.name?.charAt(0) ?? '?'}
          </button>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      {/* Bottom nav — rendered from baseType + capabilities */}
      {tabs.length > 0 && (
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-gray-200 z-40 shadow-lg safe-area-inset-bottom">
          <div className={`grid h-16`}
            style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
            {tabs.map(tab => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center gap-0.5 relative transition-all
                  ${isActive ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`
                }>
                {({ isActive }) => (
                  <>
                    <span className={`text-xl leading-none transition-transform ${isActive ? 'scale-110' : ''}`}>
                      {tab.icon}
                    </span>
                    <span className={`text-[10px] font-medium ${isActive ? 'text-emerald-600' : ''}`}>
                      {tab.label}
                    </span>
                    {isActive && (
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-emerald-600 rounded-t-full" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  )
}
