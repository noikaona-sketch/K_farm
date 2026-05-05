import React, { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './routes/AuthContext'
import { atLeast } from './lib/roles'
import type { AppRole } from './lib/roles'
import MobileLayout from './layouts/MobileLayout'
import AdminLayout  from './layouts/AdminLayout'
import AdminRoute   from './routes/AdminRoute'

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

// ── Helpers ────────────────────────────────────────────────────────────────────

const ROLE_HOME: Record<AppRole, string> = {
  member:    '/farmer',
  farmer:    '/farmer',
  leader:    '/leader',
  inspector: '/inspector',
  admin:     '/admin',
}

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
    return <Navigate to={ROLE_HOME[user.role ?? 'member']} replace />
  }
  return <>{children}</>
}

/** Redirect to role home when already logged in */
function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  if (user) return <Navigate to={ROLE_HOME[user.role ?? 'member']} replace />
  return <>{children}</>
}

/**
 * LIFF environment guard.
 * If running inside LINE app AND user is not admin → force /farmer.
 * Admin always uses web browser, never LINE in-app.
 *
 * Uses user-agent sniff (no LIFF SDK needed at build time).
 */
function LiffGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()

  useEffect(() => {
    const isInsideLine = /Line/i.test(navigator.userAgent)
    if (isInsideLine && user && user.role === 'admin') {
      // Admin opened LINE in-app by mistake — redirect to web admin
      window.location.href = '/admin'
    }
    if (isInsideLine && !user) return          // not logged in, let /login handle
    if (isInsideLine && user?.role !== 'admin') {
      // Non-admin inside LINE → ensure they stay on /farmer
      if (!window.location.pathname.startsWith('/farmer') &&
          !window.location.pathname.startsWith('/leader') &&
          !window.location.pathname.startsWith('/inspector')) {
        window.location.href = '/farmer'
      }
    }
  }, [user])

  return <>{children}</>
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <AuthProvider>
      <LiffGuard>
        <Routes>

          {/* ── Public ── */}
          <Route path="/"            element={<Navigate to="/login" replace />} />
          <Route path="/login"       element={<RedirectIfAuthed><LoginLanding /></RedirectIfAuthed>} />
          <Route path="/register"    element={<RedirectIfAuthed><RegisterFlow /></RedirectIfAuthed>} />
          <Route path="/signin"      element={<RedirectIfAuthed><SignIn /></RedirectIfAuthed>} />
          <Route path="/admin-login" element={<RedirectIfAuthed><AdminLogin /></RedirectIfAuthed>} />

          {/* ── Farmer / Member — LINE Mini App ── */}
          <Route path="/farmer" element={<RequireAuth minRole="member"><MobileLayout /></RequireAuth>}>
            <Route index           element={<FarmerDashboard />} />
            <Route path="status"   element={<RegistrationStatus />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="seeds"    element={<SeedVarieties />} />
            <Route path="prices"   element={<PriceAnnouncement />} />
            <Route path="tier"     element={<MemberTier />} />
            {/* farmer+ only */}
            <Route path="pin"       element={<RequireAuth minRole="farmer"><PinFarm /></RequireAuth>} />
            <Route path="farms"     element={<RequireAuth minRole="farmer"><MyFarms /></RequireAuth>} />
            <Route path="farms/add" element={<RequireAuth minRole="farmer"><AddFarm /></RequireAuth>} />
            <Route path="planting"  element={<RequireAuth minRole="farmer"><PlantingRecord /></RequireAuth>} />
          </Route>

          {/* ── Leader — LINE ── */}
          <Route path="/leader" element={<RequireAuth minRole="leader"><MobileLayout /></RequireAuth>}>
            <Route index          element={<LeaderDashboard />} />
            <Route path="confirm" element={<FarmConfirmation />} />
          </Route>

          {/* ── Inspector — LINE ── */}
          <Route path="/inspector" element={<RequireAuth minRole="inspector"><MobileLayout /></RequireAuth>}>
            <Route index           element={<InspectorTaskList />} />
            <Route path="form/:id" element={<InspectionForm />} />
          </Route>

          {/* ── Admin — Web only, admin role only ── */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            <Route index                    element={<AdminDashboard />} />
            {/* menu routes from spec */}
            <Route path="members"           element={<AdminMembers />} />
            <Route path="member-import"     element={<AdminMemberImport />} />
            <Route path="roles"             element={<AdminRoles />} />
            <Route path="seed-suppliers"    element={<AdminSeedSuppliers />} />
            <Route path="seed-varieties"    element={<AdminSeedVarieties />} />
            <Route path="seed-stock"        element={<AdminSeedStock />} />
            <Route path="seed-sales"        element={<AdminSeedSales />} />
            <Route path="service-providers" element={<AdminServiceProviders />} />
            <Route path="field-inspections" element={<AdminFieldInspections />} />
            <Route path="reports"           element={<AdminReports />} />
            {/* legacy */}
            <Route path="farmers"           element={<AdminFarmers />} />
            <Route path="map"               element={<AdminMap />} />
            <Route path="prices"            element={<AdminPrices />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />

        </Routes>
      </LiffGuard>
    </AuthProvider>
  )
}
