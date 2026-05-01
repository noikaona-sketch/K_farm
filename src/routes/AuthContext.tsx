import React, { createContext, useContext, useState, useEffect } from 'react'

export type AppRole = 'farmer' | 'leader' | 'inspector' | 'admin'
export type RegStatus = 'pending_leader' | 'pending_admin' | 'approved' | 'rejected' | 'none'

export interface AuthUser {
  id: string              // farmers.id (UUID)
  profileId: string       // profiles.id (UUID)
  name: string            // full_name
  role: AppRole
  code: string            // farmer code e.g. KF001
  phone: string
  idCard: string          // id_card — used as login username
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
}

const LS_KEY = 'kfarm_user'

const Ctx = createContext<AuthCtx>({
  user: null,
  login: () => {},
  logout: () => {},
  setRegStatus: () => {},
  updateUser: () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem(LS_KEY)
      return stored ? (JSON.parse(stored) as AuthUser) : null
    } catch {
      return null
    }
  })

  const login = (u: AuthUser) => {
    setUser(u)
    try { localStorage.setItem(LS_KEY, JSON.stringify(u)) } catch { /* ignore */ }
  }

  const logout = () => {
    setUser(null)
    try { localStorage.removeItem(LS_KEY) } catch { /* ignore */ }
  }

  const setRegStatus = (s: RegStatus) => {
    setUser(prev => {
      if (!prev) return prev
      const next = { ...prev, registrationStatus: s }
      try { localStorage.setItem(LS_KEY, JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }

  const updateUser = (partial: Partial<AuthUser>) => {
    setUser(prev => {
      if (!prev) return prev
      const next = { ...prev, ...partial }
      try { localStorage.setItem(LS_KEY, JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }

  return (
    <Ctx.Provider value={{ user, login, logout, setRegStatus, updateUser }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)
