import React, { createContext, useContext, useState } from 'react'

export type AppRole = 'farmer' | 'leader' | 'inspector' | 'admin'
export type RegStatus = 'none' | 'pending' | 'approved' | 'rejected'

export interface AuthUser {
  id: string
  name: string
  role: AppRole
  code: string
  phone: string
  registrationStatus?: RegStatus
}

interface AuthCtx {
  user: AuthUser | null
  login: (u: AuthUser) => void
  logout: () => void
  setRegStatus: (s: RegStatus) => void
}

const Ctx = createContext<AuthCtx>({
  user: null, login: () => {}, logout: () => {}, setRegStatus: () => {}
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const setRegStatus = (s: RegStatus) => {
    setUser(u => u ? { ...u, registrationStatus: s } : u)
  }
  return (
    <Ctx.Provider value={{ user, login: setUser, logout: () => setUser(null), setRegStatus }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)
