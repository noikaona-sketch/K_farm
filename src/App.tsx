import React, { useState } from 'react';
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

export type FarmerPage = 'dashboard' | 'register' | 'farms' | 'addFarm' | 'planting' | 'noBurning' | 'sale' | 'prices' | 'tier';
export type LeaderPage = 'leaderDashboard' | 'farmConfirmation';
export type InspectorPage = 'taskList' | 'inspectionForm';
export type AdminPage = 'adminDashboard' | 'adminMap' | 'adminFarmers' | 'adminPrices';
export type AppPage = FarmerPage | LeaderPage | InspectorPage | AdminPage | 'login';
type AppRole = 'farmer' | 'leader' | 'inspector' | 'admin';

export default function App() {
  const [role, setRole] = useState<AppRole>('farmer');
  const [page, setPage] = useState<AppPage>('dashboard');
  const [selectedInspectionId, setSelectedInspectionId] = useState<string | null>(null);

  const navigate = (p: AppPage, extra?: Record<string, string>) => {
    if (extra?.inspectionId) setSelectedInspectionId(extra.inspectionId);
    setPage(p);
  };

  const RoleSwitcher = () => (
    <div className="fixed top-2 right-2 z-50 flex gap-1 bg-white/95 backdrop-blur rounded-xl shadow-lg p-1 border border-gray-100">
      {(['farmer','leader','inspector','admin'] as AppRole[]).map(r => (
        <button key={r}
          onClick={() => { setRole(r); setPage(r === 'farmer' ? 'dashboard' : r === 'leader' ? 'leaderDashboard' : r === 'inspector' ? 'taskList' : 'adminDashboard'); }}
          className={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${role === r ? 'bg-green-600 text-white shadow' : 'text-gray-500 hover:bg-gray-100'}`}>
          {r === 'farmer' ? '🌾' : r === 'leader' ? '👑' : r === 'inspector' ? '🔍' : '⚙️'}
          <span className="ml-1 hidden sm:inline">{r === 'farmer' ? 'เกษตรกร' : r === 'leader' ? 'หัวหน้า' : r === 'inspector' ? 'ตรวจสอบ' : 'แอดมิน'}</span>
        </button>
      ))}
    </div>
  );

  if (role === 'admin') return (
    <><RoleSwitcher /><AdminLayout page={page as AdminPage} navigate={navigate}>
      {page === 'adminDashboard' && <AdminDashboard navigate={navigate} />}
      {page === 'adminMap' && <AdminMap navigate={navigate} />}
      {page === 'adminFarmers' && <AdminFarmersTable navigate={navigate} />}
      {page === 'adminPrices' && <AdminPriceManagement navigate={navigate} />}
    </AdminLayout></>
  );

  if (role === 'leader') return (
    <><RoleSwitcher /><FarmerLayout page={page} navigate={navigate} role="leader">
      {page === 'leaderDashboard' && <LeaderDashboard navigate={navigate} />}
      {page === 'farmConfirmation' && <FarmConfirmation navigate={navigate} />}
    </FarmerLayout></>
  );

  if (role === 'inspector') return (
    <><RoleSwitcher /><FarmerLayout page={page} navigate={navigate} role="inspector">
      {page === 'taskList' && <InspectorTaskList navigate={navigate} onSelectInspection={(id) => navigate('inspectionForm', { inspectionId: id })} />}
      {page === 'inspectionForm' && <InspectionForm navigate={navigate} inspectionId={selectedInspectionId} />}
    </FarmerLayout></>
  );

  return (
    <><RoleSwitcher /><FarmerLayout page={page} navigate={navigate} role="farmer">
      {page === 'dashboard' && <FarmerDashboard navigate={navigate} />}
      {page === 'register' && <RegisterFarmer navigate={navigate} />}
      {page === 'farms' && <MyFarms navigate={navigate} />}
      {page === 'addFarm' && <AddFarm navigate={navigate} />}
      {page === 'planting' && <PlantingRecord navigate={navigate} />}
      {page === 'noBurning' && <NoBurningApplication navigate={navigate} />}
      {page === 'sale' && <SaleRequest navigate={navigate} />}
      {page === 'prices' && <PriceAnnouncement navigate={navigate} />}
      {page === 'tier' && <MemberTier navigate={navigate} />}
    </FarmerLayout></>
  );
}
