import React from 'react';
import type { AppPage } from '../../App';
import type { AuthUser } from '../../pages/auth/LoginPage';

interface Props {
  children: React.ReactNode;
  page: AppPage;
  navigate: (p: AppPage) => void;
  role: 'farmer' | 'leader' | 'inspector';
  user: AuthUser;
  onLogout: () => void;
}

const farmerNav = [
  {page:'dashboard', icon:'🏠', label:'หน้าหลัก'},
  {page:'farms',     icon:'🌿', label:'แปลงของฉัน'},
  {page:'planting',  icon:'🌽', label:'บันทึก'},
  {page:'prices',    icon:'💰', label:'ราคา'},
  {page:'tier',      icon:'⭐', label:'ระดับ'},
] as const;

const leaderNav = [
  {page:'leaderDashboard', icon:'📊', label:'ภาพรวม'},
  {page:'farmConfirmation', icon:'✅', label:'ยืนยันแปลง'},
] as const;

const inspectorNav = [
  {page:'taskList',      icon:'📋', label:'งานของฉัน'},
  {page:'inspectionForm',icon:'🔍', label:'แบบฟอร์ม'},
] as const;

const ROLE_LABELS: Record<string,string> = {
  farmer:'ระบบเกษตรกร', leader:'ระบบหัวหน้ากลุ่ม', inspector:'ระบบตรวจสอบ'
};

export default function FarmerLayout({children, page, navigate, role, user, onLogout}: Props) {
  const navItems = role==='farmer' ? farmerNav : role==='leader' ? leaderNav : inspectorNav;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto relative">
      {/* Header */}
      <header className="bg-gradient-to-r from-green-700 to-green-600 text-white px-4 py-3 flex items-center justify-between shadow-md sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌽</span>
          <div>
            <div className="font-bold text-base leading-tight">K-Farm</div>
            <div className="text-green-200 text-xs">{ROLE_LABELS[role]}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className="text-xs font-semibold text-white leading-tight">{user.name}</div>
            <div className="text-[10px] text-green-200">{user.code}</div>
          </div>
          <button onClick={onLogout}
            className="w-9 h-9 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-white font-bold text-sm hover:bg-white/30 transition-colors"
            title="ออกจากระบบ">
            {user.name.charAt(0)}
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-20">{children}</main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-200 shadow-lg z-40">
        <div className={`grid h-16`} style={{gridTemplateColumns:`repeat(${navItems.length},1fr)`}}>
          {navItems.map((item) => {
            const isActive = page === item.page;
            return (
              <button key={item.page} onClick={()=>navigate(item.page as AppPage)}
                className={`flex flex-col items-center justify-center gap-0.5 transition-all relative ${isActive?'text-green-600':'text-gray-400 hover:text-gray-600'}`}>
                <span className={`text-xl transition-transform ${isActive?'scale-110':''}`}>{item.icon}</span>
                <span className={`text-[10px] font-medium ${isActive?'text-green-600':''}`}>{item.label}</span>
                {isActive && <div className="absolute bottom-0 w-8 h-0.5 bg-green-600 rounded-t-full"/>}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
