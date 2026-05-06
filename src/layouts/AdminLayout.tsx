import React, { useState, useEffect } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../routes/AuthContext'
import { atLeast } from '../lib/roles'
import { DEPT_PERMISSIONS } from '../lib/permissions'
import type { Department } from '../lib/permissions'
import type { AdminMenuItem } from '../lib/permissions'
import { Menu, X, LogOut, ChevronRight } from 'lucide-react'

const DEPT_LABEL: Record<Department, string> = {
  agri:       'ฝ่ายเกษตร',
  sales:      'ฝ่ายขาย',
  stock:      'ฝ่ายสต็อก',
  accounting: 'ฝ่ายบัญชี',
  inspection: 'ฝ่ายตรวจแปลง',
  service:    'ฝ่ายรถ/บริการ',
  it:         'ฝ่าย IT',
}

const MENU_GROUPS: { title: string; match: (m: AdminMenuItem) => boolean }[] = [
  { title: 'ภาพรวม', match: m => m.to === '/admin' },
  { title: 'สมาชิก / ทีมงาน / รถ', match: m => ['/admin/members', '/admin/staff', '/admin/member-import', '/admin/roles', '/admin/service-providers', '/admin/farmers'].includes(m.to) },
  { title: 'เมล็ดพันธุ์', match: m => m.to.startsWith('/admin/seed') },
  { title: 'วงจรการปลูก / ตรวจแปลง', match: m => ['/admin/field-inspections', '/admin/no-burn', '/admin/inspection-final-review', '/admin/map', '/admin/prices'].includes(m.to) },
  { title: 'บัญชี / รายงาน / อื่น ๆ', match: () => true },
]

function useAdminGuard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  useEffect(() => {
    if (!user || !atLeast(user.role ?? 'member', 'admin')) {
      navigate('/login', { replace: true })
    }
  }, [user, navigate])
}

function groupMenus(allowedMenus: AdminMenuItem[]) {
  const remaining = [...allowedMenus]
  return MENU_GROUPS.map(group => {
    const items = remaining.filter(group.match)
    items.forEach(item => {
      const idx = remaining.findIndex(m => m.to === item.to)
      if (idx >= 0) remaining.splice(idx, 1)
    })
    return { ...group, items }
  }).filter(group => group.items.length > 0)
}

export default function AdminLayout() {
  const { user, logout, allowedMenus } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useAdminGuard()

  const handleLogout = () => { logout(); navigate('/login', { replace: true }) }

  const deptLabel = user?.department
    ? DEPT_LABEL[user.department as Department] ?? user.department
    : user?.role === 'admin' ? 'ผู้ดูแลระบบ' : ''

  const currentMenu = allowedMenus.find(m =>
    m.to === '/admin' ? pathname === '/admin' : pathname.startsWith(m.to)
  )

  const groupedMenus = groupMenus(allowedMenus)

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-gray-900 text-white flex flex-col
        transform transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
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
              <div className="text-gray-400 text-xs">{deptLabel}</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-3">
          {allowedMenus.length === 0 && (
            <div className="text-gray-500 text-xs px-3 py-4 text-center">
              ไม่มีสิทธิ์เข้าถึงเมนูใด<br/>ติดต่อผู้ดูแลระบบ
            </div>
          )}
          {groupedMenus.map(group => (
            <div key={group.title}>
              <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                {group.title}
              </div>
              <div className="space-y-0.5">
                {group.items.map(m => {
                  const isActive = m.to === '/admin'
                    ? pathname === '/admin'
                    : pathname.startsWith(m.to)
                  return (
                    <Link key={m.to} to={m.to} onClick={() => setSidebarOpen(false)}
                      className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all
                        ${isActive
                          ? 'bg-emerald-600 text-white font-semibold shadow-md'
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'}
                      `}>
                      <span className="text-base flex-shrink-0">{m.icon}</span>
                      <span className="truncate flex-1">{m.label}</span>
                      {isActive && <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {user?.department && (
          <div className="px-4 py-3 border-t border-gray-800 flex-shrink-0">
            <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">สิทธิ์</div>
            <div className="text-xs text-gray-400">
              {(user.permissions && user.permissions.length > 0
                ? user.permissions
                : DEPT_PERMISSIONS[user.department as Department] ?? []
              ).includes('system.all')
                ? '🔓 ทุกสิทธิ์'
                : `${(user.permissions ?? DEPT_PERMISSIONS[user.department as Department] ?? []).length} permissions`}
            </div>
          </div>
        )}

        <div className="px-3 py-4 border-t border-gray-700 flex-shrink-0">
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-400 hover:bg-red-900/30 hover:text-red-300 transition-colors text-sm">
            <LogOut className="w-4 h-4 flex-shrink-0" />
            ออกจากระบบ
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 bg-white border-b border-gray-200 flex items-center gap-3 px-4 flex-shrink-0 shadow-sm">
          <button onClick={() => setSidebarOpen(v => !v)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors">
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-2 text-sm text-gray-500 min-w-0">
            <span className="hidden sm:block">Admin</span>
            {currentMenu && currentMenu.to !== '/admin' && (
              <><ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="font-semibold text-gray-800 truncate">{currentMenu.label}</span></>
            )}
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <div className="text-sm text-gray-700 font-medium">{user?.name}</div>
              <div className="text-xs text-gray-400">{deptLabel}</div>
            </div>
            <button onClick={handleLogout} title="ออกจากระบบ"
              className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold text-sm flex items-center justify-center hover:bg-emerald-200 transition-colors">
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
