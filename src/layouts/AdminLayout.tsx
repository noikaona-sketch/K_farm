import React, { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../routes/AuthContext'
import { atLeast } from '../lib/roles'
import { Menu, X, LogOut, ChevronRight } from 'lucide-react'

const MENUS = [
  { to: '/admin',                label: 'Dashboard',                    icon: '📊' },
  { to: '/admin/members',        label: 'สมาชิก / อนุมัติสมาชิก',       icon: '👥' },
  { to: '/admin/member-import',  label: 'Import สมาชิกเก่า Excel',       icon: '📥' },
  { to: '/admin/roles',          label: 'กำหนดสิทธิ์ / Role / Grade',    icon: '🔐' },
  { to: '/admin/seed-suppliers', label: 'Supplier เมล็ดพันธุ์',          icon: '🏪' },
  { to: '/admin/seed-varieties', label: 'พันธุ์เมล็ดพันธุ์',             icon: '🌾' },
  { to: '/admin/seed-stock',     label: 'รับเข้า Stock เมล็ดพันธุ์',    icon: '📦' },
  { to: '/admin/seed-sales',     label: 'ขายเมล็ดพันธุ์',               icon: '🛒' },
  { to: '/admin/service-providers', label: 'ผู้ให้บริการ รถเกี่ยว/รถไถ/รถขนส่ง', icon: '🚜' },
  { to: '/admin/field-inspections', label: 'ตรวจแปลง',                  icon: '🔍' },
  { to: '/admin/reports',        label: 'รายงาน',                        icon: '📈' },
]

/** Guard: admin only */
function useAdminGuard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  React.useEffect(() => {
    if (!user || !atLeast(user.role ?? 'member', 'admin')) {
      navigate('/login', { replace: true })
    }
  }, [user, navigate])
}

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Guard — redirect if not admin
  useAdminGuard()

  const handleLogout = () => { logout(); navigate('/login', { replace: true }) }

  const currentMenu = MENUS.find(m =>
    m.to === '/admin' ? pathname === '/admin' : pathname.startsWith(m.to)
  )

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-gray-900 text-white flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="px-5 py-5 border-b border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center text-xl font-bold">K</div>
            <div>
              <div className="font-bold text-base">K-Farm Admin</div>
              <div className="text-gray-400 text-xs">ระบบบริหารจัดการ</div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 bg-gray-800 rounded-xl px-3 py-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-sm flex-shrink-0">
              {user?.name?.charAt(0) ?? 'A'}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">{user?.name ?? 'Admin'}</div>
              <div className="text-gray-400 text-xs">{user?.code ?? ''}</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-3">
          {MENUS.map(m => {
            const isActive = m.to === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(m.to)
            return (
              <Link
                key={m.to}
                to={m.to}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 text-sm transition-all
                  ${isActive
                    ? 'bg-emerald-600 text-white font-semibold shadow-md'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'}
                `}
              >
                <span className="text-base flex-shrink-0">{m.icon}</span>
                <span className="truncate">{m.label}</span>
                {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto flex-shrink-0 opacity-60" />}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-gray-700 flex-shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-400 hover:bg-red-900/30 hover:text-red-300 transition-colors text-sm"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center gap-3 px-4 flex-shrink-0 shadow-sm">
          {/* Hamburger (mobile) */}
          <button
            onClick={() => setSidebarOpen(v => !v)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-500 min-w-0">
            <span className="hidden sm:block">Admin</span>
            {currentMenu && currentMenu.to !== '/admin' && (
              <>
                <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="font-semibold text-gray-800 truncate">{currentMenu.label}</span>
              </>
            )}
            {!currentMenu && <span className="font-semibold text-gray-800">Admin Panel</span>}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* User chip */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 hidden sm:block">{user?.name}</span>
            <button
              onClick={handleLogout}
              title="ออกจากระบบ"
              className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold text-sm flex items-center justify-center hover:bg-emerald-200 transition-colors"
            >
              {user?.name?.charAt(0) ?? 'A'}
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-5">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
