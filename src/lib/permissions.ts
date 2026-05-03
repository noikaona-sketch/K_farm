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
  | 'seed.view' | 'seed.edit' | 'seed.stock' | 'seed.sales' | 'seed.debt'
  | 'price.view' | 'price.edit'
  | 'inspection.view' | 'inspection.edit'
  | 'service.view' | 'service.edit'
  | 'report.view' | 'report.export'
  | 'system.roles' | 'system.all'

export const DEPT_PERMISSIONS: Record<Department, Permission[]> = {
  agri: ['member.view', 'member.approve', 'seed.view', 'inspection.view', 'inspection.edit', 'report.view'],
  sales: ['member.view', 'price.view', 'price.edit', 'seed.view', 'seed.sales', 'seed.debt', 'report.view', 'report.export'],
  stock: ['seed.view', 'seed.edit', 'seed.stock', 'seed.sales', 'seed.debt', 'service.view', 'report.view'],
  accounting: ['member.view', 'price.view', 'seed.view', 'seed.debt', 'report.view', 'report.export'],
  inspection: ['member.view', 'inspection.view', 'inspection.edit', 'report.view'],
  service: ['service.view', 'service.edit', 'member.view', 'report.view'],
  it: ['member.view', 'member.approve', 'member.import', 'member.set_role', 'seed.view', 'seed.edit', 'seed.stock', 'seed.sales', 'seed.debt', 'price.view', 'price.edit', 'inspection.view', 'inspection.edit', 'service.view', 'service.edit', 'report.view', 'report.export', 'system.roles', 'system.all'],
}

export interface AdminMenuItem {
  to: string
  label: string
  icon: string
  permission: Permission
}

export const ADMIN_MENUS: AdminMenuItem[] = [
  { to: '/admin', label: 'Dashboard', icon: '📊', permission: 'member.view' },
  { to: '/admin/members', label: 'Profile / สมาชิก / อนุมัติ', icon: '👥', permission: 'member.view' },
  { to: '/admin/member-import', label: 'Import สมาชิกเก่า Excel', icon: '📥', permission: 'member.import' },
  { to: '/admin/roles', label: 'กำหนดสิทธิ์ / Role / Grade', icon: '🔐', permission: 'system.roles' },
  { to: '/admin/seed-suppliers', label: 'Supplier เมล็ดพันธุ์', icon: '🏪', permission: 'seed.edit' },
  { to: '/admin/seed-varieties', label: 'พันธุ์เมล็ดพันธุ์', icon: '🌾', permission: 'seed.edit' },
  { to: '/admin/seed-stock', label: 'รับเข้า Stock เมล็ดพันธุ์', icon: '📦', permission: 'seed.stock' },
  { to: '/admin/seed-sales', label: 'จองเมล็ดพันธุ์', icon: '📝', permission: 'seed.sales' },
  { to: '/admin/seed-invoice', label: 'ขายเมล็ดพันธุ์ / Invoice', icon: '🛒', permission: 'seed.sales' },
  { to: '/admin/seed-debt', label: 'ลูกหนี้เมล็ดพันธุ์ / ค้างส่ง', icon: '💳', permission: 'seed.debt' },
  { to: '/admin/service-providers', label: 'ผู้ให้บริการ รถเกี่ยว/รถไถ/ขนส่ง', icon: '🚜', permission: 'service.view' },
  { to: '/admin/field-inspections', label: 'ตรวจแปลง', icon: '🔍', permission: 'inspection.view' },
  { to: '/admin/reports', label: 'รายงาน', icon: '📈', permission: 'report.view' },
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
