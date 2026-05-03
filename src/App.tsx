import React, { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './routes/AuthContext'
import { atLeast } from './lib/roles'
import type { AppRole } from './lib/roles'
import MobileLayout from './layouts/MobileLayout'
import AdminLayout  from './layouts/AdminLayout'
import AdminRoute   from './routes/AdminRoute'
import MemberSeedBookingMobile from './app/farmer/MemberSeedBookingMobile'

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
import AdminSeedBooking      from './app/admin/AdminSeedBooking'
import AdminSeedPOS          from './app/admin/AdminSeedPOS'
import AdminSeedDebt         from './app/admin/AdminSeedDebt'
import AdminServiceProviders from './app/admin/AdminServiceProviders'
import AdminFieldInspections from './app/admin/AdminFieldInspections'
import AdminReports          from './app/admin/AdminReports'
import AdminPlaceholderPage  from './app/admin/AdminPlaceholderPage'

const ROLE_HOME: Record<AppRole, string> = {
  member:    '/farmer',
  farmer:    '/farmer',
  leader:    '/leader',
  inspector: '/inspector',
  admin:     '/admin',
}

function RequireAuth({ minRole = 'member', children }: { minRole?: AppRole; children: React.ReactNode }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (!atLeast(user.role ?? 'member', minRole)) return <Navigate to={ROLE_HOME[user.role ?? 'member']} replace />
  return <>{children}</>
}

function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  if (user) return <Navigate to={ROLE_HOME[user.role ?? 'member']} replace />
  return <>{children}</>
}

function LiffGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  useEffect(() => {
    const isInsideLine = /Line/i.test(navigator.userAgent)
    if (isInsideLine && user && user.role === 'admin') window.location.href = '/admin'
    if (isInsideLine && !user) return
    if (isInsideLine && user?.role !== 'admin') {
      if (!window.location.pathname.startsWith('/farmer') && !window.location.pathname.startsWith('/leader') && !window.location.pathname.startsWith('/inspector')) window.location.href = '/farmer'
    }
  }, [user])
  return <>{children}</>
}

export default function App() {
  return (
    <AuthProvider><LiffGuard><Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<RedirectIfAuthed><LoginLanding /></RedirectIfAuthed>} />
      <Route path="/register" element={<RedirectIfAuthed><RegisterFlow /></RedirectIfAuthed>} />
      <Route path="/signin" element={<RedirectIfAuthed><SignIn /></RedirectIfAuthed>} />
      <Route path="/admin-login" element={<RedirectIfAuthed><AdminLogin /></RedirectIfAuthed>} />

      <Route path="/farmer" element={<RequireAuth minRole="member"><MobileLayout /></RequireAuth>}>
        <Route index element={<FarmerDashboard />} />
        <Route path="status" element={<RegistrationStatus />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="seeds" element={<SeedVarieties />} />
        <Route path="seed-booking" element={<MemberSeedBookingMobile />} />
        <Route path="prices" element={<PriceAnnouncement />} />
        <Route path="tier" element={<MemberTier />} />
        <Route path="pin" element={<RequireAuth minRole="farmer"><PinFarm /></RequireAuth>} />
        <Route path="farms" element={<RequireAuth minRole="farmer"><MyFarms /></RequireAuth>} />
        <Route path="farms/add" element={<RequireAuth minRole="farmer"><AddFarm /></RequireAuth>} />
        <Route path="planting" element={<RequireAuth minRole="farmer"><PlantingRecord /></RequireAuth>} />
      </Route>

      <Route path="/leader" element={<RequireAuth minRole="leader"><MobileLayout /></RequireAuth>}>
        <Route index element={<LeaderDashboard />} />
        <Route path="confirm" element={<FarmConfirmation />} />
      </Route>

      <Route path="/inspector" element={<RequireAuth minRole="inspector"><MobileLayout /></RequireAuth>}>
        <Route index element={<InspectorTaskList />} />
        <Route path="form/:id" element={<InspectionForm />} />
      </Route>

      <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="members" element={<AdminMembers />} />
        <Route path="member-import" element={<AdminMemberImport />} />
        <Route path="roles" element={<AdminRoles />} />
        <Route path="seed-suppliers" element={<AdminSeedSuppliers />} />
        <Route path="seed-varieties" element={<AdminSeedVarieties />} />
        <Route path="seed-stock" element={<AdminSeedStock />} />
        <Route path="seed-sales" element={<AdminSeedBooking />} />
        <Route path="seed-invoice" element={<AdminSeedPOS />} />
        <Route path="seed-debt" element={<AdminSeedDebt />} />
        <Route path="service-providers" element={<AdminServiceProviders />} />
        <Route path="field-inspections" element={<AdminFieldInspections />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="crop-cycle" element={<AdminPlaceholderPage title="วงจรเกษตรสมาชิก" icon="🔁" items={["วางแผนปลูก", "ติดตามสถานะ", "ผลผลิตคาดการณ์"]} />} />
        <Route path="planting-cycle" element={<AdminPlaceholderPage title="วงจรการปลูก" icon="🌱" />} />
        <Route path="activity" element={<AdminPlaceholderPage title="กิจกรรมไม่เผา" icon="🔥" />} />
        <Route path="calendar" element={<AdminPlaceholderPage title="ปฏิทินงานภาคสนาม" icon="📅" />} />
        <Route path="harvest" element={<AdminPlaceholderPage title="นัดขาย / คิวรับซื้อ" icon="🧾" />} />
        <Route path="quality" element={<AdminPlaceholderPage title="คุณภาพผลผลิต" icon="✅" />} />
        <Route path="vehicle-schedule" element={<AdminPlaceholderPage title="นัดรถ" icon="🚛" />} />
        <Route path="service-review" element={<AdminPlaceholderPage title="ประเมินผู้ให้บริการ" icon="⭐" />} />
        <Route path="settings" element={<AdminPlaceholderPage title="ตั้งค่า" icon="⚙️" />} />
        <Route path="farmers" element={<AdminFarmers />} />
        <Route path="map" element={<AdminMap />} />
        <Route path="prices" element={<AdminPrices />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes></LiffGuard></AuthProvider>
  )
}
