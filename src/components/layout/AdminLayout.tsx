import React, { useState } from 'react';
import type { AppPage, AdminPage } from '../../App';
import type { AuthUser } from '../../pages/auth/LoginPage';

interface Props {
  children: React.ReactNode;
  page: AdminPage;
  navigate: (p: AppPage) => void;
  user: AuthUser;
  onLogout: () => void;
}

const adminNav = [
  {page:'adminDashboard', icon:'📊', label:'แดชบอร์ด'},
  {page:'adminMap',       icon:'🗺️', label:'แผนที่แปลง'},
  {page:'adminFarmers',   icon:'👥', label:'ตารางเกษตรกร'},
  {page:'adminPrices',    icon:'💰', label:'จัดการราคา'},
] as const;

export default function AdminLayout({children, page, navigate, user, onLogout}: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={()=>setSidebarOpen(false)}/>}

      <aside className={`fixed left-0 top-0 h-full w-64 bg-gradient-to-b from-green-900 to-green-800 text-white z-50 transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen?'translate-x-0':'-translate-x-full'} lg:static lg:transform-none`}>
        <div className="p-5 border-b border-green-700">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">🌽</span>
            <div>
              <div className="font-bold text-lg">K-Farm</div>
              <div className="text-green-300 text-xs">ระบบบริหารจัดการ</div>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-green-700/50 rounded-xl p-2.5">
            <div className="w-9 h-9 rounded-full bg-yellow-400 flex items-center justify-center text-green-900 font-bold text-sm flex-shrink-0">
              {user.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">{user.name}</div>
              <div className="text-green-300 text-xs">{user.code}</div>
            </div>
          </div>
        </div>

        <nav className="p-3 space-y-1 flex-1">
          {adminNav.map((item) => {
            const isActive = page === item.page;
            return (
              <button key={item.page}
                onClick={()=>{navigate(item.page as AppPage);setSidebarOpen(false);}}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${isActive?'bg-yellow-400 text-green-900 font-semibold shadow-md':'text-green-100 hover:bg-green-700/60'}`}>
                <span className="text-xl">{item.icon}</span>
                <span className="text-sm">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-green-700">
          <button onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-red-300 hover:bg-red-900/30 transition-colors">
            <span className="text-lg">🚪</span>
            <span className="text-sm font-medium">ออกจากระบบ</span>
          </button>
          <div className="text-green-400 text-xs text-center mt-2">K-Farm v1.0 • บุรีรัมย์</div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shadow-sm sticky top-0 z-30">
          <button onClick={()=>setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100">
            <div className="space-y-1.5">
              <div className="w-5 h-0.5 bg-gray-600"/><div className="w-5 h-0.5 bg-gray-600"/><div className="w-5 h-0.5 bg-gray-600"/>
            </div>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-gray-800">{adminNav.find(n=>n.page===page)?.label??'แอดมิน'}</h1>
            <p className="text-gray-400 text-xs">ระบบบริหารจัดการ K-Farm</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 hidden sm:block">30 เม.ย. 2568</span>
            <button onClick={onLogout} title="ออกจากระบบ"
              className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm hover:bg-green-200 transition-colors">
              {user.name.charAt(0)}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4">{children}</main>
      </div>
    </div>
  );
}
