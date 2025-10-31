"use server"

import { createClient } from "@/lib/supabase/server"
import { headers } from "next/headers"

export type AuditAction = "create" | "update" | "delete" | "duplicate" | "bulk_delete" | "bulk_update" | "bulk_duplicate"

export interface AuditLogEntry {
  organization_id: string
  entity_type: string
  entity_id: string
  action: AuditAction
  old_values?: Record<string, any> | null
  new_values?: Record<string, any> | null
  changed_by?: string | null
}

export async function createAuditLog(entry: AuditLogEntry) {
  try {
    const supabase = await createClient()
    const headersList = await headers()
    
    // Get IP address and user agent
    const ipAddress = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || null
    const userAgent = headersList.get("user-agent") || null

    const { error } = await supabase.from("audit_log").insert({
      organization_id: entry.organization_id,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id,
      action: entry.action,
      old_values: entry.old_values || null,
      new_values: entry.new_values || null,
      changed_by: entry.changed_by || null,
      ip_address: ipAddress,
      user_agent: userAgent,
    })

    if (error) {
      console.error("Failed to create audit log:", error)
      // Don't throw - audit logging failures shouldn't break operations
    }
  } catch (err) {
    console.error("Audit log error:", err)
    // Silently fail - audit logging shouldn't break main operations
  }
}

