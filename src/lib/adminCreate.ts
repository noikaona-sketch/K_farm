import { requireSupabase } from './supabase'
import type { BaseType, Capability, Grade, VehicleType } from './roles'
import type { Department, Permission } from './permissions'

export type AdminCreateStatus = 'pending' | 'approved' | 'rejected' | 'suspended' | 'pending_leader' | 'pending_admin'

export interface UpsertProfileInput {
  fullName: string
  phone?: string
  idCard?: string
  email?: string
  role?: string
  baseType?: BaseType
  capabilities?: Capability[]
  grade?: Grade
  department?: Department | null
  permissions?: Permission[]
  address?: string
  province?: string
  district?: string
  subdistrict?: string
  village?: string
  status?: AdminCreateStatus | string
  createdBy?: string | null
}

export interface CreateMemberInput extends UpsertProfileInput {
  code?: string
  farmerStatus?: string
  createFarmerRow?: boolean
}

export interface CreateVehicleInput extends UpsertProfileInput {
  vehicleType: VehicleType
  vehicleSize?: string
  licensePlate?: string
  vehicleYear?: number | null
  driverName?: string
  driverPhone?: string
  serviceStatus?: string
}

export interface CreateStaffInput extends UpsertProfileInput {
  department: Department
  permissions: Permission[]
  canFieldwork?: boolean
  level?: string
}

function cleanText(value?: string | null) {
  const v = value?.trim()
  return v ? v : null
}

function cleanIdCard(value?: string | null) {
  return cleanText(value)?.replace(/[-\s]/g, '') ?? null
}

function cleanPhone(value?: string | null) {
  return cleanText(value)?.replace(/[-\s]/g, '') ?? null
}

function cleanEmail(value?: string | null) {
  return cleanText(value)?.toLowerCase() ?? null
}

function genFarmerCode() {
  return `KF${Date.now().toString().slice(-6)}`
}

async function findExistingProfile(input: Pick<UpsertProfileInput, 'idCard' | 'phone' | 'email'>) {
  const db = requireSupabase()
  const idCard = cleanIdCard(input.idCard)
  const phone = cleanPhone(input.phone)
  const email = cleanEmail(input.email)

  if (idCard) {
    const { data, error } = await db.from('profiles').select('*').eq('id_card', idCard).maybeSingle()
    if (error) throw new Error(error.message)
    if (data) return data as Record<string, unknown>
  }

  if (phone) {
    const { data, error } = await db.from('profiles').select('*').eq('phone', phone).maybeSingle()
    if (error) throw new Error(error.message)
    if (data) return data as Record<string, unknown>
  }

  if (email) {
    const { data, error } = await db.from('profiles').select('*').eq('email', email).maybeSingle()
    if (error) throw new Error(error.message)
    if (data) return data as Record<string, unknown>
  }

  return null
}

export async function upsertProfile(input: UpsertProfileInput) {
  const db = requireSupabase()
  const existing = await findExistingProfile(input)
  const payload = {
    full_name: input.fullName.trim(),
    phone: cleanPhone(input.phone),
    id_card: cleanIdCard(input.idCard),
    email: cleanEmail(input.email),
    role: input.role ?? 'member',
    base_type: input.baseType ?? 'farmer',
    capabilities: input.capabilities ?? [],
    grade: input.grade ?? 'C',
    department: input.department ?? null,
    permissions: input.permissions ?? [],
    address: cleanText(input.address),
    province: cleanText(input.province),
    district: cleanText(input.district),
    subdistrict: cleanText(input.subdistrict),
    village: cleanText(input.village),
    status: input.status ?? null,
    updated_at: new Date().toISOString(),
  }

  if (existing?.id) {
    const { data, error } = await db.from('profiles').update(payload).eq('id', existing.id).select('*').single()
    if (error) throw new Error(`profiles update failed: ${error.message}`)
    if (!data?.id) throw new Error('profiles update failed: no profile returned')
    return { profile: data as Record<string, unknown>, mode: 'updated' as const }
  }

  const { data, error } = await db.from('profiles').insert(payload).select('*').single()
  if (error) throw new Error(`profiles insert failed: ${error.message}`)
  if (!data?.id) throw new Error('profiles insert failed: no profile returned')
  return { profile: data as Record<string, unknown>, mode: 'created' as const }
}

async function requireProfileExists(profileId: string) {
  const db = requireSupabase()
  const { data, error } = await db.from('profiles').select('id, base_type, role, capabilities').eq('id', profileId).maybeSingle()
  if (error) throw new Error(`profiles verify failed: ${error.message}`)
  if (!data?.id) throw new Error(`profiles verify failed: profile ${profileId} not found`)
  return data as Record<string, unknown>
}

