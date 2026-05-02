import React, { useEffect, useMemo, useState } from 'react'
import { Check, RefreshCw } from 'lucide-react'
import { fetchFeatureCatalog, fetchRolePermissions, upsertRolePermission, type FeatureCatalogRow, type RolePermissionRow } from '../../lib/permissions'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../routes/AuthContext'

type MatrixRow = FeatureCatalogRow & Pick<RolePermissionRow, 'can_view' | 'can_create' | 'can_update' | 'can_approve'>

const EMPTY_PERM = { can_view: false, can_create: false, can_update: false, can_approve: false }

export default function AdminRoles() {
  const { user } = useAuth()
  const [features, setFeatures] = useState<FeatureCatalogRow[]>([])
  const [roleKey, setRoleKey] = useState('')
  const [roles, setRoles] = useState<string[]>([])
  const [matrix, setMatrix] = useState<Record<string, MatrixRow>>({})
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<string | null>(null)

  const isSuperAdmin = user?.role === 'admin' && (user?.permissions?.includes('system.all') || user?.permissions?.includes('system.roles'))

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const [f] = await Promise.all([fetchFeatureCatalog()])
        setFeatures(f)
        if (supabase) {
          const { data } = await supabase.from('role_permissions').select('role_key')
          const keys = [...new Set((data ?? []).map((x: { role_key: string }) => x.role_key))]
          setRoles(keys)
          if (!roleKey && keys.length > 0) setRoleKey(keys[0])
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  useEffect(() => {
    if (!roleKey) return
    ;(async () => {
      const perms = await fetchRolePermissions(roleKey)
      const byFeature = new Map(perms.map((p) => [p.feature_key, p]))
      const next: Record<string, MatrixRow> = {}
      for (const f of features) {
        const p = byFeature.get(f.feature_key)
        next[f.feature_key] = { ...f, ...(p ?? EMPTY_PERM), role_key: roleKey, feature_key: f.feature_key } as MatrixRow
      }
      setMatrix(next)
    })()
  }, [roleKey, features])

  const rows = useMemo(() => Object.values(matrix), [matrix])

  const toggle = async (featureKey: string, field: keyof typeof EMPTY_PERM) => {
    if (!isSuperAdmin) return
    const row = matrix[featureKey]
    if (!row) return
    const payload = { ...row, [field]: !row[field] }
    setMatrix((prev) => ({ ...prev, [featureKey]: payload }))
    setSavingKey(`${featureKey}:${field}`)
    try {
      await upsertRolePermission(roleKey, featureKey, {
        can_view: payload.can_view,
        can_create: payload.can_create,
        can_update: payload.can_update,
        can_approve: payload.can_approve,
      })
    } finally {
      setSavingKey(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Role Permissions Matrix</h1>
        <button onClick={() => window.location.reload()} className="px-3 py-2 border rounded-lg text-sm flex items-center gap-2"><RefreshCw className="w-4 h-4"/>Reload</button>
      </div>

      <div className="bg-white border rounded-xl p-3">
        <label className="text-sm font-medium">Role Key</label>
        <select className="w-full mt-1 border rounded-lg p-2" value={roleKey} onChange={(e) => setRoleKey(e.target.value)}>
          {roles.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {loading ? <div className="py-10 text-center"><RefreshCw className="w-5 h-5 animate-spin inline-block"/></div> : (
        <div className="overflow-auto bg-white border rounded-xl">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">feature_name</th><th className="px-3 py-2 text-left">group_name</th><th className="px-3 py-2 text-left">app_area</th>
                <th className="px-3 py-2">can_view</th><th className="px-3 py-2">can_create</th><th className="px-3 py-2">can_update</th><th className="px-3 py-2">can_approve</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.feature_key} className="border-t">
                  <td className="px-3 py-2">{r.feature_name}</td><td className="px-3 py-2">{r.group_name}</td><td className="px-3 py-2">{r.app_area}</td>
                  {(['can_view', 'can_create', 'can_update', 'can_approve'] as const).map((f) => (
                    <td key={f} className="px-3 py-2 text-center">
                      <button disabled={!isSuperAdmin} onClick={() => toggle(r.feature_key, f)} className={`w-7 h-7 rounded border inline-flex items-center justify-center ${r[f] ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-400'} ${!isSuperAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        {savingKey === `${r.feature_key}:${f}` ? <RefreshCw className="w-3 h-3 animate-spin"/> : r[f] ? <Check className="w-3 h-3"/> : null}
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
