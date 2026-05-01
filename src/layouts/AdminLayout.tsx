import React, { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../routes/AuthContext'
import { fetchPendingRegistrations } from '../lib/db'

const NAV = [
  { to: '/admin',         icon: '📊', label: 'แดชบอร์ด' },
  { to: '/admin/farmers', icon: '👥', label: 'อนุมัติสมาชิก', pendingBadge: true },
  { to: '/admin/map',     icon: '🗺️', label: 'แผนที่แปลง' },
  { to: '/admin/prices',  icon: '💰', label: 'จัดการราคา' },
]

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    fetchPendingRegistrations().then(res => {
      setPendingCount(res.data?.length ?? 0)
    })
  }, [])

  const handleLogout = () => { logout(); navigate('/login', { replace: true }) }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {open && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setOpen(false)} />}

      <aside className={`fixed left-0 top-0 h-full w-64 bg-gradient-to-b from-green-900 to-green-800 text-white z-50 flex flex-col
        transition-transform duration-300 lg:static lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-5 border-b border-green-700/60">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-yellow-400 flex items-center justify-center text-xl">🌽</div>
            <div>
              <div className="font-bold text-lg">K-Farm</div>
              <div className="text-green-300 text-xs">ระบบโรงงาน / แอดมิน</div>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-green-700/50 rounded-xl p-2.5">
            <div className="w-9 h-9 rounded-full bg-yellow-400 flex items-center justify-center text-green-900 font-bold flex-shrink-0">
              {user?.name?.charAt(0) ?? 'A'}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">{user?.name}</div>
              <div className="text-green-300 text-xs">{user?.code}</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(item => (
            <NavLink key={item.to} to={item.to} end={item.to === '/admin'}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all relative
                ${isActive ? 'bg-yellow-400 text-green-900 font-semibold shadow-md' : 'text-green-100 hover:bg-green-700/60'}`
              }>
              <span className="text-xl">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.pendingBadge && pendingCount > 0 && (
                <span className="w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {pendingCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-green-700/60">
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-red-300 hover:bg-red-900/30 transition-colors">
            <span className="text-lg">🚪</span>
            <span className="text-sm font-medium">ออกจากระบบ</span>
          </button>
          <p className="text-green-500 text-[11px] text-center mt-2">K-Farm v2.0 • บุรีรัมย์</p>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-30 shadow-sm">
          <button onClick={() => setOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="space-y-1.5">
              <div className="w-5 h-0.5 bg-gray-600 rounded" />
              <div className="w-5 h-0.5 bg-gray-600 rounded" />
              <div className="w-5 h-0.5 bg-gray-600 rounded" />
            </div>
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-gray-800">ระบบบริหารจัดการ K-Farm</h1>
            <p className="text-gray-400 text-xs">โรงงานแปรรูปข้าวโพดอาหารสัตว์ • บุรีรัมย์</p>
          </div>
          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <button onClick={() => navigate('/admin/farmers')}
                className="flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-1.5 rounded-xl font-semibold hover:bg-red-100 transition-colors">
                <span className="w-4 h-4 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold">{pendingCount}</span>
                รออนุมัติ
              </button>
            )}
            <button onClick={handleLogout} title="ออกจากระบบ"
              className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold hover:bg-green-200 transition-colors">
              {user?.name?.charAt(0) ?? 'A'}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
