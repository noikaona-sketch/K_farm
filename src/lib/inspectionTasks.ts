import { requireSupabase } from './supabase'
import { writeAuditLog } from './audit'

export type InspectionStatus = 'pending' | 'in_progress' | 'done' | 'cancelled'
export type InspectionType = 'general' | 'no_burn'
export type FinalInspectionDecision = 'approved' | 'rejected'

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

export async function listSubmittedInspectionTasks(input?: {
  inspectionType?: InspectionType | 'all'
  finalState?: 'pending_final' | 'finalized' | 'all'
}) {
  const db = requireSupabase()
  let query = db
    .from('inspection_tasks')
    .select('*, farms(farm_name, province, district, subdistrict, village, area_rai, center_lat, center_lng, verified_status)')
    .eq('status', 'done')
    .order('updated_at', { ascending: false })

  if (input?.inspectionType && input.inspectionType !== 'all') query = query.eq('inspection_type', input.inspectionType)
  if (input?.finalState === 'pending_final') query = query.is('approved_at', null)
  if (input?.finalState === 'finalized') query = query.not('approved_at', 'is', null)

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

  if (data.activity_application_id) {
    await db
      .from('activity_applications')
      .update({ status: 'inspected', updated_at: new Date().toISOString() })
      .eq('id', data.activity_application_id)
  }

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

export async function finalReviewInspectionTask(input: {
  taskId: string
  decision: FinalInspectionDecision
  actorId?: string | null
  note?: string
}) {
  const db = requireSupabase()
  const { data: before } = await db.from('inspection_tasks').select('*').eq('id', input.taskId).single()

  const existingResult = (before?.result && typeof before.result === 'object') ? before.result as Record<string, unknown> : {}
  const finalResult = {
    ...existingResult,
    final_decision: input.decision,
    final_note: input.note ?? null,
    final_reviewed_at: new Date().toISOString(),
    final_reviewed_by: input.actorId ?? null,
  }

  const { data, error } = await db
    .from('inspection_tasks')
    .update({
      result: finalResult,
      approved_by: input.actorId ?? null,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.taskId)
    .select('*')
    .single()

  if (error) throw new Error(error.message)

  if (data.activity_application_id) {
    await db
      .from('activity_applications')
      .update({
        status: input.decision === 'approved' ? 'approved' : 'rejected',
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.activity_application_id)
  }

  await writeAuditLog({
    actorId: input.actorId,
    action: input.decision === 'approved' ? 'inspection_final_approved' : 'inspection_final_rejected',
    entityType: 'inspection_task',
    entityId: input.taskId,
    beforeData: before ?? null,
    afterData: data,
    metadata: { decision: input.decision, note: input.note ?? null },
  })

  return data as InspectionTaskRecord
}
