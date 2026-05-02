import { Navigate } from 'react-router-dom'
import { useAuth } from '../routes/AuthContext'

export default function AdminRoute({ children }: { children: JSX.Element }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'admin') return <Navigate to="/login" replace />
  return children
}
