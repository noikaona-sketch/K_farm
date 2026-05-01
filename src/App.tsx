import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './routes/AuthContext'
import { atLeast } from './lib/roles'
import type { AppRole } from './lib/roles'
import MobileLayout from './layouts/MobileLayout'
import AdminLayout from './layouts/AdminLayout'

// Auth
import LoginLanding   from './routes/LoginLanding'
import RegisterFlow   from './routes/RegisterFlow'
import SignIn         from './routes/SignIn'
import AdminLogin     from './routes/AdminLogin'

// Farmer / Member pages
import FarmerDashboard     from './app/farmer/FarmerDashboard'
import MyFarms             from './app/farmer/MyFarms'
import AddFarm             from './app/farmer/AddFarm'
import PinFarm             from './app/farmer/PinFarm'
import PlantingRecord      from './app/farmer/PlantingRecord'
import PriceAnnouncement   from './app/farmer/PriceAnnouncement'
import MemberTier          from './app/farmer/MemberTier'
import RegisterPage        from './app/farmer/RegisterPage'
import RegistrationStatus  from './app/farmer/RegistrationStatus'
import SeedVarieties       from './app/farmer/SeedVarieties'

// Leader
import LeaderDashboard  from './app/leader/LeaderDashboard'
import FarmConfirmation from './app/leader/FarmConfirmation'

// Inspector
import InspectorTaskList from './app/inspector/InspectorTaskList'
import InspectionForm    from './app/inspector/InspectionForm'

// Admin
import AdminDashboard from './app/admin/AdminDashboard'
import AdminFarmers   from './app/admin/AdminFarmers'
import AdminMap       from './app/admin/AdminMap'
import AdminPrices    from './app/admin/AdminPrices'

// ── Guards ────────────────────────────────────────────────────────────────────

/** Require login; optionally require minimum role */
function RequireAuth({
  minRole = 'member',
  children,
}: {
  minRole?: AppRole
  children: React.ReactNode
}) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (!atLeast(user.role ?? 'member', minRole)) {
    return <Navigate to="/farmer" replace />
  }
  return <>{children}</>
}

/** Redirect to role home if already logged in */
function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  if (!user) return <>{children}</>
  const home: Record<AppRole, string> = {
    member:    '/farmer',
    farmer:    '/farmer',
    leader:    '/leader',
    inspector: '/inspector',
    admin:     '/admin',
  }
  return <Navigate to={home[user.role ?? 'member']} replace />
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* ── Public ── */}
        <Route path="/login"       element={<RedirectIfAuthed><LoginLanding /></RedirectIfAuthed>} />
        <Route path="/register"    element={<RedirectIfAuthed><RegisterFlow /></RedirectIfAuthed>} />
        <Route path="/signin"      element={<RedirectIfAuthed><SignIn /></RedirectIfAuthed>} />
        <Route path="/admin-login" element={<RedirectIfAuthed><AdminLogin /></RedirectIfAuthed>} />
        <Route path="/"            element={<Navigate to="/login" replace />} />

        {/* ── Farmer / Member (minRole: member) ── */}
        <Route path="/farmer" element={
          <RequireAuth minRole="member"><MobileLayout /></RequireAuth>
        }>
          <Route index                  element={<FarmerDashboard />} />
          <Route path="status"          element={<RegistrationStatus />} />
          <Route path="register"        element={<RegisterPage />} />
          <Route path="seeds"           element={<SeedVarieties />} />
          <Route path="prices"          element={<PriceAnnouncement />} />
          <Route path="tier"            element={<MemberTier />} />
          {/* Farmer-only routes */}
          <Route path="pin"             element={<RequireAuth minRole="farmer"><PinFarm /></RequireAuth>} />
          <Route path="farms"           element={<RequireAuth minRole="farmer"><MyFarms /></RequireAuth>} />
          <Route path="farms/add"       element={<RequireAuth minRole="farmer"><AddFarm /></RequireAuth>} />
          <Route path="planting"        element={<RequireAuth minRole="farmer"><PlantingRecord /></RequireAuth>} />
        </Route>

        {/* ── Leader (minRole: leader) ── */}
        <Route path="/leader" element={
          <RequireAuth minRole="leader"><MobileLayout /></RequireAuth>
        }>
          <Route index          element={<LeaderDashboard />} />
          <Route path="confirm" element={<FarmConfirmation />} />
        </Route>

        {/* ── Inspector (minRole: inspector) ── */}
        <Route path="/inspector" element={
          <RequireAuth minRole="inspector"><MobileLayout /></RequireAuth>
        }>
          <Route index           element={<InspectorTaskList />} />
          <Route path="form/:id" element={<InspectionForm />} />
        </Route>

        {/* ── Admin (minRole: admin) ── */}
        <Route path="/admin" element={
          <RequireAuth minRole="admin"><AdminLayout /></RequireAuth>
        }>
          <Route index           element={<AdminDashboard />} />
          <Route path="farmers"  element={<AdminFarmers />} />
          <Route path="map"      element={<AdminMap />} />
          <Route path="prices"   element={<AdminPrices />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  )
}
