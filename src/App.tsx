import React, { useEffect } from 'react'
import { Routes, Route, Navigate, Link } from 'react-router-dom'
import { AuthProvider, useAuth } from './routes/AuthContext'
import { atLeast } from './lib/roles'
import type { AppRole } from './lib/roles'
import MobileLayout from './layouts/MobileLayout'
import AdminLayout  from './layouts/AdminLayout'
import AdminRoute   from './routes/AdminRoute'
import RequirePermission from './routes/RequirePermission'
import MemberSeedBookingMobile from './app/farmer/MemberSeedBookingMobile'
import MemberSeedBookingHistory from './app/farmer/MemberSeedBookingHistory'
import FieldSeedBooking from './app/field/FieldSeedBooking'
import FieldFarmInspection from './app/field/FieldFarmInspection'
import FieldMemberRegister from './app/field/FieldMemberRegister'

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
  field:     '/field',
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
      if (!window.location.pathname.startsWith('/farmer') && !window.location.pathname.startsWith('/field') && !window.location.pathname.startsWith('/leader') && !window.location.pathname.startsWith('/inspector')) window.location.href = ROLE_HOME[user?.role ?? 'farmer'] ?? '/farmer'
    }
  }, [user])
  return <>{children}</>
}

function FarmerNoBurnPage() {
  return (
    <div className="p-5 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">กิจกรรมไม่เผา</h1>
        <p className="text-gray-500 text-sm mt-1">ติดตามและบันทึกกิจกรรมไม่เผาสำหรับสมาชิก</p>
      </div>
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="text-3xl mb-2">🚫</div>
        <h2 className="font-bold text-gray-800">ยังไม่มีรายการกิจกรรม</h2>
        <p className="text-sm text-gray-500 mt-1">รอเชื่อมข้อมูลกิจกรรมไม่เผาในขั้นถัดไป</p>
      </div>
    </div>
  )
}

function FieldMenuCard({ to, icon, title, subtitle }: { to: string; icon: string; title: string; subtitle: string }) {
  return (
    <Link to={to} className="bg-white rounded-3xl p-4 shadow-sm border border-emerald-50 hover:shadow-md transition active:scale-[0.98]">
      <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-xl mb-3">
        <span>{icon}</span>
      </div>
      <div className="font-bold text-gray-800 text-sm">{title}</div>
      <div className="text-xs text-gray-400 mt-1 leading-relaxed">{subtitle}</div>
    </Link>
  )
}

