import React, { createContext, useContext, useState } from 'react'
import type { AppRole, BaseType, Capability, Feature, Grade, VehicleType } from '../lib/roles'
import {
  canAccess as _canAccess,
  canAccessByIdentity,
  atLeast,
  hasCapability as _hasCapability,
  hasRole as _hasRole,
  deriveRoleFromIdentity,
  getHomeForIdentity,
  getTabsForIdentity,
} from '../lib/roles'
import type { Department, Permission } from '../lib/permissions'
import { hasPermission as _hasPerm, getAllowedMenus, DEPT_PERMISSIONS } from '../lib/permissions'
import type { AdminMenuItem } from '../lib/permissions'

export type { AppRole, BaseType, Capability, Grade, VehicleType }
export type RegStatus = 'pending_leader' | 'pending_admin' | 'approved' | 'rejected' | 'none'

export interface AuthUser {
  id: string
  profileId: string
  name: string
  role: AppRole
  code: string
  phone: string
  idCard: string
  province?: string
  district?: string
  village?: string
  bankName?: string
  bankAccountNo?: string
  bankAccountName?: string
  registrationStatus: RegStatus

  // New identity model
  baseType?: BaseType
  capabilities?: Capability[]
  grade?: Grade
  vehicleType?: VehicleType
  canFieldwork?: boolean

  // Permission system
  department?: Department
  permissions?: Permission[]
}

interface AuthCtx {
  user: AuthUser | null
  login: (u: AuthUser) => void
  logout: () => void
  setRegStatus: (s: RegStatus) => void
  updateUser: (partial: Partial<AuthUser>) => void
  hasRole:      (role: AppRole) => boolean
  hasCapability:(capability: Capability) => boolean
  canAccess:    (feature: Feature) => boolean
  atLeast:      (role: AppRole) => boolean
  hasPerm:      (perm: Permission) => boolean
  allowedMenus: AdminMenuItem[]
  appTabs: ReturnType<typeof getTabsForIdentity>
  homePath: string
}

const LS_KEY = 'kfarm_user'
const VALID_CAPABILITIES: Capability[] = ['is_leader', 'can_inspect', 'can_inspect_no_burn', 'manage_all']

function normalizeCapabilities(value: unknown): Capability[] {
  if (!Array.isArray(value)) return []
  return value.filter((v): v is Capability => VALID_CAPABILITIES.includes(v as Capability))
}

function normalizeUser(u: AuthUser): AuthUser {
  const capabilities = normalizeCapabilities(u.capabilities)
  const baseType = u.baseType
  const fallbackRole = u.role ?? 'member'
  const role = deriveRoleFromIdentity(baseType, capabilities, fallbackRole)

  return {
    ...u,
    role,
    baseType,
    capabilities,
    grade: u.grade ?? 'C',
    registrationStatus: u.registrationStatus ?? 'none',
  }
}

function persist(u: AuthUser | null) {
  try {
    if (u) localStorage.setItem(LS_KEY, JSON.stringify(u))
    else localStorage.removeItem(LS_KEY)
  } catch { /* ignore */ }
}

function loadStored(): AuthUser | null {
  try {
    const s = localStorage.getItem(LS_KEY)
    if (!s) return null
    const u = JSON.parse(s) as AuthUser
    if (!u.role) u.role = 'member'
    return normalizeUser(u)
  } catch { return null }
}

/** Resolve permissions for a user:
 *  1. Use explicit permissions[] if set in DB
 *  2. Fall back to department defaults
 *  3. If role=admin with no department → system.all
 */
function resolvePermissions(u: AuthUser): Permission[] {
  if (u.permissions && u.permissions.length > 0) return u.permissions
  if (u.department) return DEPT_PERMISSIONS[u.department] ?? []
  if (u.role === 'admin') return ['system.all']
  return []
}

const Ctx = createContext<AuthCtx>({
  user: null, login: () => {}, logout: () => {},
  setRegStatus: () => {}, updateUser: () => {},
  hasRole: () => false, hasCapability: () => false,
  canAccess: () => false, atLeast: () => false,
  hasPerm: () => false,
  allowedMenus: [],
  appTabs: [],
  homePath: '/farmer',
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadStored)

  const login = (u: AuthUser) => {
    const normalized = normalizeUser(u)
    setUser(normalized); persist(normalized)
  }
  const logout = () => { setUser(null); persist(null) }

  const setRegStatus = (s: RegStatus) => {
    setUser(prev => {
      if (!prev) return prev
      const next = normalizeUser({ ...prev, registrationStatus: s })
      persist(next); return next
    })
  }
  const updateUser = (partial: Partial<AuthUser>) => {
    setUser(prev => {
      if (!prev) return prev
      const next = normalizeUser({ ...prev, ...partial })
      persist(next); return next
    })
  }

  const role  = user?.role ?? 'member'
  const perms = user ? resolvePermissions(user) : []
  const identity = {
    role,
    baseType: user?.baseType,
    capabilities: user?.capabilities ?? [],
    canFieldwork: user?.canFieldwork,
  }

  return (
    <Ctx.Provider value={{
      user, login, logout, setRegStatus, updateUser,
      hasRole:       (r) => _hasRole(role, r),
      hasCapability: (c) => _hasCapability(user?.capabilities, c),
      canAccess:     (f) => canAccessByIdentity(f, identity) || _canAccess(role, f),
      atLeast:       (r) => atLeast(role, r),
      hasPerm:       (p) => _hasPerm(perms, p),
      allowedMenus:  getAllowedMenus(perms),
      appTabs:       getTabsForIdentity(identity),
      homePath:      getHomeForIdentity(identity),
    }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)
