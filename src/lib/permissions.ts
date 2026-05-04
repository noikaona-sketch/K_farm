/**
 * K-Farm Permission System
 * role     = เป็นใคร (ยังคงใช้สำหรับ routing)
 * department = ทำงานฝ่ายไหน
 * permission = สิทธิ์ที่ทำได้จริง (check ก่อน render)
 */

export type Department =
  | 'field_staff'  // ทีมภาคสนาม
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
 | 'field.view'
 | 'field.seed_booking'
 | 'field.farm_inspection'
 | 'field.no_burn'
 | 'field.member_register'
 | 'field.machine_check'
 | 'field.transport_check'
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
  | 'team.view'
  | 'team.edit'
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
  'team.view',
  'inspection.view',
  'inspection.edit',
  'field.view',
  'field.farm_inspection',
  'field.no_burn',
  'report.view',
],
  service: [
    'service.view', 'service.edit',
    'member.view',
    'report.view',
  ],
  field_staff: [
    'member.view',
    'inspection.view', 'inspection.edit',
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
  'field.view',
  'field.seed_booking',
  'field.farm_inspection',
  'field.no_burn',
  'field.member_register',
  'field.machine_check',
  'field.transport_check',
  ],
}

export const DEPARTMENTS: { value: Department; label: string; icon: string }[] = [
  { value: 'field_staff', label: 'ทีมภาคสนาม',   icon: '🧑‍🌾' },
  { value: 'agri',        label: 'ฝ่ายเกษตร',     icon: '🌱' },
  { value: 'sales',       label: 'ฝ่ายขาย',       icon: '💰' },
  { value: 'stock',       label: 'ฝ่ายสต็อก',     icon: '📦' },
  { value: 'accounting',  label: 'ฝ่ายบัญชี',     icon: '🧾' },
  { value: 'inspection',  label: 'ฝ่ายตรวจแปลง', icon: '🔍' },
  { value: 'service',     label: 'ฝ่ายรถ/บริการ', icon: '🚜' },
  { value: 'it',          label: 'ฝ่าย IT',       icon: '🔐' },
]

/** Admin menu items — each requires a permission */
export interface AdminMenuItem {
  to: string
  label: string
  icon: string
  permission: Permission
  group: string       // หมวดหมู่เมนู
  dividerBefore?: boolean
}

export const ADMIN_MENUS: AdminMenuItem[] = [
  // ── Dashboard ──────────────────────────────────────────────────────────────
  { to: '/admin',                   label: 'Dashboard',                          icon: '📊', permission: 'member.view',     group: 'หลัก' },

  // ── Profile & สมาชิก ───────────────────────────────────────────────────────
  { to: '/admin/profiles',          label: 'Profile ทั้งหมด',                   icon: '👤', permission: 'member.view',     group: 'คนและสมาชิก', dividerBefore: true },
  { to: '/admin/members',           label: 'สมาชิก / อนุมัติสมาชิก',            icon: '🌾', permission: 'member.approve',  group: 'คนและสมาชิก' },
  { to: '/admin/service-providers', label: 'รถ / ผู้ให้บริการ',                  icon: '🚜', permission: 'service.view',    group: 'คนและสมาชิก' },

  // ── เมล็ดพันธุ์ ────────────────────────────────────────────────────────────
  { to: '/admin/seed-suppliers',    label: 'Supplier เมล็ดพันธุ์',              icon: '🏪', permission: 'seed.edit',       group: 'เมล็ดพันธุ์', dividerBefore: true },
  { to: '/admin/seed-varieties',    label: 'พันธุ์เมล็ดพันธุ์',                 icon: '🌾', permission: 'seed.edit',       group: 'เมล็ดพันธุ์' },
  { to: '/admin/seed-stock',        label: 'รับเข้า Stock',                     icon: '📦', permission: 'seed.stock',      group: 'เมล็ดพันธุ์' },
  { to: '/admin/seed-sales',        label: 'จองเมล็ดพันธุ์',                    icon: '📋', permission: 'seed.sales',      group: 'เมล็ดพันธุ์' },
  { to: '/admin/seed-debt',         label: 'ลูกหนี้เมล็ดพันธุ์',               icon: '💳', permission: 'seed.sales',      group: 'เมล็ดพันธุ์' },

  // ── วงจรเกษตร ──────────────────────────────────────────────────────────────
  { to: '/admin/farm-cycles',       label: 'วงจรเกษตรสมาชิก',                   icon: '🔄', permission: 'inspection.view', group: 'วงจรเกษตร', dividerBefore: true },
  { to: '/admin/field-inspections', label: 'ตรวจแปลง',                          icon: '🔍', permission: 'inspection.edit', group: 'วงจรเกษตร' },
  { to: '/admin/no-burn',           label: 'กิจกรรมไม่เผา',                     icon: '🚫', permission: 'inspection.view', group: 'วงจรเกษตร' },
  { to: '/admin/field-calendar',    label: 'ปฏิทินงานภาคสนาม',                  icon: '📅', permission: 'inspection.view', group: 'วงจรเกษตร' },

  // ── ขาย / บริการ ───────────────────────────────────────────────────────────
  { to: '/admin/sell-queue',        label: 'นัดวันขายสมาชิก',                   icon: '📆', permission: 'price.view',      group: 'ขายและบริการ', dividerBefore: true },
  { to: '/admin/harvest-booking',   label: 'นัดเกี่ยว / นัดรถ',                 icon: '🚜', permission: 'service.view',    group: 'ขายและบริการ' },
  { to: '/admin/service-ratings',   label: 'ประเมินผู้ให้บริการ',               icon: '⭐', permission: 'service.view',    group: 'ขายและบริการ' },
  { to: '/admin/quality',           label: 'คุณภาพผลผลิต',                      icon: '📈', permission: 'inspection.view', group: 'ขายและบริการ' },

  // ── รายงาน ─────────────────────────────────────────────────────────────────
  { to: '/admin/reports',           label: 'รายงาน',                             icon: '📊', permission: 'report.view',    group: 'รายงาน', dividerBefore: true },
  { to: '/admin/map',               label: 'แผนที่แปลง',                         icon: '🗺️', permission: 'inspection.view', group: 'รายงาน' },

  // ── ตั้งค่า ────────────────────────────────────────────────────────────────
  { to: '/admin/roles',             label: 'กำหนดสิทธิ์ / Department',           icon: '🔐', permission: 'system.roles',    group: 'ตั้งค่า', dividerBefore: true },
  { to: '/admin/member-import',     label: 'Import สมาชิกเก่า Excel',            icon: '📥', permission: 'member.import',   group: 'ตั้งค่า' },
  { to: '/admin/prices',            label: 'จัดการราคา',                         icon: '💰', permission: 'price.edit',      group: 'ตั้งค่า' },
  { to: '/admin/settings',          label: 'ตั้งค่าระบบ',                        icon: '⚙️', permission: 'system.roles',    group: 'ตั้งค่า' },
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
