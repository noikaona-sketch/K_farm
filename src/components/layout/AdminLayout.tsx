import React, { useState } from 'react';
import type { AppPage, AdminPage } from '../../App';

interface Props {
  children: React.ReactNode;
  page: AdminPage;
  navigate: (p: AppPage) => void;
}

const adminNav = [
  { page: 'adminDashboard', icon: '📊', label: 'แดชบอร์ด' },
  { page: 'adminMap', icon: '🗺️', label: 'แผนที่แปลง' },
  { page: 'adminFarmers', icon: '👥', label: 'ตารางเกษตรกร' },
  { page: 'adminPrices', icon: '💰', label: 'จัดการราคา' },
] as const;

export default function AdminLayout({ children, page, navigate }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-full w-64 bg-gradient-to-b from-green-900 to-green-800 text-white z-50 transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:static lg:transform-none`}>
        <div className="p-5 border-b border-green-700">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🌾</span>
            <div>
              <div className="font-bold text-lg">K-Farm</div>
              <div className="text-green-300 text-xs">ระบบบริหารจัดการ</div>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 bg-green-700/50 rounded-xl p-2">
            <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-green-900 font-bold text-sm">A</div>
            <div>
              <div className="text-sm font-medium">ผู้ดูแลระบบ</div>
              <div className="text-green-300 text-xs">admin@kfarm.th</div>
            </div>
          </div>
        </div>

        <nav className="p-3 space-y-1">
          {adminNav.map((item) => {
            const isActive = page === item.page;
            return (
              <button
                key={item.page}
                onClick={() => { navigate(item.page as AppPage); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                  isActive ? 'bg-yellow-400 text-green-900 font-semibold shadow-md' : 'text-green-100 hover:bg-green-700/60'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-sm">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-green-700">
          <div className="text-green-400 text-xs text-center">K-Farm v1.0 • บุรีรัมย์</div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shadow-sm sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="space-y-1">
              <div className="w-5 h-0.5 bg-gray-600" />
              <div className="w-5 h-0.5 bg-gray-600" />
              <div className="w-5 h-0.5 bg-gray-600" />
            </div>
          </button>
          <div>
            <h1 className="font-bold text-gray-800 text-base">
              {adminNav.find(n => n.page === page)?.label ?? 'แอดมิน'}
            </h1>
            <p className="text-gray-400 text-xs">ระบบบริหารจัดการ K-Farm</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-gray-400">30 เม.ย. 2568</span>
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm">A</div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4">
          {children}
        </main>
      </div>
    </div>
  );
}
