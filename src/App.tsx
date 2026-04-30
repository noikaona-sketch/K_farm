import React, { useState } from 'react';
import LoginPage, { type AuthUser, type AppRole } from './pages/auth/LoginPage';
import FarmerLayout from './components/layout/FarmerLayout';
import AdminLayout from './components/layout/AdminLayout';

import FarmerDashboard from './pages/farmer/FarmerDashboard';
import RegisterFarmer from './pages/farmer/RegisterFarmer';
import MyFarms from './pages/farmer/MyFarms';
import { AddFarm } from './pages/farmer/AddFarm';
import PlantingRecord from './pages/farmer/PlantingRecord';
import { NoBurningApplication, SaleRequest, PriceAnnouncement, MemberTier } from './pages/farmer/index';
import { LeaderDashboard, FarmConfirmation } from './pages/leader/index';
import { InspectorTaskList, InspectionForm } from './pages/inspector/index';
import { AdminDashboard, AdminMap, AdminFarmersTable, AdminPriceManagement } from './pages/admin/index';

export type FarmerPage = 'dashboard'|'register'|'farms'|'addFarm'|'planting'|'noBurning'|'sale'|'prices'|'tier';
export type LeaderPage = 'leaderDashboard'|'farmConfirmation';
export type InspectorPage = 'taskList'|'inspectionForm';
export type AdminPage = 'adminDashboard'|'adminMap'|'adminFarmers'|'adminPrices';
export type AppPage = FarmerPage|LeaderPage|InspectorPage|AdminPage|'login';

const ROLE_HOME: Record<AppRole, AppPage> = {
  farmer: 'dashboard', leader: 'leaderDashboard', inspector: 'taskList', admin: 'adminDashboard'
};

export default function App() {
  const [user, setUser] = useState<AuthUser|null>(null);
  const [page, setPage] = useState<AppPage>('login');
  const [selectedInspectionId, setSelectedInspectionId] = useState<string|null>(null);

  const navigate = (p: AppPage, extra?: Record<string,string>) => {
    if(extra?.inspectionId) setSelectedInspectionId(extra.inspectionId);
    setPage(p);
  };

  const handleLogin = (u: AuthUser) => {
    setUser(u);
    setPage(ROLE_HOME[u.role]);
  };

  const handleLogout = () => {
    setUser(null);
    setPage('login');
  };

  if (!user) return <LoginPage onLogin={handleLogin} />;

  const role = user.role;

  // Header user pill shown in layouts
  const UserPill = () => (
    <div className="flex items-center gap-2">
      <div className="text-right hidden sm:block">
        <div className="text-xs font-semibold text-white leading-tight">{user.name}</div>
        <div className="text-[10px] text-white/60">{user.code}</div>
      </div>
      <button onClick={handleLogout}
        className="w-8 h-8 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-white font-bold text-sm hover:bg-white/30 transition-colors"
        title="ออกจากระบบ">
        {user.name.charAt(0)}
      </button>
    </div>
  );

  if (role === 'admin') return (
    <AdminLayout page={page as AdminPage} navigate={navigate} user={user} onLogout={handleLogout}>
      {page==='adminDashboard' && <AdminDashboard navigate={navigate}/>}
      {page==='adminMap'       && <AdminMap navigate={navigate}/>}
      {page==='adminFarmers'   && <AdminFarmersTable navigate={navigate}/>}
      {page==='adminPrices'    && <AdminPriceManagement navigate={navigate}/>}
    </AdminLayout>
  );

  if (role === 'leader') return (
    <FarmerLayout page={page} navigate={navigate} role="leader" user={user} onLogout={handleLogout}>
      {page==='leaderDashboard' && <LeaderDashboard navigate={navigate}/>}
      {page==='farmConfirmation' && <FarmConfirmation navigate={navigate}/>}
    </FarmerLayout>
  );

  if (role === 'inspector') return (
    <FarmerLayout page={page} navigate={navigate} role="inspector" user={user} onLogout={handleLogout}>
      {page==='taskList' && <InspectorTaskList navigate={navigate} onSelectInspection={(id)=>navigate('inspectionForm',{inspectionId:id})}/>}
      {page==='inspectionForm' && <InspectionForm navigate={navigate} inspectionId={selectedInspectionId}/>}
    </FarmerLayout>
  );

  return (
    <FarmerLayout page={page} navigate={navigate} role="farmer" user={user} onLogout={handleLogout}>
      {page==='dashboard' && <FarmerDashboard navigate={navigate}/>}
      {page==='register'  && <RegisterFarmer navigate={navigate}/>}
      {page==='farms'     && <MyFarms navigate={navigate}/>}
      {page==='addFarm'   && <AddFarm navigate={navigate}/>}
      {page==='planting'  && <PlantingRecord navigate={navigate}/>}
      {page==='noBurning' && <NoBurningApplication navigate={navigate}/>}
      {page==='sale'      && <SaleRequest navigate={navigate}/>}
      {page==='prices'    && <PriceAnnouncement navigate={navigate}/>}
      {page==='tier'      && <MemberTier navigate={navigate}/>}
    </FarmerLayout>
  );
}
