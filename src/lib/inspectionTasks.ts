import { requireSupabase } from './supabase'
import { writeAuditLog } from './audit'

export type InspectionStatus = 'pending' | 'in_progress' | 'done' | 'cancelled'
export type InspectionType = 'general' | 'no_burn'

export interface InspectionTaskRecord {
  id: string
  team_id?: string | null
  member_id?: string | null
  farmer_id?: string | null
  farm_id?: string | null
  assigned_by?: string | null
  assigned_at?: string
  status: InspectionStatus
  due_date?: string | null
  result?: Record<string, unknown>
  inspection_type: InspectionType
  activity_application_id?: string | null
  approved_by?: string | null
  approved_at?: string | null
  farms?: {
    farm_name?: string | null
    province?: string | null
    district?: string | null
    subdistrict?: string | null
    village?: string | null
    area_rai?: number | null
    center_lat?: number | null
    center_lng?: number | null
    verified_status?: string | null
  } | null
}

export async function listMyInspectionTasks(input: {
  profileId: string
  inspectionType?: InspectionType | 'all'
  status?: InspectionStatus | 'all'
}) {
  const db = requireSupabase()
  let query = db
    .from('inspection_tasks')
    .select('*, farms(farm_name, province, district, subdistrict, village, area_rai, center_lat, center_lng, verified_status)')
    .eq('member_id', input.profileId)
    .order('assigned_at', { ascending: false })

  if (input.inspectionType && input.inspectionType !== 'all') query = query.eq('inspection_type', input.inspectionType)
  if (input.status && input.status !== 'all') query = query.eq('status', input.status)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as InspectionTaskRecord[]
}

export async function getInspectionTask(taskId: string) {
  const db = requireSupabase()
  const { data, error } = await db
    .from('inspection_tasks')
    .select('*, farms(farm_name, province, district, subdistrict, village, area_rai, center_lat, center_lng, verified_status)')
    .eq('id', taskId)
    .single()

  if (error) throw new Error(error.message)
  return data as InspectionTaskRecord
}

export async function submitInspectionResult(input: {
  taskId: string
  actorId?: string | null
  result: Record<string, unknown>
  status?: InspectionStatus
}) {
  const db = requireSupabase()
  const { data: before } = await db.from('inspection_tasks').select('*').eq('id', input.taskId).single()

  const { data, error } = await db
    .from('inspection_tasks')
    .update({
      result: input.result,
      status: input.status ?? 'done',
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.taskId)
    .select('*')
    .single()

  if (error) throw new Error(error.message)

  await writeAuditLog({
    actorId: input.actorId,
    action: 'inspection_submitted',
    entityType: 'inspection_task',
    entityId: input.taskId,
    beforeData: before ?? null,
    afterData: data,
  })

  return data as InspectionTaskRecord
}
