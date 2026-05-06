import { requireSupabase } from './supabase'
import { writeAuditLog } from './audit'

export type FarmVerifiedStatus = 'draft' | 'pending_verify' | 'verified' | 'rejected' | 'merged_duplicate'

export interface FarmRecord {
  id: string
  profile_id: string
  farm_code?: string | null
  farm_name?: string | null
  province?: string | null
  district?: string | null
  subdistrict?: string | null
  village?: string | null
  area_rai?: number | null
  center_lat?: number | null
  center_lng?: number | null
  crop_type?: string | null
  ownership_type?: string | null
  status: string
  verified_status: FarmVerifiedStatus
  source?: string | null
  created_by?: string | null
  verified_by?: string | null
  verified_at?: string | null
  created_at?: string
  updated_at?: string
}

export interface CreateFarmInput {
  profileId: string
  farmName?: string
  province?: string
  district?: string
  subdistrict?: string
  village?: string
  areaRai?: number | null
  centerLat?: number | null
  centerLng?: number | null
  cropType?: string
  ownershipType?: string
  source?: 'farmer_self' | 'field_staff' | 'truck_team' | 'imported' | 'satellite'
  actorId?: string | null
}

export async function createFarm(input: CreateFarmInput) {
  const db = requireSupabase()
  const payload = {
    profile_id: input.profileId,
    farm_name: input.farmName?.trim() || null,
    province: input.province?.trim() || null,
    district: input.district?.trim() || null,
    subdistrict: input.subdistrict?.trim() || null,
    village: input.village?.trim() || null,
    area_rai: input.areaRai ?? null,
    center_lat: input.centerLat ?? null,
    center_lng: input.centerLng ?? null,
    crop_type: input.cropType?.trim() || null,
    ownership_type: input.ownershipType?.trim() || null,
    source: input.source ?? 'field_staff',
    verified_status: 'pending_verify',
    status: 'active',
    created_by: input.actorId ?? null,
  }

  const { data, error } = await db.from('farms').insert(payload).select('*').single()
  if (error) throw new Error(error.message)

  await writeAuditLog({
    actorId: input.actorId,
    action: 'farm_created',
    entityType: 'farm',
    entityId: data.id,
    afterData: data,
  })

  return data as FarmRecord
}

export async function listFarms(filters?: {
  profileId?: string
  province?: string
  district?: string
  subdistrict?: string
  verifiedStatus?: FarmVerifiedStatus | 'all'
}) {
  const db = requireSupabase()
  let query = db.from('farms').select('*').order('created_at', { ascending: false })

  if (filters?.profileId) query = query.eq('profile_id', filters.profileId)
  if (filters?.province) query = query.eq('province', filters.province)
  if (filters?.district) query = query.eq('district', filters.district)
  if (filters?.subdistrict) query = query.eq('subdistrict', filters.subdistrict)
  if (filters?.verifiedStatus && filters.verifiedStatus !== 'all') {
    query = query.eq('verified_status', filters.verifiedStatus)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as FarmRecord[]
}

export async function updateFarmVerification(input: {
  farmId: string
  status: Extract<FarmVerifiedStatus, 'verified' | 'rejected'>
  actorId?: string | null
}) {
  const db = requireSupabase()
  const { data: before } = await db.from('farms').select('*').eq('id', input.farmId).single()

  const { data, error } = await db
    .from('farms')
    .update({
      verified_status: input.status,
      verified_by: input.actorId ?? null,
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.farmId)
    .select('*')
    .single()

  if (error) throw new Error(error.message)

  await writeAuditLog({
    actorId: input.actorId,
    action: input.status === 'verified' ? 'farm_verified' : 'farm_rejected',
    entityType: 'farm',
    entityId: input.farmId,
    beforeData: before ?? null,
    afterData: data,
  })

  return data as FarmRecord
}

export function googleMapsUrl(lat?: number | null, lng?: number | null) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return ''
  return `https://www.google.com/maps?q=${lat},${lng}`
}
