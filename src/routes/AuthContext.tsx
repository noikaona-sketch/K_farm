import React, { createContext, useContext, useState } from 'react'
import type { AppRole, Feature } from '../lib/roles'
import { canAccess as _canAccess, atLeast, hasRole as _hasRole } from '../lib/roles'
import type { Department, Permission } from '../lib/permissions'
import { hasPermission as _hasPerm, getMenuForUser, ADMIN_MENUS, DEPT_PERMISSIONS } from '../lib/permissions'
import type { AdminMenuItem } from '../lib/permissions'

export type { AppRole }
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
  canAccess:    (feature: Feature) => boolean
  atLeast:      (role: AppRole) => boolean
  hasPerm:      (perm: Permission) => boolean
  allowedMenus: AdminMenuItem[]
}

const LS_KEY = 'kfarm_user'

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
    return u
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
  hasRole: () => false, canAccess: () => false,
  atLeast: () => false, hasPerm: () => false,
  allowedMenus: [],
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadStored)

  const login = (u: AuthUser) => {
    const withRole: AuthUser = { ...u, role: u.role ?? 'member' }
    setUser(withRole); persist(withRole)
  }
  const logout = () => { setUser(null); persist(null) }

  const setRegStatus = (s: RegStatus) => {
    setUser(prev => {
      if (!prev) return prev
      const next = { ...prev, registrationStatus: s }
      persist(next); return next
    })
  }
  const updateUser = (partial: Partial<AuthUser>) => {
    setUser(prev => {
      if (!prev) return prev
      const next = { ...prev, ...partial }
      persist(next); return next
    })
  }

  const role  = user?.role ?? 'member'
  const perms = user ? resolvePermissions(user) : []

  return (
    <Ctx.Provider value={{
      user, login, logout, setRegStatus, updateUser,
      hasRole:      (r) => _hasRole(role, r),
      canAccess:    (f) => _canAccess(role, f),
      atLeast:      (r) => atLeast(role, r),
      hasPerm:      (p) => _hasPerm(perms, p),
      allowedMenus: getMenuForUser({ role: user?.role, permissions: perms }, ADMIN_MENUS),
    }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)
