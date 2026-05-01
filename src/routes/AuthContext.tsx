import React, { createContext, useContext, useState } from 'react'
import type { AppRole, Feature } from '../lib/roles'
import { canAccess as _canAccess, atLeast, hasRole as _hasRole } from '../lib/roles'

export type { AppRole }
export type RegStatus = 'pending_leader' | 'pending_admin' | 'approved' | 'rejected' | 'none'

export interface AuthUser {
  id: string
  profileId: string
  name: string
  role: AppRole           // default 'member' after register
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
}

interface AuthCtx {
  user: AuthUser | null
  login: (u: AuthUser) => void
  logout: () => void
  setRegStatus: (s: RegStatus) => void
  updateUser: (partial: Partial<AuthUser>) => void
  /** Is user's role exactly this role? */
  hasRole: (role: AppRole) => boolean
  /** Can user access feature? (role-based) */
  canAccess: (feature: Feature) => boolean
  /** Is user's role at least this level? */
  atLeast: (role: AppRole) => boolean
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
    // Backfill role for old sessions that may not have it
    if (!u.role) u.role = 'member'
    return u
  } catch { return null }
}

const Ctx = createContext<AuthCtx>({
  user: null,
  login: () => {},
  logout: () => {},
  setRegStatus: () => {},
  updateUser: () => {},
  hasRole: () => false,
  canAccess: () => false,
  atLeast: () => false,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadStored)

  const login = (u: AuthUser) => {
    // Ensure role is set — default to 'member'
    const withRole: AuthUser = { ...u, role: u.role ?? 'member' }
    setUser(withRole)
    persist(withRole)
  }

  const logout = () => { setUser(null); persist(null) }

  const setRegStatus = (s: RegStatus) => {
    setUser(prev => {
      if (!prev) return prev
      const next = { ...prev, registrationStatus: s }
      persist(next)
      return next
    })
  }

  const updateUser = (partial: Partial<AuthUser>) => {
    setUser(prev => {
      if (!prev) return prev
      const next = { ...prev, ...partial }
      persist(next)
      return next
    })
  }

  const role = user?.role ?? 'member'

  return (
    <Ctx.Provider value={{
      user,
      login,
      logout,
      setRegStatus,
      updateUser,
      hasRole:   (r) => _hasRole(role, r),
      canAccess: (f) => _canAccess(role, f),
      atLeast:   (r) => atLeast(role, r),
    }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)
