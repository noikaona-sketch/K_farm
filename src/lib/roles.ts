/**
 * K-Farm Role System — single source of truth
 *
 * Hierarchy (high → low):
 *   admin > leader > inspector > farmer > member
 */

export type AppRole = 'member' | 'farmer' | 'leader' | 'inspector' | 'service_provider' | 'field_staff' | 'admin'

// Numeric level — higher = more access
const LEVEL: Record<AppRole, number> = {
  member:           0,
  farmer:           1,
  service_provider: 1,   // เทียบเท่า farmer — เข้า LINE ได้
  field_staff:      1,   // ทีมภาคสนาม — เข้า LINE (field view) ได้
  inspector:        2,
  leader:           3,
  admin:            4,
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
  // ── LINE Mini App roles ────────────────────────────────────────────────────
  member: [
    { to: '/farmer',          label: 'หน้าแรก', icon: '🏠', end: true },
    { to: '/farmer/status',   label: 'สถานะ',   icon: '📋', end: false },
    { to: '/farmer/register', label: 'ข้อมูล',  icon: '👤', end: false },
  ],
  farmer: [
    { to: '/farmer',          label: 'หน้าแรก',  icon: '🏠', end: true },
    { to: '/farmer/planting', label: 'แจ้งปลูก', icon: '🌽', end: false },
    { to: '/farmer/status',   label: 'สถานะ',    icon: '📋', end: false },
    { to: '/farmer/prices',   label: 'ราคา',     icon: '💰', end: false },
  ],
  leader: [
    { to: '/leader',          label: 'หน้าแรก',  icon: '🏠', end: true },
    { to: '/leader/confirm',  label: 'อนุมัติ',  icon: '✅', end: false },
    { to: '/leader/bookings', label: 'จองเมล็ด', icon: '🌾', end: false },
  ],
  inspector: [
    { to: '/inspector',           label: 'งานของฉัน', icon: '📋', end: true },
    { to: '/inspector/form/ins1', label: 'ตรวจสอบ',   icon: '🔍', end: false },
  ],
  service_provider: [
    { to: '/farmer',          label: 'หน้าแรก',  icon: '🏠', end: true },
    { to: '/farmer/status',   label: 'สถานะ',    icon: '📋', end: false },
  ],
  field_staff: [
    // ทีมภาคสนาม — เข้า LINE เพื่อดูงาน ลงบันทึกภาคสนาม
    { to: '/farmer',          label: 'หน้าแรก',  icon: '🏠', end: true },
    { to: '/farmer/status',   label: 'งานของฉัน',icon: '📋', end: false },
    { to: '/farmer/prices',   label: 'ราคา',     icon: '💰', end: false },
  ],
  // ── Web Browser only ───────────────────────────────────────────────────────
  admin: [
    { to: '/admin',         label: 'Dashboard', icon: '📊', end: true },
    { to: '/admin/farmers', label: 'สมาชิก',    icon: '👥', end: false },
    { to: '/admin/map',     label: 'แผนที่',    icon: '🗺️', end: false },
    { to: '/admin/prices',  label: 'ราคา',      icon: '💰', end: false },
  ],
}

/** Home route per role */
export const ROLE_HOME: Record<AppRole, string> = {
  member:           '/farmer',
  farmer:           '/farmer',
  service_provider: '/farmer',   // เข้า LINE — หน้า service_provider
  field_staff:      '/farmer',   // เข้า LINE — หน้า field view
  leader:           '/leader',
  inspector:        '/inspector',
  admin:            '/admin',
}

/** Human-readable role label */
export const ROLE_LABEL: Record<AppRole, string> = {
  member:           'สมาชิกใหม่',
  farmer:           'เกษตรกร',
  service_provider: 'ผู้ให้บริการ (รถ)',
  field_staff:      'ทีมภาคสนาม',
  leader:           'หัวหน้ากลุ่ม',
  inspector:        'เจ้าหน้าที่ตรวจสอบ',
  admin:            'ผู้ดูแลระบบ',
}

/** Badge color class per role */
export const ROLE_COLOR: Record<AppRole, string> = {
  member:           'bg-gray-100 text-gray-600',
  farmer:           'bg-emerald-100 text-emerald-700',
  service_provider: 'bg-purple-100 text-purple-700',
  field_staff:      'bg-cyan-100 text-cyan-700',
  leader:           'bg-amber-100 text-amber-700',
  inspector:        'bg-blue-100 text-blue-700',
  admin:            'bg-red-100 text-red-700',
}

/**
 * คำนวณว่า user คนนี้ เข้าถึงได้กี่ "โลก" (LINE app vs Admin web)
 * คืน list ของ destination ที่เข้าได้
 */
export interface RoleDestination {
  key: string           // unique key
  role: AppRole
  label: string         // ชื่อที่แสดงให้ user เลือก
  sublabel: string      // คำอธิบาย
  icon: string
  path: string          // redirect path
  platform: 'line' | 'web'
}

export function getAccessibleRoles(
  role: AppRole,
  canInspect: boolean
): RoleDestination[] {
  const dests: RoleDestination[] = []

  // LINE roles — เข้า app ตาม role
  if (role === 'farmer' || role === 'member') {
    dests.push({ key:'farmer', role, label:'เกษตรกร / สมาชิก',
      sublabel:'LINE Mini App — ปักหมุด แจ้งปลูก จองเมล็ด',
      icon:'🌽', path:'/farmer', platform:'line' })
  }
  if (role === 'leader') {
    dests.push({ key:'leader', role:'leader', label:'หัวหน้ากลุ่ม',
      sublabel:'LINE Mini App — อนุมัติแปลง จองให้สมาชิก',
      icon:'👑', path:'/leader', platform:'line' })
  }
  if (role === 'inspector') {
    dests.push({ key:'inspector', role:'inspector', label:'ตรวจแปลง',
      sublabel:'LINE Mini App — บันทึกการตรวจรับรอง',
      icon:'🔍', path:'/inspector', platform:'line' })
  }
  if (role === 'service_provider') {
    dests.push({ key:'service', role:'service_provider', label:'ผู้ให้บริการ (รถ)',
      sublabel:'LINE Mini App — รับงาน นัดเกี่ยว รับประเมิน',
      icon:'🚜', path:'/farmer', platform:'line' })
  }
  if (role === 'field_staff') {
    dests.push({ key:'field', role:'field_staff', label:'ทีมภาคสนาม',
      sublabel:'LINE Mini App — ดูงาน บันทึกภาคสนาม',
      icon:'🧑‍🌾', path:'/farmer', platform:'line' })
  }

  // leader เห็น leader tab แยกไว้แล้ว แต่ถ้าเป็น farmer+leader ก็เพิ่ม leader option
  if (role === 'leader') {
    // leader เป็น default เดียว — ไม่ต้องเพิ่ม
  }

  // can_inspect → เข้า inspector view ได้ด้วย (เพิ่ม option)
  if (canInspect && role !== 'inspector') {
    dests.push({
      key:      'inspector',
      role:     'inspector',
      label:    'ตรวจแปลง',
      sublabel: 'ผู้มีสิทธิ์รับรองแปลง — บันทึกการตรวจ',
      icon:     '🔍',
      path:     '/inspector',
      platform: 'line',
    })
  }

  // admin → เข้า web admin ได้
  if (role === 'admin') {
    dests.push({
      key:      'admin',
      role:     'admin',
      label:    'ระบบหลังบ้าน',
      sublabel: 'Admin Web — จัดการสมาชิก ราคา รายงาน',
      icon:     '🖥️',
      path:     '/admin',
      platform: 'web',
    })
  }

  return dests
}
