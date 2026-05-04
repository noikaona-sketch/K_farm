import React, { useState, useEffect } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../routes/AuthContext'
import { atLeast } from '../lib/roles'
import { DEPT_PERMISSIONS, type Department } from '../lib/permissions'
import { Menu, X, LogOut, ChevronRight } from 'lucide-react'

const DEPT_LABEL: Record<string, string> = {
  field_staff: 'ทีมภาคสนาม',
  agri:        'ฝ่ายเกษตร',
  sales:       'ฝ่ายขาย',
  stock:       'ฝ่ายสต็อก',
  accounting:  'ฝ่ายบัญชี',
  inspection:  'ฝ่ายตรวจแปลง',
  service:     'ฝ่ายรถ/บริการ',
  it:          'ฝ่าย IT',
}

function useAdminGuard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  useEffect(() => {
    if (!user || !atLeast(user.role ?? 'member', 'admin')) {
      navigate('/login', { replace: true })
    }
  }, [user, navigate])
}

export default function AdminLayout() {
  const { user, logout, allowedMenus } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useAdminGuard()

  const handleLogout = () => { logout(); navigate('/login', { replace: true }) }

  const deptLabel = user?.department
    ? DEPT_LABEL[user.department] ?? user.department
    : user?.role === 'admin' ? 'ผู้ดูแลระบบ' : ''

  const currentMenu = allowedMenus.find(m =>
    m.to === '/admin' ? pathname === '/admin' : pathname.startsWith(m.to)
  )

  // Group menus
  const groups: Record<string, typeof allowedMenus> = {}
  allowedMenus.forEach(m => {
    if (!groups[m.group]) groups[m.group] = []
    groups[m.group].push(m)
  })
  const groupOrder = ['หลัก', 'คนและสมาชิก', 'เมล็ดพันธุ์', 'วงจรเกษตร', 'ขายและบริการ', 'รายงาน', 'ตั้งค่า']

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-60 bg-gray-900 text-white flex flex-col
        transform transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="px-4 py-4 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center font-bold">K</div>
            <div>
              <div className="font-bold text-sm">K-Farm Admin</div>
              <div className="text-gray-400 text-[10px]">ระบบบริหารจัดการ</div>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-gray-800 rounded-xl px-2.5 py-2">
            <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-xs flex-shrink-0">
              {user?.name?.charAt(0) ?? 'A'}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold truncate">{user?.name ?? 'Admin'}</div>
              <div className="text-gray-400 text-[10px]">{deptLabel}</div>
            </div>
          </div>
        </div>

        {/* Nav grouped */}
        <nav className="flex-1 overflow-y-auto py-2 px-2">
          {allowedMenus.length === 0 && (
            <div className="text-gray-500 text-xs px-3 py-4 text-center">
              ไม่มีสิทธิ์เข้าถึงเมนูใด<br/>ติดต่อผู้ดูแลระบบ
            </div>
          )}
          {groupOrder.map(groupName => {
            const items = groups[groupName]
            if (!items || items.length === 0) return null
            // hide "หลัก" label
            const showLabel = groupName !== 'หลัก'
            return (
              <div key={groupName} className="mb-1">
                {showLabel && (
                  <div className="text-[9px] text-gray-500 uppercase tracking-widest font-semibold px-3 pt-3 pb-1">
                    {groupName}
                  </div>
                )}
                {items.map(m => {
                  const isActive = m.to === '/admin'
                    ? pathname === '/admin'
                    : pathname.startsWith(m.to)
                  return (
                    <Link key={m.to} to={m.to} onClick={() => setSidebarOpen(false)}
                      className={`
                        flex items-center gap-2.5 px-3 py-2 rounded-xl mb-0.5 text-xs transition-all
                        ${isActive
                          ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'}
                      `}>
                      <span className="text-sm flex-shrink-0">{m.icon}</span>
                      <span className="truncate flex-1">{m.label}</span>
                      {isActive && <ChevronRight className="w-3 h-3 flex-shrink-0 opacity-50" />}
                    </Link>
                  )
                })}
              </div>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="px-2 py-3 border-t border-gray-800 flex-shrink-0">
          <button onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-red-400 hover:bg-red-900/30 hover:text-red-300 transition-colors text-xs">
            <LogOut className="w-4 h-4 flex-shrink-0" />ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-12 bg-white border-b border-gray-200 flex items-center gap-3 px-4 flex-shrink-0 shadow-sm">
          <button onClick={() => setSidebarOpen(v => !v)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2 text-sm text-gray-500 min-w-0">
            <span className="hidden sm:block text-xs">Admin</span>
            {currentMenu && currentMenu.to !== '/admin' && (
              <>
                <ChevronRight className="w-3 h-3 flex-shrink-0" />
                <span className="text-xs font-semibold text-gray-500 opacity-60">{currentMenu.group}</span>
                <ChevronRight className="w-3 h-3 flex-shrink-0" />
                <span className="font-semibold text-gray-800 truncate">{currentMenu.label}</span>
              </>
            )}
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <div className="text-xs text-gray-700 font-medium">{user?.name}</div>
              <div className="text-[10px] text-gray-400">{deptLabel}</div>
            </div>
            <button onClick={handleLogout} title="ออกจากระบบ"
              className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center hover:bg-emerald-200 transition-colors">
              {user?.name?.charAt(0) ?? 'A'}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-5">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
