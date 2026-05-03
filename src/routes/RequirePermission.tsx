import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import type { Permission } from '../lib/permissions'

export default function RequirePermission({
  permission,
  children,
  fallback = '/login',
}: {
  permission: Permission
  children: React.ReactNode
  fallback?: string
}) {
  const { user, hasPerm } = useAuth()

  if (!user) return <Navigate to="/login" replace />
  if (!hasPerm(permission)) return <Navigate to={fallback} replace />

  return <>{children}</>
}
