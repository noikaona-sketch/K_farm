import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './routes/AuthContext'
import MobileLayout from './layouts/MobileLayout'
import AdminLayout from './layouts/AdminLayout'

// Auth pages
import LoginLanding from './routes/LoginLanding'
import RegisterFlow from './routes/RegisterFlow'
import SignIn from './routes/SignIn'
import AdminLogin from './routes/AdminLogin'

// Farmer pages
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

// Leader
import LeaderDashboard from './app/leader/LeaderDashboard'
import FarmConfirmation from './app/leader/FarmConfirmation'

// Inspector
import InspectorTaskList from './app/inspector/InspectorTaskList'
import InspectionForm from './app/inspector/InspectionForm'

// Admin
import AdminDashboard from './app/admin/AdminDashboard'
import AdminFarmers from './app/admin/AdminFarmers'
import AdminMap from './app/admin/AdminMap'
import AdminPrices from './app/admin/AdminPrices'

import type { AppRole } from './routes/AuthContext'

/** Redirect ถ้ายังไม่ login */
function RequireAuth({ role, children }: { role?: AppRole; children: React.ReactNode }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) return <Navigate to="/login" replace />
  return <>{children}</>
}

/** Redirect ไปหน้าหลักถ้า login แล้ว */
function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  if (user) {
    const home: Record<AppRole, string> = {
      farmer: '/farmer', leader: '/leader', inspector: '/inspector', admin: '/admin'
    }
    return <Navigate to={home[user.role]} replace />
  }
  return <>{children}</>
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* ── Public auth ── */}
        <Route path="/login"       element={<RedirectIfAuthed><LoginLanding /></RedirectIfAuthed>} />
        <Route path="/register"    element={<RedirectIfAuthed><RegisterFlow /></RedirectIfAuthed>} />
        <Route path="/signin"      element={<RedirectIfAuthed><SignIn /></RedirectIfAuthed>} />
        <Route path="/admin-login" element={<RedirectIfAuthed><AdminLogin /></RedirectIfAuthed>} />
        <Route path="/"            element={<Navigate to="/login" replace />} />

        {/* ── Farmer (mobile) ── */}
        <Route path="/farmer" element={<RequireAuth role="farmer"><MobileLayout role="farmer" /></RequireAuth>}>
          <Route index element={<FarmerDashboard />} />
          <Route path="status"   element={<RegistrationStatus />} />
          <Route path="pin"      element={<PinFarm />} />
          <Route path="farms"    element={<MyFarms />} />
          <Route path="farms/add" element={<AddFarm />} />
          <Route path="planting" element={<PlantingRecord />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="seeds"    element={<SeedVarieties />} />
          <Route path="prices"   element={<PriceAnnouncement />} />
          <Route path="tier"     element={<MemberTier />} />
        </Route>

        {/* ── Leader ── */}
        <Route path="/leader" element={<RequireAuth role="leader"><MobileLayout role="leader" /></RequireAuth>}>
          <Route index element={<LeaderDashboard />} />
          <Route path="confirm" element={<FarmConfirmation />} />
        </Route>

        {/* ── Inspector ── */}
        <Route path="/inspector" element={<RequireAuth role="inspector"><MobileLayout role="inspector" /></RequireAuth>}>
          <Route index element={<InspectorTaskList />} />
          <Route path="form/:id" element={<InspectionForm />} />
        </Route>

        {/* ── Admin ── */}
        <Route path="/admin" element={<RequireAuth role="admin"><AdminLayout /></RequireAuth>}>
          <Route index element={<AdminDashboard />} />
          <Route path="farmers" element={<AdminFarmers />} />
          <Route path="map"     element={<AdminMap />} />
          <Route path="prices"  element={<AdminPrices />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  )
}
