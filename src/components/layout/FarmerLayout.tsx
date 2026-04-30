import React from 'react';
import type { AppPage } from '../../App';

interface Props {
  children: React.ReactNode;
  page: AppPage;
  navigate: (p: AppPage) => void;
  role: 'farmer' | 'leader' | 'inspector';
}

const farmerNav = [
  { page: 'dashboard', icon: '🏠', label: 'หน้าหลัก' },
  { page: 'farms', icon: '🌿', label: 'แปลงของฉัน' },
  { page: 'planting', icon: '🌱', label: 'บันทึก' },
  { page: 'prices', icon: '💰', label: 'ราคา' },
  { page: 'tier', icon: '⭐', label: 'ระดับ' },
] as const;

const leaderNav = [
  { page: 'leaderDashboard', icon: '📊', label: 'ภาพรวม' },
  { page: 'farmConfirmation', icon: '✅', label: 'ยืนยันแปลง' },
] as const;

const inspectorNav = [
  { page: 'taskList', icon: '📋', label: 'งานของฉัน' },
  { page: 'inspectionForm', icon: '🔍', label: 'แบบฟอร์ม' },
] as const;

export default function FarmerLayout({ children, page, navigate, role }: Props) {
  const navItems = role === 'farmer' ? farmerNav : role === 'leader' ? leaderNav : inspectorNav;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto relative">
      {/* Header */}
      <header className="bg-gradient-to-r from-green-700 to-green-600 text-white px-4 py-3 flex items-center justify-between shadow-md sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌾</span>
          <div>
            <div className="font-bold text-base leading-tight tracking-wide">K-Farm</div>
            <div className="text-green-200 text-xs">
              {role === 'farmer' ? 'ระบบเกษตรกร' : role === 'leader' ? 'ระบบหัวหน้ากลุ่ม' : 'ระบบตรวจสอบ'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-sm font-bold border-2 border-green-300">
            {role === 'farmer' ? 'ส' : role === 'leader' ? 'ห' : 'ต'}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-200 shadow-lg z-40">
        <div className={`grid grid-cols-${navItems.length} h-16`}>
          {navItems.map((item) => {
            const isActive = page === item.page;
            return (
              <button
                key={item.page}
                onClick={() => navigate(item.page as AppPage)}
                className={`flex flex-col items-center justify-center gap-0.5 transition-all ${
                  isActive ? 'text-green-600' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <span className={`text-xl transition-transform ${isActive ? 'scale-110' : ''}`}>{item.icon}</span>
                <span className={`text-[10px] font-medium ${isActive ? 'text-green-600' : ''}`}>{item.label}</span>
                {isActive && <div className="absolute bottom-0 w-8 h-0.5 bg-green-600 rounded-t-full" />}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
