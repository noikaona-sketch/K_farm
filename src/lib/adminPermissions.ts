import { requireSupabase, supabase } from './supabase'
import type { Capability, BaseType, Grade, AppRole } from './roles'
import type { Department, Permission } from './permissions'

export interface AdminPermissionMember {
  id: string
  full_name: string
  phone?: string | null
  id_card?: string | null
  role?: AppRole | string | null
  base_type?: BaseType | string | null
  capabilities?: Capability[]
  grade?: Grade | string | null
  department?: Department | string | null
  permissions?: Permission[]
  address?: string | null
  province?: string | null
  district?: string | null
  subdistrict?: string | null
  village?: string | null
  status?: string | null
  created_at?: string | null
}

function arr(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : []
}

function normalize(row: Record<string, unknown>): AdminPermissionMember {
  return {
    id: String(row.id),
    full_name: String(row.full_name ?? row.name ?? '-'),
    phone: row.phone ? String(row.phone) : null,
    id_card: row.id_card ? String(row.id_card) : null,
    role: row.role ? String(row.role) : 'member',
    base_type: row.base_type ? String(row.base_type) : null,
    capabilities: arr(row.capabilities) as Capability[],
    grade: row.grade ? String(row.grade) : 'C',
    department: row.department ? String(row.department) : null,
    permissions: arr(row.permissions) as Permission[],
    address: row.address ? String(row.address) : null,
    province: row.province ? String(row.province) : null,
    district: row.district ? String(row.district) : null,
    subdistrict: row.subdistrict ? String(row.subdistrict) : null,
    village: row.village ? String(row.village) : null,
    status: row.status ? String(row.status) : null,
    created_at: row.created_at ? String(row.created_at) : null,
  }
}

export function formatMemberAddress(row: Partial<AdminPermissionMember>) {
  const area = [row.subdistrict, row.district, row.province].filter(Boolean).join(' / ')
  const detail = row.address || row.village || ''
  if (area && detail) return `${area} • ${detail}`
  return area || detail || '-'
}

export async function fetchPermissionMembers(): Promise<AdminPermissionMember[]> {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map(row => normalize(row as Record<string, unknown>))
}

export async function updatePermissionMember(input: {
  profileId: string
  role: string
  baseType: BaseType
  grade: Grade
  capabilities: Capability[]
  department?: Department | null
  permissions?: Permission[]
}) {
  const db = requireSupabase()
  const { error } = await db
    .from('profiles')
    .update({
      role: input.role,
      base_type: input.baseType,
      grade: input.grade,
      capabilities: input.capabilities,
      department: input.department ?? null,
      permissions: input.permissions ?? [],
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.profileId)

  if (error) throw new Error(error.message)
}