function FieldDashboardHome() {
  const { user } = useAuth()
  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-24">
      <div className="max-w-md mx-auto space-y-4">
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-emerald-50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-xl">🌱</div>
            <div>
              <p className="text-xs text-gray-400">ทีมภาคสนาม</p>
              <h1 className="font-bold text-gray-900 text-lg">{user?.name || 'เจ้าหน้าที่ภาคสนาม'}</h1>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-emerald-50 p-3">
              <div className="font-bold text-emerald-700">0</div>
              <div className="text-[11px] text-gray-500">รอส่ง</div>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-3">
              <div className="font-bold text-emerald-700">0</div>
              <div className="text-[11px] text-gray-500">วันนี้</div>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-3">
              <div className="font-bold text-emerald-700">0</div>
              <div className="text-[11px] text-gray-500">สำเร็จ</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FieldMenuCard to="/field/member-register" icon="👤" title="สมัครสมาชิก" subtitle="ลงทะเบียนเกษตรกรใหม่" />
          <FieldMenuCard to="/field/seed-booking" icon="🌾" title="จองเมล็ดพันธุ์" subtitle="จองแทนสมาชิกในพื้นที่" />
          <FieldMenuCard to="/field/farm-inspection" icon="🔍" title="ตรวจแปลง" subtitle="บันทึกผลตรวจภาคสนาม" />
          <FieldMenuCard to="/field/no-burn" icon="🚫" title="ไม่เผา" subtitle="ตรวจและรับรองกิจกรรม" />
        </div>
      </div>
    </div>
  )
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
        <Route path="seed-booking-history" element={<MemberSeedBookingHistory />} />
        <Route path="history" element={<MemberSeedBookingHistory />} />
        <Route path="prices" element={<PriceAnnouncement />} />
        <Route path="tier" element={<MemberTier />} />
        <Route path="no-burn" element={<FarmerNoBurnPage />} />
        <Route path="pin" element={<RequireAuth minRole="farmer"><PinFarm /></RequireAuth>} />
        <Route path="farms" element={<RequireAuth minRole="farmer"><MyFarms /></RequireAuth>} />
        <Route path="farms/add" element={<RequireAuth minRole="farmer"><AddFarm /></RequireAuth>} />
        <Route path="planting" element={<RequireAuth minRole="farmer"><PlantingRecord /></RequireAuth>} />
      </Route>

      <Route path="/field" element={<RequireAuth minRole="field"><MobileLayout /></RequireAuth>}>
        <Route index element={<FieldDashboardHome />} />
        <Route path="member-register" element={<RequirePermission permission="field.member_register" fallback="/field"> <FieldMemberRegister /> </RequirePermission>  }/>
        <Route path="seed-booking" element={<RequirePermission permission="field.seed_booking" fallback="/field"><FieldSeedBooking /></RequirePermission>} />
        <Route path="farm-inspection" element={<RequirePermission permission="field.farm_inspection" fallback="/field"><FieldFarmInspection /></RequirePermission>} />
        <Route path="no-burn" element={<RequirePermission permission="field.no_burn" fallback="/field"><div className="p-5"><h1 className="text-xl font-bold">ตรวจไม่เผา</h1><p className="text-gray-500 text-sm mt-2">ฟอร์มตรวจหลักฐานไม่เผา</p></div></RequirePermission>} />
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
        <Route index element={<RequirePermission permission="member.view" fallback="/admin"><AdminDashboard /></RequirePermission>} />
        <Route path="members" element={<RequirePermission permission="member.view" fallback="/admin"><AdminMembers /></RequirePermission>} />
        <Route path="member-import" element={<RequirePermission permission="member.import" fallback="/admin"><AdminMemberImport /></RequirePermission>} />
        <Route path="roles" element={<RequirePermission permission="system.roles" fallback="/admin"><AdminRoles /></RequirePermission>} />
        <Route path="seed-suppliers" element={<RequirePermission permission="seed.edit" fallback="/admin"><AdminSeedSuppliers /></RequirePermission>} />
        <Route path="seed-varieties" element={<RequirePermission permission="seed.edit" fallback="/admin"><AdminSeedVarieties /></RequirePermission>} />
        <Route path="seed-stock" element={<RequirePermission permission="seed.stock" fallback="/admin"><AdminSeedStock /></RequirePermission>} />
        <Route path="seed-sales" element={<RequirePermission permission="seed.sales" fallback="/admin"><AdminSeedBooking /></RequirePermission>} />
        <Route path="seed-invoice" element={<RequirePermission permission="seed.sales" fallback="/admin"><AdminSeedPOS /></RequirePermission>} />
        <Route path="seed-debt" element={<RequirePermission permission="seed.debt" fallback="/admin"><AdminSeedDebt /></RequirePermission>} />
        <Route path="service-providers" element={<RequirePermission permission="service.view" fallback="/admin"><AdminServiceProviders /></RequirePermission>} />
        <Route path="field-inspections" element={<RequirePermission permission="inspection.view" fallback="/admin"><AdminFieldInspections /></RequirePermission>} />
        <Route path="reports" element={<RequirePermission permission="report.view" fallback="/admin"><AdminReports /></RequirePermission>} />
        <Route path="crop-cycle" element={<RequirePermission permission="inspection.view" fallback="/admin"><AdminPlaceholderPage title="วงจรเกษตรสมาชิก" icon="🔁" items={["วางแผนปลูก", "ติดตามสถานะ", "ผลผลิตคาดการณ์"]} /></RequirePermission>} />
        <Route path="planting-cycle" element={<RequirePermission permission="inspection.view" fallback="/admin"><AdminPlaceholderPage title="วงจรการปลูก" icon="🌱" /></RequirePermission>} />
        <Route path="activity" element={<RequirePermission permission="inspection.view" fallback="/admin"><AdminPlaceholderPage title="กิจกรรมไม่เผา" icon="🔥" /></RequirePermission>} />
        <Route path="calendar" element={<RequirePermission permission="inspection.view" fallback="/admin"><AdminPlaceholderPage title="ปฏิทินงานภาคสนาม" icon="📅" /></RequirePermission>} />
        <Route path="harvest" element={<RequirePermission permission="inspection.view" fallback="/admin"><AdminPlaceholderPage title="นัดขาย / คิวรับซื้อ" icon="🧾" /></RequirePermission>} />
        <Route path="quality" element={<RequirePermission permission="inspection.view" fallback="/admin"><AdminPlaceholderPage title="คุณภาพผลผลิต" icon="✅" /></RequirePermission>} />
        <Route path="vehicle-schedule" element={<RequirePermission permission="service.view" fallback="/admin"><AdminPlaceholderPage title="นัดรถ" icon="🚛" /></RequirePermission>} />
        <Route path="service-review" element={<RequirePermission permission="service.view" fallback="/admin"><AdminPlaceholderPage title="ประเมินผู้ให้บริการ" icon="⭐" /></RequirePermission>} />
        <Route path="settings" element={<RequirePermission permission="system.roles" fallback="/admin"><AdminPlaceholderPage title="ตั้งค่า" icon="⚙️" /></RequirePermission>} />
        <Route path="farmers" element={<RequirePermission permission="member.approve" fallback="/admin"><AdminFarmers /></RequirePermission>} />
        <Route path="map" element={<RequirePermission permission="inspection.view" fallback="/admin"><AdminMap /></RequirePermission>} />
        <Route path="prices" element={<RequirePermission permission="price.edit" fallback="/admin"><AdminPrices /></RequirePermission>} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes></LiffGuard></AuthProvider>
  )
}
