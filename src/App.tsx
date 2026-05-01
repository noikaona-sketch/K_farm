import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './routes/AuthContext'
import MobileLayout from './layouts/MobileLayout'
import AdminLayout from './layouts/AdminLayout'
import LoginPage from './routes/LoginPage'

import FarmerDashboard from './app/farmer/FarmerDashboard'
import MyFarms from './app/farmer/MyFarms'
import AddFarm from './app/farmer/AddFarm'
import PinFarm from './app/farmer/PinFarm'
import PlantingRecord from './app/farmer/PlantingRecord'
import PriceAnnouncement from './app/farmer/PriceAnnouncement'
import MemberTier from './app/farmer/MemberTier'
import RegisterPage from './app/farmer/RegisterPage'
import RegistrationStatus from './app/farmer/RegistrationStatus'
import SeedVarieties from './app/farmer/SeedVarieties'

import LeaderDashboard from './app/leader/LeaderDashboard'
import FarmConfirmation from './app/leader/FarmConfirmation'

import InspectorTaskList from './app/inspector/InspectorTaskList'
import InspectionForm from './app/inspector/InspectionForm'

import AdminDashboard from './app/admin/AdminDashboard'
import AdminFarmers from './app/admin/AdminFarmers'
import AdminMap from './app/admin/AdminMap'
import AdminPrices from './app/admin/AdminPrices'

function ProtectedRoute({ role, children }: { role: string; children: React.ReactNode }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== role) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* ── Farmer ── */}
        <Route path="/farmer" element={<ProtectedRoute role="farmer"><MobileLayout role="farmer" /></ProtectedRoute>}>
          <Route index element={<FarmerDashboard />} />

          {/* ส่งบิล = ลงทะเบียน */}
          <Route path="register" element={<RegisterPage />} />

          {/* สถานะ = ความคืบหน้าการสมัคร */}
          <Route path="status" element={<RegistrationStatus />} />

          {/* ปักหมุด = แจ้งแปลงพร้อมพิกัด */}
          <Route path="pin" element={<PinFarm />} />

          {/* แปลงของฉัน (list) */}
          <Route path="farms" element={<MyFarms />} />
          <Route path="farms/add" element={<AddFarm />} />

          {/* แจ้งปลูก + สถานะการปลูก + ไม่เผา + ประวัติขาย */}
          <Route path="planting" element={<PlantingRecord />} />

          {/* พันธุ์ข้าวโพด + ผู้ขาย + พี่เลี้ยง */}
          <Route path="seeds" element={<SeedVarieties />} />

          {/* ราคา */}
          <Route path="prices" element={<PriceAnnouncement />} />

          {/* ระดับ */}
          <Route path="tier" element={<MemberTier />} />
        </Route>

        {/* ── Leader ── */}
        <Route path="/leader" element={<ProtectedRoute role="leader"><MobileLayout role="leader" /></ProtectedRoute>}>
          <Route index element={<LeaderDashboard />} />
          <Route path="confirm" element={<FarmConfirmation />} />
        </Route>

        {/* ── Inspector ── */}
        <Route path="/inspector" element={<ProtectedRoute role="inspector"><MobileLayout role="inspector" /></ProtectedRoute>}>
          <Route index element={<InspectorTaskList />} />
          <Route path="form/:id" element={<InspectionForm />} />
        </Route>

        {/* ── Admin ── */}
        <Route path="/admin" element={<ProtectedRoute role="admin"><AdminLayout /></ProtectedRoute>}>
          <Route index element={<AdminDashboard />} />
          <Route path="farmers" element={<AdminFarmers />} />
          <Route path="map" element={<AdminMap />} />
          <Route path="prices" element={<AdminPrices />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  )
}
