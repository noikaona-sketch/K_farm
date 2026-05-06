/**
 * K-Farm Role System — single source of truth
 *
 * Legacy hierarchy (high → low):
 *   admin > leader > inspector > field > farmer > member
 *
 * New model:
 *   baseType: farmer | service | staff
 *   capabilities: is_leader, can_inspect, can_inspect_no_burn, manage_all
 */

export type AppRole = 'member' | 'farmer' | 'field' | 'leader' | 'inspector' | 'admin' | 'vehicle' | 'service'
export type BaseType = 'farmer' | 'service' | 'staff'
export type Capability = 'is_leader' | 'can_inspect' | 'can_inspect_no_burn' | 'manage_all'
export type VehicleType = 'tractor' | 'harvester' | 'truck'
export type Grade = 'A' | 'B' | 'C'

const LEVEL: Record<AppRole, number> = {
  member: 0,
  farmer: 1,
  vehicle: 1,
  service: 1,
  field: 2,
  inspector: 3,
  leader: 4,
  admin: 5,
}

export function atLeast(userRole: AppRole, required: AppRole): boolean {
  return LEVEL[userRole] >= LEVEL[required]
}

export function hasRole(userRole: AppRole | undefined, role: AppRole): boolean {
  return userRole === role
}

export function hasCapability(capabilities: Capability[] | undefined, capability: Capability): boolean {
  return Array.isArray(capabilities) && capabilities.includes(capability)
}

export function isBaseType(baseType: BaseType | undefined, target: BaseType): boolean {
  return baseType === target
}

export function deriveRoleFromIdentity(baseType?: BaseType, capabilities: Capability[] = [], fallbackRole: AppRole = 'member'): AppRole {
  if (fallbackRole === 'admin' || hasCapability(capabilities, 'manage_all')) return 'admin'
  if (hasCapability(capabilities, 'is_leader')) return 'leader'
  if (hasCapability(capabilities, 'can_inspect')) return 'inspector'
  if (hasCapability(capabilities, 'can_inspect_no_burn')) return 'inspector'
  if (baseType === 'service') return 'vehicle'
  if (baseType === 'staff') return 'field'
  if (baseType === 'farmer') return 'farmer'
  return fallbackRole
}

export type Feature =
  | 'farming'
  | 'status'
  | 'profile'
  | 'prices'
  | 'register'
  | 'field_work'
  | 'leader_approve'
  | 'inspection'
  | 'no_burn_inspection'
  | 'admin_panel'
  | 'service_work'

const FEATURE_REQUIRED: Record<Exclude<Feature, 'no_burn_inspection'>, AppRole> = {
  register: 'member',
  status: 'member',
  profile: 'member',
  prices: 'member',
  farming: 'farmer',
  service_work: 'vehicle',
  field_work: 'field',
  inspection: 'inspector',
  leader_approve: 'leader',
  admin_panel: 'admin',
}

export function canAccess(userRole: AppRole | undefined, feature: Feature): boolean {
  if (!userRole) return false
  if (feature === 'no_burn_inspection') return atLeast(userRole, 'inspector')
  return atLeast(userRole, FEATURE_REQUIRED[feature])
}

export function canAccessByIdentity(
  feature: Feature,
  identity: { role?: AppRole; baseType?: BaseType; capabilities?: Capability[]; canFieldwork?: boolean },
): boolean {
  const capabilities = identity.capabilities ?? []
  const role = deriveRoleFromIdentity(identity.baseType, capabilities, identity.role ?? 'member')
  const isAdmin = identity.role === 'admin' || role === 'admin' || hasCapability(capabilities, 'manage_all')

  if (isAdmin) return true
  if (feature === 'field_work' && identity.baseType === 'staff' && identity.canFieldwork) return true
  if (feature === 'inspection') return hasCapability(capabilities, 'can_inspect')
  if (feature === 'no_burn_inspection') return hasCapability(capabilities, 'can_inspect') || hasCapability(capabilities, 'can_inspect_no_burn')
  if (feature === 'leader_approve') return hasCapability(capabilities, 'is_leader')
  if (feature === 'service_work') return identity.baseType === 'service'
  if (feature === 'farming') return identity.baseType === 'farmer'
  return canAccess(role, feature)
}

