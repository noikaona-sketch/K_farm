import { supabase } from './supabase'

export type AuditAction =
  | 'farm_created'
  | 'farm_updated'
  | 'farm_verified'
  | 'farm_rejected'
  | 'group_join_requested'
  | 'group_member_approved'
  | 'group_member_rejected'
  | 'no_burn_application_submitted'
  | 'no_burn_application_reviewed'
  | 'inspection_task_assigned'
  | 'inspection_submitted'
  | 'inspection_final_approved'
  | 'inspection_final_rejected'
  | 'permission_granted'
  | 'permission_removed'

export async function writeAuditLog(input: {
  actorId?: string | null
  action: AuditAction | string
  entityType: string
  entityId?: string | null
  beforeData?: unknown
  afterData?: unknown
  metadata?: Record<string, unknown>
}) {
  if (!supabase) return

  const { error } = await supabase.from('audit_logs').insert({
    actor_id: input.actorId ?? null,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    before_data: input.beforeData ?? null,
    after_data: input.afterData ?? null,
    metadata: input.metadata ?? {},
  })

  if (error) {
    console.warn('[audit_logs] write failed:', error.message)
  }
}
