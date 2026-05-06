import { requireSupabase } from './supabase'
import { writeAuditLog } from './audit'

export type SaleHistoryStatus = 'unknown' | 'has_recent_sale' | 'has_old_sale' | 'no_sale_history' | 'import_required'
export type AdminReviewStatus = 'pending_review' | 'approved' | 'rejected' | 'need_more_data'
export type ApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'pending_admin_review'
  | 'approved_to_inspect'
  | 'inspection_assigned'
  | 'inspected'
  | 'approved'
  | 'rejected'
  | 'cancelled'

export interface ActivityRecord {
  id: string
  activity_name: string
  activity_type: string
  start_date?: string | null
  end_date?: string | null
  status: string
}

export interface NoBurnApplicationRecord {
  id: string
  activity_id: string
  member_id: string
  farm_id: string
  farm_season_id?: string | null
  sale_history_status: SaleHistoryStatus
  latest_sale_date?: string | null
  latest_sale_season?: string | null
  admin_review_status: AdminReviewStatus
  status: ApplicationStatus
  submitted_at: string
  reviewed_by?: string | null
  reviewed_at?: string | null
  review_note?: string | null
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
  activities?: ActivityRecord | null
}

export async function listActiveNoBurnActivities() {
  const db = requireSupabase()
  const { data, error } = await db
    .from('activities')
    .select('*')
    .eq('activity_type', 'no_burn')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as ActivityRecord[]
}

export async function ensureDefaultNoBurnActivity(actorId?: string | null) {
  const active = await listActiveNoBurnActivities()
  if (active.length > 0) return active[0]

  const db = requireSupabase()
  const { data, error } = await db
    .from('activities')
    .insert({
      activity_name: 'กิจกรรมไม่เผา',
      activity_type: 'no_burn',
      status: 'active',
      created_by: actorId ?? null,
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data as ActivityRecord
}

export async function submitNoBurnApplication(input: {
  activityId: string
  memberId: string
  farmId: string
  farmSeasonId?: string | null
  saleHistoryStatus?: SaleHistoryStatus
  latestSaleDate?: string | null
  latestSaleSeason?: string | null
  actorId?: string | null
}) {
  const db = requireSupabase()
  const payload = {
    activity_id: input.activityId,
    member_id: input.memberId,
    farm_id: input.farmId,
    farm_season_id: input.farmSeasonId ?? null,
    sale_history_status: input.saleHistoryStatus ?? 'unknown',
    latest_sale_date: input.latestSaleDate ?? null,
    latest_sale_season: input.latestSaleSeason ?? null,
    admin_review_status: 'pending_review',
    status: 'submitted',
  }

  const { data, error } = await db.from('activity_applications').insert(payload).select('*').single()
  if (error) throw new Error(error.message)

  await writeAuditLog({
    actorId: input.actorId ?? input.memberId,
    action: 'no_burn_application_submitted',
    entityType: 'activity_application',
    entityId: data.id,
    afterData: data,
  })

  return data as NoBurnApplicationRecord
}

export async function listNoBurnApplications(filters?: {
  adminReviewStatus?: AdminReviewStatus | 'all'
  memberId?: string
}) {
  const db = requireSupabase()
  let query = db
    .from('activity_applications')
    .select('*, farms(farm_name, province, district, subdistrict, village, area_rai, center_lat, center_lng, verified_status), activities(id, activity_name, activity_type, start_date, end_date, status)')
    .order('submitted_at', { ascending: false })

  if (filters?.memberId) query = query.eq('member_id', filters.memberId)
  if (filters?.adminReviewStatus && filters.adminReviewStatus !== 'all') query = query.eq('admin_review_status', filters.adminReviewStatus)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as NoBurnApplicationRecord[]
}

export async function reviewNoBurnApplication(input: {
  applicationId: string
  decision: AdminReviewStatus
  note?: string
  actorId?: string | null
}) {
  const db = requireSupabase()
  const { data: before } = await db.from('activity_applications').select('*').eq('id', input.applicationId).single()

  const status: ApplicationStatus = input.decision === 'approved'
    ? 'approved_to_inspect'
    : input.decision === 'rejected'
      ? 'rejected'
      : 'pending_admin_review'

  const { data, error } = await db
    .from('activity_applications')
    .update({
      admin_review_status: input.decision,
      status,
      reviewed_by: input.actorId ?? null,
      reviewed_at: new Date().toISOString(),
      review_note: input.note ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.applicationId)
    .select('*')
    .single()

  if (error) throw new Error(error.message)

  await writeAuditLog({
    actorId: input.actorId,
    action: 'no_burn_application_reviewed',
    entityType: 'activity_application',
    entityId: input.applicationId,
    beforeData: before ?? null,
    afterData: data,
    metadata: { decision: input.decision },
  })

  return data as NoBurnApplicationRecord
}

export async function assignNoBurnInspection(input: {
  applicationId: string
  inspectorProfileId: string
  farmId: string
  farmerProfileId: string
  actorId?: string | null
  dueDate?: string | null
}) {
  const db = requireSupabase()
  const { data: task, error: taskError } = await db
    .from('inspection_tasks')
    .insert({
      member_id: input.inspectorProfileId,
      farmer_id: input.farmerProfileId,
      farm_id: input.farmId,
      assigned_by: input.actorId ?? null,
      status: 'pending',
      due_date: input.dueDate ?? null,
      inspection_type: 'no_burn',
      activity_application_id: input.applicationId,
    })
    .select('*')
    .single()

  if (taskError) throw new Error(taskError.message)

  const { data: application, error: appError } = await db
    .from('activity_applications')
    .update({ status: 'inspection_assigned', updated_at: new Date().toISOString() })
    .eq('id', input.applicationId)
    .select('*')
    .single()

  if (appError) throw new Error(appError.message)

  await writeAuditLog({
    actorId: input.actorId,
    action: 'inspection_task_assigned',
    entityType: 'inspection_task',
    entityId: task.id,
    afterData: task,
    metadata: { applicationId: input.applicationId },
  })

  return { task, application }
}
