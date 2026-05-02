import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './routes/AuthContext'
import { atLeast } from './lib/roles'
import type { AppRole } from './lib/roles'
import MobileLayout from './layouts/MobileLayout'
import AdminLayout  from './layouts/AdminLayout'

// Auth
import LoginLanding  from './routes/LoginLanding'
import RegisterFlow  from './routes/RegisterFlow'
import SignIn        from './routes/SignIn'
import AdminLogin    from './routes/AdminLogin'

// Farmer / Member
import FarmerDashboard    from './app/farmer/FarmerDashboard'
import MyFarms            from './app/farmer/MyFarms'
import AddFarm            from './app/farmer/AddFarm'
import PinFarm            from './app/farmer/PinFarm'
import PlantingRecord     from './app/farmer/PlantingRecord'
import PriceAnnouncement  from './app/farmer/PriceAnnouncement'
import MemberTier         from './app/farmer/MemberTier'
import RegisterPage       from './app/farmer/RegisterPage'
import RegistrationStatus from './app/farmer/RegistrationStatus'
import SeedVarieties      from './app/farmer/SeedVarieties'

// Leader
import LeaderDashboard  from './app/leader/LeaderDashboard'
import FarmConfirmation from './app/leader/FarmConfirmation'

// Inspector
import InspectorTaskList from './app/inspector/InspectorTaskList'
import InspectionForm    from './app/inspector/InspectionForm'

// Admin pages
import AdminDashboard        from './app/admin/AdminDashboard'
import AdminFarmers          from './app/admin/AdminFarmers'
import AdminMap              from './app/admin/AdminMap'
import AdminPrices           from './app/admin/AdminPrices'
import AdminMembers          from './app/admin/AdminMembers'
import AdminMemberImport     from './app/admin/AdminMemberImport'
import AdminRoles            from './app/admin/AdminRoles'
import AdminSeedSuppliers    from './app/admin/AdminSeedSuppliers'
import AdminSeedVarieties    from './app/admin/AdminSeedVarieties'
import AdminSeedStock        from './app/admin/AdminSeedStock'
import AdminSeedSales        from './app/admin/AdminSeedSales'
import AdminServiceProviders from './app/admin/AdminServiceProviders'
import AdminFieldInspections from './app/admin/AdminFieldInspections'
import AdminReports          from './app/admin/AdminReports'

// ── Guards ────────────────────────────────────────────────────────────────────

function RequireAuth({ minRole = 'member', children }: { minRole?: AppRole; children: React.ReactNode }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (!atLeast(user.role ?? 'member', minRole)) {
    // Non-admin trying admin routes → login
    if (minRole === 'admin') return <Navigate to="/login" replace />
    // Lower role trying farmer routes → their home
    return <Navigate to="/farmer" replace />
  }
  return <>{children}</>
}

function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  if (!user) return <>{children}</>
  const home: Record<AppRole, string> = {
    member: '/farmer', farmer: '/farmer',
    leader: '/leader', inspector: '/inspector', admin: '/admin',
  }
  return <Navigate to={home[user.role ?? 'member']} replace />
}

// ── App ───────────────────────────────────────────────────────────────────────
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

        {/* ── Farmer / Member (LINE Mini App) ── */}
        <Route path="/farmer" element={<RequireAuth minRole="member"><MobileLayout /></RequireAuth>}>
          <Route index          element={<FarmerDashboard />} />
          <Route path="status"  element={<RegistrationStatus />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="seeds"   element={<SeedVarieties />} />
          <Route path="prices"  element={<PriceAnnouncement />} />
          <Route path="tier"    element={<MemberTier />} />
          {/* farmer+ only */}
          <Route path="pin"         element={<RequireAuth minRole="farmer"><PinFarm /></RequireAuth>} />
          <Route path="farms"       element={<RequireAuth minRole="farmer"><MyFarms /></RequireAuth>} />
          <Route path="farms/add"   element={<RequireAuth minRole="farmer"><AddFarm /></RequireAuth>} />
          <Route path="planting"    element={<RequireAuth minRole="farmer"><PlantingRecord /></RequireAuth>} />
        </Route>

        {/* ── Leader (LINE) ── */}
        <Route path="/leader" element={<RequireAuth minRole="leader"><MobileLayout /></RequireAuth>}>
          <Route index          element={<LeaderDashboard />} />
          <Route path="confirm" element={<FarmConfirmation />} />
        </Route>

        {/* ── Inspector (LINE) ── */}
        <Route path="/inspector" element={<RequireAuth minRole="inspector"><MobileLayout /></RequireAuth>}>
          <Route index           element={<InspectorTaskList />} />
          <Route path="form/:id" element={<InspectionForm />} />
        </Route>

        {/* ── Admin (Web) — admin only ── */}
        <Route path="/admin" element={<RequireAuth minRole="admin"><AdminLayout /></RequireAuth>}>
          <Route index                      element={<AdminDashboard />} />
          {/* legacy routes */}
          <Route path="farmers"             element={<AdminFarmers />} />
          <Route path="map"                 element={<AdminMap />} />
          <Route path="prices"              element={<AdminPrices />} />
          {/* new menu routes */}
          <Route path="members"             element={<AdminMembers />} />
          <Route path="member-import"       element={<AdminMemberImport />} />
          <Route path="roles"               element={<AdminRoles />} />
          <Route path="seed-suppliers"      element={<AdminSeedSuppliers />} />
          <Route path="seed-varieties"      element={<AdminSeedVarieties />} />
          <Route path="seed-stock"          element={<AdminSeedStock />} />
          <Route path="seed-sales"          element={<AdminSeedSales />} />
          <Route path="service-providers"   element={<AdminServiceProviders />} />
          <Route path="field-inspections"   element={<AdminFieldInspections />} />
          <Route path="reports"             element={<AdminReports />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  )
}