export const ROLE_TABS: Record<AppRole, readonly { to: string; label: string; icon: string; end: boolean }[]> = {
  member: [
    { to: '/farmer', label: 'หน้าแรก', icon: '🏠', end: true },
    { to: '/farmer/status', label: 'สถานะ', icon: '📋', end: false },
    { to: '/farmer/register', label: 'ข้อมูล', icon: '👤', end: false },
  ],
  farmer: [
    { to: '/farmer', label: 'หน้าแรก', icon: '🏠', end: true },
    { to: '/farmer/seeds', label: 'จองเมล็ด', icon: '🌾', end: false },
    { to: '/farmer/planting', label: 'แจ้งปลูก', icon: '🌽', end: false },
    { to: '/farmer/no-burn', label: 'ไม่เผา', icon: '🚫', end: false },
    { to: '/farmer/status', label: 'สถานะ', icon: '📋', end: false },
    { to: '/farmer/prices', label: 'ราคา', icon: '💰', end: false },
  ],
  vehicle: [
    { to: '/service', label: 'รถร่วม', icon: '🚜', end: true },
    { to: '/service/schedule', label: 'ตารางงาน', icon: '📅', end: false },
    { to: '/service/income', label: 'รายรับ', icon: '💰', end: false },
  ],
  service: [
    { to: '/service', label: 'รถร่วม', icon: '🚜', end: true },
    { to: '/service/schedule', label: 'ตารางงาน', icon: '📅', end: false },
    { to: '/service/income', label: 'รายรับ', icon: '💰', end: false },
  ],
  field: [
    { to: '/field', label: 'งานสนาม', icon: '📋', end: true },
    { to: '/field/seed-booking', label: 'จองเมล็ด', icon: '🌾', end: false },
    { to: '/field/farms/add', label: 'บันทึกแปลง', icon: '📍', end: false },
    { to: '/field/farm-inspection', label: 'ตรวจแปลง', icon: '🔍', end: false },
    { to: '/field/no-burn', label: 'ไม่เผา', icon: '🚫', end: false },
  ],
  leader: [
    { to: '/leader', label: 'หน้าแรก', icon: '🏠', end: true },
    { to: '/leader/confirm', label: 'อนุมัติ', icon: '✅', end: false },
    { to: '/leader/bookings', label: 'จองเมล็ด', icon: '🌾', end: false },
  ],
  inspector: [
    { to: '/inspector', label: 'งานของฉัน', icon: '📋', end: true },
    { to: '/inspector/form/ins1', label: 'ตรวจสอบ', icon: '🔍', end: false },
  ],
  admin: [
    { to: '/admin', label: 'Dashboard', icon: '📊', end: true },
    { to: '/admin/farmers', label: 'สมาชิก', icon: '👥', end: false },
    { to: '/admin/no-burn', label: 'ไม่เผา', icon: '🚫', end: false },
    { to: '/admin/map', label: 'แผนที่', icon: '🗺️', end: false },
    { to: '/admin/prices', label: 'ราคา', icon: '💰', end: false },
  ],
}

export function getTabsForIdentity(identity: { role?: AppRole; baseType?: BaseType; capabilities?: Capability[]; canFieldwork?: boolean }) {
  const capabilities = identity.capabilities ?? []
  const role = deriveRoleFromIdentity(identity.baseType, capabilities, identity.role ?? 'member')
  const tabs = [...ROLE_TABS[role]]

  if (identity.baseType === 'farmer') {
    if (hasCapability(capabilities, 'is_leader')) tabs.push({ to: '/leader/confirm', label: 'อนุมัติ', icon: '✅', end: false })
    if (hasCapability(capabilities, 'can_inspect')) tabs.push({ to: '/inspector', label: 'งานตรวจ', icon: '🔍', end: false })
    if (hasCapability(capabilities, 'can_inspect_no_burn')) tabs.push({ to: '/inspector', label: 'ตรวจไม่เผา', icon: '🚫', end: false })
  }

  if (identity.baseType === 'service') {
    if (hasCapability(capabilities, 'is_leader')) tabs.push({ to: '/service/team', label: 'ทีมรถ', icon: '👥', end: false })
    if (hasCapability(capabilities, 'can_inspect_no_burn')) tabs.push({ to: '/inspector', label: 'ตรวจไม่เผา', icon: '🚫', end: false })
  }

  if (identity.baseType === 'staff' && identity.canFieldwork) {
    tabs.push({ to: '/field', label: 'ภาคสนาม', icon: '📋', end: false })
  }

  return tabs.filter((tab, idx, arr) => arr.findIndex(t => t.to === tab.to) === idx)
}

export const ROLE_HOME: Record<AppRole, string> = {
  member: '/farmer',
  farmer: '/farmer',
  vehicle: '/service',
  service: '/service',
  field: '/field',
  leader: '/leader',
  inspector: '/inspector',
  admin: '/admin',
}

export function getHomeForIdentity(identity: { role?: AppRole; baseType?: BaseType; capabilities?: Capability[]; canFieldwork?: boolean }) {
  const capabilities = identity.capabilities ?? []
  const role = deriveRoleFromIdentity(identity.baseType, capabilities, identity.role ?? 'member')
  if (identity.role === 'admin' || hasCapability(capabilities, 'manage_all')) return '/admin'
  if (identity.baseType === 'service' && hasCapability(capabilities, 'can_inspect_no_burn')) return '/inspector'
  if (identity.baseType === 'service') return '/service'
  if (identity.baseType === 'staff') return identity.canFieldwork ? '/field' : ROLE_HOME[role]
  return ROLE_HOME[role]
}

export const ROLE_LABEL: Record<AppRole, string> = {
  member: 'สมาชิกใหม่',
  farmer: 'เกษตรกร',
  vehicle: 'รถร่วม',
  service: 'รถร่วม',
  field: 'ทีมภาคสนาม',
  leader: 'หัวหน้ากลุ่ม',
  inspector: 'เจ้าหน้าที่ตรวจสอบ',
  admin: 'ผู้ดูแลระบบ',
}

export const BASE_TYPE_LABEL: Record<BaseType, string> = {
  farmer: 'สมาชิก/เกษตรกร',
  service: 'รถร่วม',
  staff: 'พนักงาน',
}

export const ROLE_COLOR: Record<AppRole, string> = {
  member: 'bg-gray-100 text-gray-600',
  farmer: 'bg-emerald-100 text-emerald-700',
  vehicle: 'bg-orange-100 text-orange-700',
  service: 'bg-orange-100 text-orange-700',
  field: 'bg-teal-100 text-teal-700',
  leader: 'bg-amber-100 text-amber-700',
  inspector: 'bg-blue-100 text-blue-700',
  admin: 'bg-purple-100 text-purple-700',
}
