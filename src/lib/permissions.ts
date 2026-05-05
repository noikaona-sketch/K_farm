/**
 * K-Farm Permission System
 */

export type Department =
  | 'agri'
  | 'sales'
  | 'stock'
  | 'accounting'
  | 'inspection'
  | 'service'
  | 'it'

export type Permission =
  | 'member.view' | 'member.approve' | 'member.import' | 'member.set_role'
  | 'team.view' | 'team.edit'
  | 'seed.view' | 'seed.edit' | 'seed.stock' | 'seed.sales' | 'seed.debt'
  | 'price.view' | 'price.edit'
  | 'inspection.view' | 'inspection.edit'
  | 'service.view' | 'service.edit'
  | 'field.view' | 'field.seed_booking' | 'field.farm_inspection' | 'field.no_burn' | 'field.member_register' | 'field.machine_check' | 'field.transport_check'
  | 'report.view' | 'report.export'
  | 'system.roles' | 'system.all'

export const DEPT_PERMISSIONS: Record<Department, Permission[]> = {
  agri: ['member.view', 'member.approve', 'team.view', 'seed.view', 'inspection.view', 'inspection.edit', 'field.view', 'field.seed_booking', 'field.farm_inspection', 'field.no_burn', 'report.view'],
  sales: ['member.view', 'team.view', 'price.view', 'price.edit', 'seed.view', 'seed.sales', 'seed.debt', 'field.view', 'field.seed_booking', 'report.view', 'report.export'],
  stock: ['seed.view', 'seed.edit', 'seed.stock', 'seed.sales', 'seed.debt', 'service.view', 'report.view'],
  accounting: ['member.view', 'team.view', 'price.view', 'seed.view', 'seed.debt', 'field.view', 'field.seed_booking', 'report.view', 'report.export'],
  inspection: ['member.view', 'team.view', 'inspection.view', 'inspection.edit', 'field.view', 'field.farm_inspection', 'field.no_burn', 'report.view'],
  service: ['service.view', 'service.edit', 'member.view', 'team.view', 'field.view', 'field.machine_check', 'field.transport_check', 'report.view'],
  it: ['member.view', 'member.approve', 'member.import', 'member.set_role', 'team.view', 'team.edit', 'seed.view', 'seed.edit', 'seed.stock', 'seed.sales', 'seed.debt', 'price.view', 'price.edit', 'inspection.view', 'inspection.edit', 'service.view', 'service.edit', 'field.view', 'field.seed_booking', 'field.farm_inspection', 'field.no_burn', 'field.member_register', 'field.machine_check', 'field.transport_check', 'report.view', 'report.export', 'system.roles', 'system.all'],
}

export interface AdminMenuItem {
  to: string
  label: string
  icon: string
  permission: Permission
}

export const ADMIN_MENUS: AdminMenuItem[] = [
  { to: '/admin', label: 'Dashboard', icon: '📊', permission: 'member.view' },

  { to: '/admin/members', label: 'สมาชิก', icon: '👥', permission: 'member.view' },
  { to: '/admin/service-providers', label: 'รถร่วม', icon: '🚜', permission: 'service.view' },
  { to: '/admin/staff', label: 'พนักงาน', icon: '👤', permission: 'team.view' },
  { to: '/admin/member-import', label: 'Import สมาชิกเก่า Excel', icon: '📥', permission: 'member.import' },
  { to: '/admin/roles', label: 'กำหนดสิทธิ์ / Role / Grade', icon: '🔐', permission: 'system.roles' },

  { to: '/admin/seed-suppliers', label: 'Supplier เมล็ดพันธุ์', icon: '🏪', permission: 'seed.edit' },
  { to: '/admin/seed-varieties', label: 'พันธุ์เมล็ดพันธุ์', icon: '🌾', permission: 'seed.edit' },
  { to: '/admin/seed-stock', label: 'รับเข้า Stock เมล็ดพันธุ์', icon: '📦', permission: 'seed.stock' },
  { to: '/admin/seed-sales', label: 'จองเมล็ดพันธุ์', icon: '📝', permission: 'seed.sales' },
  { to: '/admin/seed-invoice', label: 'ขายเมล็ดพันธุ์ / Invoice', icon: '🛒', permission: 'seed.sales' },
  { to: '/admin/seed-debt', label: 'ลูกหนี้เมล็ดพันธุ์ / ค้างส่ง', icon: '💳', permission: 'seed.debt' },

  { to: '/admin/crop-cycle', label: 'วงจรเกษตรสมาชิก', icon: '🔄', permission: 'inspection.view' },
  { to: '/admin/planting-cycle', label: 'วงจรการปลูก', icon: '🌱', permission: 'inspection.view' },
  { to: '/admin/activity', label: 'กิจกรรมไม่เผา', icon: '🚫', permission: 'inspection.view' },
  { to: '/admin/calendar', label: 'ปฏิทินงานภาคสนาม', icon: '🗓️', permission: 'inspection.view' },
  { to: '/admin/field-inspections', label: 'ตรวจแปลง', icon: '🔍', permission: 'inspection.view' },
  { to: '/admin/quality', label: 'คุณภาพผลผลิต', icon: '📈', permission: 'inspection.view' },

  { to: '/admin/vehicle-schedule', label: 'นัดเกี่ยว / นัดรถ', icon: '🚚', permission: 'service.view' },
  { to: '/admin/service-review', label: 'ประเมินผู้ให้บริการ', icon: '⭐', permission: 'service.view' },

  { to: '/admin/reports', label: 'รายงาน', icon: '📊', permission: 'report.view' },
  { to: '/admin/settings', label: 'ตั้งค่า', icon: '⚙️', permission: 'system.roles' },
  { to: '/admin/prices', label: 'จัดการราคา', icon: '💰', permission: 'price.edit' },
  { to: '/admin/map', label: 'แผนที่แปลง', icon: '🗺️', permission: 'inspection.view' },
]

export function hasPermission(userPermissions: Permission[], required: Permission): boolean {
  if (userPermissions.includes('system.all')) return true
  return userPermissions.includes(required)
}

export function getAllowedMenus(userPermissions: Permission[]): AdminMenuItem[] {
  return ADMIN_MENUS.filter(m => hasPermission(userPermissions, m.permission))
}
