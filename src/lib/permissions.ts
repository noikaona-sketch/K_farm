/**
 * K-Farm Permission System
 * role     = เป็นใคร (ยังคงใช้สำหรับ routing)
 * department = ทำงานฝ่ายไหน
 * permission = สิทธิ์ที่ทำได้จริง (check ก่อน render)
 */

export type Department =
  | 'agri'          // ฝ่ายเกษตร (approve farmers, field inspection)
  | 'sales'         // ฝ่ายขาย (prices, sale requests)
  | 'stock'         // ฝ่ายสต็อก (seed stock, suppliers)
  | 'accounting'    // ฝ่ายบัญชี (reports, payments)
  | 'inspection'    // ฝ่ายตรวจแปลง
  | 'service'       // ฝ่ายรถ/บริการ (service providers)
  | 'it'            // ฝ่าย IT / super admin

export type Permission =
  // Member management
  | 'member.view'
  | 'member.approve'
  | 'member.import'
  | 'member.set_role'
  // Seed
  | 'seed.view'
  | 'seed.edit'
  | 'seed.stock'
  | 'seed.sales'
  // Prices
  | 'price.view'
  | 'price.edit'
  // Field inspection
  | 'inspection.view'
  | 'inspection.edit'
  // Service providers
  | 'service.view'
  | 'service.edit'
  // Reports
  | 'report.view'
  | 'report.export'
  // System
  | 'system.roles'
  | 'system.all'    // super admin

/** Default permissions per department */
export const DEPT_PERMISSIONS: Record<Department, Permission[]> = {
  agri: [
    'member.view', 'member.approve',
    'seed.view', 'inspection.view', 'inspection.edit',
    'report.view',
  ],
  sales: [
    'member.view',
    'price.view', 'price.edit',
    'seed.view', 'seed.sales',
    'report.view', 'report.export',
  ],
  stock: [
    'seed.view', 'seed.edit', 'seed.stock', 'seed.sales',
    'service.view',
    'report.view',
  ],
  accounting: [
    'member.view',
    'price.view',
    'report.view', 'report.export',
  ],
  inspection: [
    'member.view',
    'inspection.view', 'inspection.edit',
    'report.view',
  ],
  service: [
    'service.view', 'service.edit',
    'member.view',
    'report.view',
  ],
  it: [
    'member.view', 'member.approve', 'member.import', 'member.set_role',
    'seed.view', 'seed.edit', 'seed.stock', 'seed.sales',
    'price.view', 'price.edit',
    'inspection.view', 'inspection.edit',
    'service.view', 'service.edit',
    'report.view', 'report.export',
    'system.roles', 'system.all',
  ],
}

/** Admin menu items — each requires a permission */
export interface AdminMenuItem {
  to: string
  label: string
  icon: string
  permission: Permission
}

export const ADMIN_MENUS: AdminMenuItem[] = [
  { to: '/admin',                label: 'Dashboard',                         icon: '📊', permission: 'member.view' },
  { to: '/admin/members',        label: 'สมาชิก / อนุมัติสมาชิก',            icon: '👥', permission: 'member.view' },
  { to: '/admin/member-import',  label: 'Import สมาชิกเก่า Excel',            icon: '📥', permission: 'member.import' },
  { to: '/admin/roles',          label: 'กำหนดสิทธิ์ / Role / Grade',         icon: '🔐', permission: 'system.roles' },
  { to: '/admin/seed-suppliers', label: 'Supplier เมล็ดพันธุ์',               icon: '🏪', permission: 'seed.edit' },
  { to: '/admin/seed-varieties', label: 'พันธุ์เมล็ดพันธุ์',                  icon: '🌾', permission: 'seed.edit' },
  { to: '/admin/seed-stock',     label: 'รับเข้า Stock เมล็ดพันธุ์',          icon: '📦', permission: 'seed.stock' },
  { to: '/admin/seed-sales',     label: 'ขายเมล็ดพันธุ์',                    icon: '🛒', permission: 'seed.sales' },
  { to: '/admin/service-providers', label: 'ผู้ให้บริการ รถเกี่ยว/รถไถ/ขนส่ง', icon: '🚜', permission: 'service.view' },
  { to: '/admin/field-inspections', label: 'ตรวจแปลง',                       icon: '🔍', permission: 'inspection.view' },
  { to: '/admin/reports',        label: 'รายงาน',                             icon: '📈', permission: 'report.view' },
  { to: '/admin/prices',         label: 'จัดการราคา',                         icon: '💰', permission: 'price.edit' },
  { to: '/admin/map',            label: 'แผนที่แปลง',                         icon: '🗺️', permission: 'inspection.view' },
]

/** Check if user has a permission */
export function hasPermission(
  userPermissions: Permission[],
  required: Permission
): boolean {
  if (userPermissions.includes('system.all')) return true
  return userPermissions.includes(required)
}

/** Get menus user can see */
export function getAllowedMenus(userPermissions: Permission[]): AdminMenuItem[] {
  return ADMIN_MENUS.filter(m => hasPermission(userPermissions, m.permission))
}
