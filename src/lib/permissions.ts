import { supabase } from './supabase'

export type Department =
  | 'agri' | 'sales' | 'stock' | 'accounting' | 'inspection' | 'service' | 'it'

export type Permission =
  | 'member.view' | 'member.approve' | 'member.import' | 'member.set_role'
  | 'seed.view' | 'seed.edit' | 'seed.stock' | 'seed.sales'
  | 'price.view' | 'price.edit'
  | 'inspection.view' | 'inspection.edit'
  | 'service.view' | 'service.edit'
  | 'report.view' | 'report.export'
  | 'system.roles' | 'system.all'

export interface FeatureCatalogRow {
  feature_key: string
  feature_name: string
  group_name: string
  app_area: string
}

export interface RolePermissionRow {
  role_key: string
  feature_key: string
  can_view: boolean
  can_create: boolean
  can_update: boolean
  can_approve: boolean
}

export const DEPT_PERMISSIONS: Record<Department, Permission[]> = {
  agri: ['member.view', 'member.approve', 'seed.view', 'inspection.view', 'inspection.edit', 'report.view'],
  sales: ['member.view', 'price.view', 'price.edit', 'seed.view', 'seed.sales', 'report.view', 'report.export'],
  stock: ['seed.view', 'seed.edit', 'seed.stock', 'seed.sales', 'service.view', 'report.view'],
  accounting: ['member.view', 'price.view', 'report.view', 'report.export'],
  inspection: ['member.view', 'inspection.view', 'inspection.edit', 'report.view'],
  service: ['service.view', 'service.edit', 'member.view', 'report.view'],
  it: ['member.view', 'member.approve', 'member.import', 'member.set_role', 'seed.view', 'seed.edit', 'seed.stock', 'seed.sales', 'price.view', 'price.edit', 'inspection.view', 'inspection.edit', 'service.view', 'service.edit', 'report.view', 'report.export', 'system.roles', 'system.all'],
}

export interface AdminMenuItem { to: string; label: string; icon: string; permission: Permission }

export const ADMIN_MENUS: AdminMenuItem[] = [
  { to: '/admin', label: 'Dashboard', icon: '📊', permission: 'member.view' },
  { to: '/admin/members', label: 'สมาชิก / อนุมัติสมาชิก', icon: '👥', permission: 'member.view' },
  { to: '/admin/member-import', label: 'Import สมาชิกเก่า Excel', icon: '📥', permission: 'member.import' },
  { to: '/admin/roles', label: 'กำหนดสิทธิ์ / Role / Grade', icon: '🔐', permission: 'system.roles' },
  { to: '/admin/seed-suppliers', label: 'Supplier เมล็ดพันธุ์', icon: '🏪', permission: 'seed.edit' },
  { to: '/admin/seed-varieties', label: 'พันธุ์เมล็ดพันธุ์', icon: '🌾', permission: 'seed.edit' },
  { to: '/admin/seed-stock', label: 'รับเข้า Stock เมล็ดพันธุ์', icon: '📦', permission: 'seed.stock' },
  { to: '/admin/seed-sales', label: 'ขายเมล็ดพันธุ์', icon: '🛒', permission: 'seed.sales' },
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

export async function fetchFeatureCatalog(): Promise<FeatureCatalogRow[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('feature_catalog').select('*').order('group_name').order('feature_name')
  if (error) throw new Error(error.message)
  return (data ?? []) as FeatureCatalogRow[]
}

export async function fetchRolePermissions(roleKey: string): Promise<RolePermissionRow[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('role_permissions').select('*').eq('role_key', roleKey)
  if (error) throw new Error(error.message)
  return (data ?? []) as RolePermissionRow[]
}

export async function upsertRolePermission(roleKey: string, featureKey: string, payload: Omit<RolePermissionRow, 'role_key' | 'feature_key'>): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('role_permissions').upsert({ role_key: roleKey, feature_key: featureKey, ...payload }, { onConflict: 'role_key,feature_key' })
  if (error) throw new Error(error.message)
}

export function canAccess(user: { role?: string; permissions?: Permission[] } | null | undefined, featureKey: string): boolean {
  if (!user) return false
  if (user.role === 'super_admin') return true
  const perms = user.permissions ?? []
  if (perms.includes('system.all')) return true
  return perms.includes(featureKey as Permission)
}

export function getMenuForUser(user: { role?: string; permissions?: Permission[] } | null | undefined, menus: AdminMenuItem[]): AdminMenuItem[] {
  return menus.filter((m) => canAccess(user, m.permission))
}

export function getAllowedMenus(userPermissions: Permission[]): AdminMenuItem[] {
  return ADMIN_MENUS.filter((m) => hasPermission(userPermissions, m.permission))
}