export async function createAdminMember(input: CreateMemberInput) {
  const { profile, mode } = await upsertProfile({
    ...input,
    role: input.role ?? 'member',
    baseType: 'farmer',
    grade: input.grade ?? 'C',
    capabilities: input.capabilities ?? [],
    status: input.status ?? 'pending_leader',
  })

  const db = requireSupabase()
  const profileId = String(profile.id)
  await requireProfileExists(profileId)

  if (input.createFarmerRow ?? true) {
    const { data: existingFarmer, error: findErr } = await db.from('farmers').select('id').eq('profile_id', profileId).maybeSingle()
    if (findErr) throw new Error(findErr.message)

    const farmerPayload = {
      profile_id: profileId,
      code: input.code || genFarmerCode(),
      province: cleanText(input.province),
      district: cleanText(input.district),
      subdistrict: cleanText(input.subdistrict),
      village: cleanText(input.village) ?? cleanText(input.address),
      status: input.farmerStatus ?? input.status ?? 'pending',
      updated_at: new Date().toISOString(),
    }

    if (existingFarmer?.id) {
      const { error } = await db.from('farmers').update(farmerPayload).eq('id', existingFarmer.id)
      if (error) throw new Error(error.message)
    } else {
      const { error } = await db.from('farmers').insert(farmerPayload)
      if (error) throw new Error(error.message)
    }
  }

  return { profile, mode }
}

export async function createAdminVehicle(input: CreateVehicleInput) {
  const { profile, mode } = await upsertProfile({
    ...input,
    role: input.role ?? 'service',
    baseType: 'service',
    grade: input.grade ?? 'C',
    capabilities: input.capabilities ?? [],
    status: input.status ?? 'pending',
  })

  const db = requireSupabase()
  const profileId = String(profile.id)
  await requireProfileExists(profileId)

  const { data: existing, error: findErr } = await db.from('service_providers').select('id').eq('profile_id', profileId).maybeSingle()
  if (findErr) throw new Error(findErr.message)

  const servicePayload = {
    profile_id: profileId,
    vehicle_type: input.vehicleType,
    grade: input.grade ?? 'C',
    license_plate: cleanText(input.licensePlate),
    vehicle_year: input.vehicleYear ?? null,
    driver_name: cleanText(input.driverName),
    driver_phone: cleanPhone(input.driverPhone),
    status: input.serviceStatus ?? input.status ?? 'pending',
    updated_at: new Date().toISOString(),
  }

  if (existing?.id) {
    const { error } = await db.from('service_providers').update(servicePayload).eq('id', existing.id)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await db.from('service_providers').insert(servicePayload)
    if (error) throw new Error(error.message)
  }

  return { profile, mode }
}

export async function createAdminStaff(input: CreateStaffInput) {
  const capabilities = input.capabilities ?? []
  const role = capabilities.includes('manage_all')
    ? 'admin'
    : input.canFieldwork
      ? 'field'
      : capabilities.includes('can_inspect') || capabilities.includes('can_inspect_no_burn')
        ? 'inspector'
        : (input.role ?? 'field')

  const { profile, mode } = await upsertProfile({
    ...input,
    role,
    baseType: 'staff',
    grade: input.grade ?? 'C',
    capabilities,
    department: input.department,
    permissions: input.permissions,
    status: input.status ?? 'approved',
    // staff profile uses email for login; address/location is optional and usually blank
    address: input.address ?? '',
    province: input.province ?? '',
    district: input.district ?? '',
    subdistrict: input.subdistrict ?? '',
    village: input.village ?? '',
  })

  const db = requireSupabase()
  const profileId = String(profile.id)
  const verifiedProfile = await requireProfileExists(profileId)
  if (verifiedProfile.base_type !== 'staff') {
    throw new Error(`profiles sync failed: profile ${profileId} base_type is not staff`)
  }

  const { data: existing, error: findErr } = await db.from('staff_profiles').select('id').eq('profile_id', profileId).maybeSingle()
  if (findErr) throw new Error(findErr.message)

  const staffPayload = {
    profile_id: profileId,
    department: input.department,
    level: cleanText(input.level),
    can_fieldwork: Boolean(input.canFieldwork),
    permissions: input.permissions ?? [],
    updated_at: new Date().toISOString(),
  }

  if (existing?.id) {
    const { error } = await db.from('staff_profiles').update(staffPayload).eq('id', existing.id)
    if (error) throw new Error(`staff_profiles update failed: ${error.message}`)
  } else {
    const { error } = await db.from('staff_profiles').insert(staffPayload)
    if (error) throw new Error(`staff_profiles insert failed: ${error.message}`)
  }

  await requireProfileExists(profileId)
  return { profile, mode }
}
