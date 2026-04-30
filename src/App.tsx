import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './routes/AuthContext'
import MobileLayout from './layouts/MobileLayout'
import AdminLayout from './layouts/AdminLayout'
import LoginPage from './routes/LoginPage'

import FarmerDashboard from './app/farmer/FarmerDashboard'
import MyFarms from './app/farmer/MyFarms'
import AddFarm from './app/farmer/AddFarm'
import PlantingRecord from './app/farmer/PlantingRecord'
import PriceAnnouncement from './app/farmer/PriceAnnouncement'
import MemberTier from './app/farmer/MemberTier'
import RegisterPage from './app/farmer/RegisterPage'

import LeaderDashboard from './app/leader/LeaderDashboard'
import FarmConfirmation from './app/leader/FarmConfirmation'

import InspectorTaskList from './app/inspector/InspectorTaskList'
import InspectionForm from './app/inspector/InspectionForm'

import AdminDashboard from './app/admin/AdminDashboard'
import AdminFarmers from './app/admin/AdminFarmers'
import AdminMap from './app/admin/AdminMap'
import AdminPrices from './app/admin/AdminPrices'

import type { AppRole } from './routes/AuthContext'

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

        <Route path="/farmer" element={<ProtectedRoute role="farmer"><MobileLayout role="farmer" /></ProtectedRoute>}>
          <Route index element={<FarmerDashboard />} />
          <Route path="farms" element={<MyFarms />} />
          <Route path="farms/add" element={<AddFarm />} />
          <Route path="planting" element={<PlantingRecord />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="prices" element={<PriceAnnouncement />} />
          <Route path="tier" element={<MemberTier />} />
        </Route>

        <Route path="/leader" element={<ProtectedRoute role="leader"><MobileLayout role="leader" /></ProtectedRoute>}>
          <Route index element={<LeaderDashboard />} />
          <Route path="confirm" element={<FarmConfirmation />} />
        </Route>

        <Route path="/inspector" element={<ProtectedRoute role="inspector"><MobileLayout role="inspector" /></ProtectedRoute>}>
          <Route index element={<InspectorTaskList />} />
          <Route path="form/:id" element={<InspectionForm />} />
        </Route>

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
