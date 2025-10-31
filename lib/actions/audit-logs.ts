"use server"

import { createClient } from "@/lib/supabase/server"
import { z } from "zod"

const auditLogQuerySchema = z.object({
  entity_type: z.string().optional(),
  entity_id: z.string().uuid().optional(),
  action: z.string().optional(),
  changed_by: z.string().uuid().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  limit: z.number().default(50),
  offset: z.number().default(0),
})

async function getCurrentUserOrg() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  const user = data.user
  if (!user) return null

  const { data: appUser } = await supabase
    .from("users")
    .select("id,organization_id,is_active")
    .eq("auth_id", user.id)
    .maybeSingle()

  if (appUser?.organization_id && appUser.is_active !== false) {
    return { userId: user.id, userTableId: appUser.id, organization_id: appUser.organization_id as string }
  }

  return { userId: user.id, userTableId: appUser?.id, organization_id: null }
}

export async function getAuditLogs(params: z.infer<typeof auditLogQuerySchema>) {
  const auth = await getCurrentUserOrg()
  if (!auth || !auth.organization_id) throw new Error("Unauthorized")
  const supabase = await createClient()

  const validated = auditLogQuerySchema.parse(params)
  let query = supabase
    .from("audit_log")
    .select(`
      *,
      changed_by_user:users!audit_log_changed_by_fkey (
        id,
        email,
        first_name,
        last_name
      )
    `)
    .eq("organization_id", auth.organization_id)
    .order("changed_at", { ascending: false })
    .range(validated.offset, validated.offset + validated.limit - 1)

  if (validated.entity_type) {
    query = query.eq("entity_type", validated.entity_type)
  }

  if (validated.entity_id) {
    query = query.eq("entity_id", validated.entity_id)
  }

  if (validated.action) {
    query = query.eq("action", validated.action)
  }

  if (validated.changed_by) {
    query = query.eq("changed_by", validated.changed_by)
  }

  if (validated.start_date) {
    query = query.gte("changed_at", validated.start_date)
  }

  if (validated.end_date) {
    query = query.lte("changed_at", validated.end_date)
  }

  const { data: logs, error } = await query

  if (error) throw error

  // Get total count for pagination
  let countQuery = supabase
    .from("audit_log")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", auth.organization_id)

  if (validated.entity_type) {
    countQuery = countQuery.eq("entity_type", validated.entity_type)
  }

  if (validated.entity_id) {
    countQuery = countQuery.eq("entity_id", validated.entity_id)
  }

  if (validated.action) {
    countQuery = countQuery.eq("action", validated.action)
  }

  if (validated.changed_by) {
    countQuery = countQuery.eq("changed_by", validated.changed_by)
  }

  if (validated.start_date) {
    countQuery = countQuery.gte("changed_at", validated.start_date)
  }

  if (validated.end_date) {
    countQuery = countQuery.lte("changed_at", validated.end_date)
  }

  const { count } = await countQuery

  return { logs: logs || [], totalCount: count || 0 }
}

