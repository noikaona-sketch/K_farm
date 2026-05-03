/**
 * K-Farm Role System — single source of truth
 *
 * Hierarchy (high → low):
 *   admin > leader > inspector > farmer > member
 */

export type AppRole = 'member' | 'farmer' | 'leader' | 'inspector' | 'admin'

// Numeric level — higher = more access
const LEVEL: Record<AppRole, number> = {
  member:    0,
  farmer:    1,
  inspector: 2,
  leader:    3,
  admin:     4,
}

/** Is role A at least as powerful as role B? */
export function atLeast(userRole: AppRole, required: AppRole): boolean {
  return LEVEL[userRole] >= LEVEL[required]
}

/** Does user have exactly this role? */
export function hasRole(userRole: AppRole | undefined, role: AppRole): boolean {
  return userRole === role
}

/** Can user access a named feature? */
export type Feature =
  | 'farming'        // แจ้งปลูก, ปักหมุด, จองคิว, ส่งรูป
  | 'status'         // ดูสถานะการสมัคร
  | 'profile'        // แก้ไขข้อมูลส่วนตัว
  | 'prices'         // ดูราคา
  | 'register'       // สมัครสมาชิก
  | 'leader_approve' // อนุมัติแปลง / สมาชิก
  | 'inspection'     // ตรวจสอบแปลง
  | 'admin_panel'    // admin dashboard

const FEATURE_REQUIRED: Record<Feature, AppRole> = {
  register:       'member',
  status:         'member',
  profile:        'member',
  prices:         'member',
  farming:        'farmer',
  inspection:     'inspector',
  leader_approve: 'leader',
  admin_panel:    'admin',
}

export function canAccess(userRole: AppRole | undefined, feature: Feature): boolean {
  if (!userRole) return false
  return atLeast(userRole, FEATURE_REQUIRED[feature])
}

/** Nav tabs per role — only show what user can access */
export const ROLE_TABS: Record<AppRole, readonly { to: string; label: string; icon: string; end: boolean }[]> = {
  member: [
    { to: '/farmer',          label: 'หน้าแรก', icon: '🏠', end: true },
    { to: '/farmer/status',   label: 'สถานะ',   icon: '📋', end: false },
    { to: '/farmer/register', label: 'ข้อมูล',  icon: '👤', end: false },
  ],
  farmer: [
    { to: '/farmer',           label: 'หน้าแรก',  icon: '🏠', end: true },
    { to: '/farmer/planting',  label: 'แจ้งปลูก', icon: '🌽', end: false },
    { to: '/farmer/status',    label: 'สถานะ',    icon: '📋', end: false },
    { to: '/farmer/prices',    label: 'ราคา',     icon: '💰', end: false },
  ],
  leader: [
    { to: '/leader',           label: 'หน้าแรก',  icon: '🏠', end: true },
    { to: '/leader/confirm',   label: 'อนุมัติ',  icon: '✅', end: false },
    { to: '/leader/bookings',  label: 'จองเมล็ด', icon: '🌾', end: false },
  ],
  inspector: [
    { to: '/inspector',       label: 'งานของฉัน', icon: '📋', end: true },
    { to: '/inspector/form/ins1', label: 'ตรวจสอบ', icon: '🔍', end: false },
  ],
  admin: [
    { to: '/admin',           label: 'Dashboard', icon: '📊', end: true },
    { to: '/admin/farmers',   label: 'สมาชิก',    icon: '👥', end: false },
    { to: '/admin/map',       label: 'แผนที่',    icon: '🗺️', end: false },
    { to: '/admin/prices',    label: 'ราคา',      icon: '💰', end: false },
  ],
}

/** Home route per role */
export const ROLE_HOME: Record<AppRole, string> = {
  member:    '/farmer',
  farmer:    '/farmer',
  leader:    '/leader',
  inspector: '/inspector',
  admin:     '/admin',
}

/** Human-readable role label */
export const ROLE_LABEL: Record<AppRole, string> = {
  member:    'สมาชิกใหม่',
  farmer:    'เกษตรกร',
  leader:    'หัวหน้ากลุ่ม',
  inspector: 'เจ้าหน้าที่ตรวจสอบ',
  admin:     'ผู้ดูแลระบบ',
}

/** Badge color class per role */
export const ROLE_COLOR: Record<AppRole, string> = {
  member:    'bg-gray-100 text-gray-600',
  farmer:    'bg-emerald-100 text-emerald-700',
  leader:    'bg-amber-100 text-amber-700',
  inspector: 'bg-blue-100 text-blue-700',
  admin:     'bg-purple-100 text-purple-700',
}
