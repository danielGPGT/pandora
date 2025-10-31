"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAuditLog } from "@/lib/audit/audit-log"
import { eventFormSchema, normalizeEventPayload, type EventFormValues } from "@/lib/validators/event"

type AuthContext = {
  userId: string
  userTableId: string | null
  organization_id: string
}

async function getCurrentUserOrg(): Promise<AuthContext | null> {
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .maybeSingle()

  if (profile?.organization_id) {
    const { data: appUserByProfile } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", user.id)
      .maybeSingle()
    return { userId: user.id, userTableId: appUserByProfile?.id ?? null, organization_id: profile.organization_id as string }
  }

  const { data: defaultMembership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("is_default", true)
    .maybeSingle()

  if (defaultMembership?.organization_id) {
    const { data: appUserByMember } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", user.id)
      .maybeSingle()
    return {
      userId: user.id,
      userTableId: appUserByMember?.id ?? null,
      organization_id: defaultMembership.organization_id as string,
    }
  }

  const { data: anyMembership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle()

  if (anyMembership?.organization_id) {
    const { data: appUserByMember } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", user.id)
      .maybeSingle()
    return {
      userId: user.id,
      userTableId: appUserByMember?.id ?? null,
      organization_id: anyMembership.organization_id as string,
    }
  }

  const { data: fallbackUser } = await supabase
    .from("users")
    .select("id,organization_id")
    .eq("auth_id", user.id)
    .maybeSingle()

  if (fallbackUser?.organization_id) {
    return {
      userId: user.id,
      userTableId: fallbackUser.id ?? null,
      organization_id: fallbackUser.organization_id as string,
    }
  }

  return null
}

export async function createEvent(values: EventFormValues) {
  const auth = await getCurrentUserOrg()
  if (!auth || !auth.organization_id) throw new Error("Unauthorized")

  const supabase = await createClient()
  const parsed = eventFormSchema.parse(values)
  const payload = {
    ...normalizeEventPayload(parsed),
    organization_id: auth.organization_id,
  }

  const { data, error } = await supabase.from("events").insert(payload).select("*").single()

  if (error) {
    throw new Error(error.message || "Failed to create event")
  }

  await createAuditLog({
    organization_id: auth.organization_id,
    entity_type: "event",
    entity_id: data.id,
    action: "create",
    old_values: null,
    new_values: data,
    changed_by: auth.userTableId || null,
  })

  revalidatePath("/events")
  revalidatePath(`/events/${data.id}`)
  return data
}

export async function updateEvent(id: string, values: EventFormValues) {
  const auth = await getCurrentUserOrg()
  if (!auth || !auth.organization_id) throw new Error("Unauthorized")

  const supabase = await createClient()
  const parsed = eventFormSchema.parse(values)
  const payload = normalizeEventPayload(parsed)

  const { data: existing, error: fetchError } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .eq("organization_id", auth.organization_id)
    .maybeSingle()

  if (fetchError) {
    throw new Error(fetchError.message || "Failed to load event")
  }

  const { data, error } = await supabase
    .from("events")
    .update(payload)
    .eq("id", id)
    .eq("organization_id", auth.organization_id)
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message || "Failed to update event")
  }

  await createAuditLog({
    organization_id: auth.organization_id,
    entity_type: "event",
    entity_id: id,
    action: "update",
    old_values: existing ?? null,
    new_values: data,
    changed_by: auth.userTableId || null,
  })

  revalidatePath(`/events`)
  revalidatePath(`/events/${id}`)
  return data
}

export async function setEventImage(id: string, imageUrl: string | null) {
  const auth = await getCurrentUserOrg()
  if (!auth || !auth.organization_id) throw new Error("Unauthorized")

  const supabase = await createClient()

  const { data: existing, error: fetchError } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .eq("organization_id", auth.organization_id)
    .maybeSingle()

  if (fetchError) {
    throw new Error(fetchError.message || "Failed to load event")
  }

  const { data, error } = await supabase
    .from("events")
    .update({ event_image_url: imageUrl })
    .eq("id", id)
    .eq("organization_id", auth.organization_id)
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message || "Failed to update event image")
  }

  await createAuditLog({
    organization_id: auth.organization_id,
    entity_type: "event",
    entity_id: id,
    action: "update",
    old_values: existing ?? null,
    new_values: data,
    changed_by: auth.userTableId || null,
  })

  revalidatePath(`/events/${id}`)
  revalidatePath(`/events`)
  return data
}

async function duplicateEventInternal(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  id: string
): Promise<{ inserted: any; original: any }> {
  const { data: original, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .eq("organization_id", organizationId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message || "Failed to load event")
  }

  if (!original) {
    throw new Error("Event not found")
  }

  const baseName = original.event_name || "Untitled Event"
  let copyName = `${baseName} (Copy)`
  let nameCounter = 1

  while (true) {
    const { data: existing, error: existingError } = await supabase
      .from("events")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("event_name", copyName)
      .limit(1)

    if (existingError) {
      throw new Error(existingError.message || "Failed to check event name availability")
    }

    if (!existing || existing.length === 0) break
    nameCounter += 1
    copyName = `${baseName} (Copy ${nameCounter})`
  }

  let newCode = original.event_code ? `${original.event_code}-COPY` : null

  if (newCode) {
    let codeCounter = 1
    while (true) {
      const { data: existingCode, error: existingCodeError } = await supabase
        .from("events")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("event_code", newCode)
        .limit(1)

      if (existingCodeError) {
        throw new Error(existingCodeError.message || "Failed to check event code availability")
      }

      if (!existingCode || existingCode.length === 0) break
      codeCounter += 1
      newCode = `${original.event_code}-COPY-${codeCounter}`
    }
  }

  const insertPayload = {
    organization_id: organizationId,
    event_name: copyName,
    event_code: newCode,
    event_type: original.event_type,
    venue_name: original.venue_name,
    city: original.city,
    country: original.country,
    event_date_from: original.event_date_from,
    event_date_to: original.event_date_to,
    event_status: original.event_status,
    description: original.description,
    event_image_url: original.event_image_url ?? null,
  }

  const { data: inserted, error: insertError } = await supabase
    .from("events")
    .insert(insertPayload)
    .select("*")
    .single()

  if (insertError) {
    throw new Error(insertError.message || "Failed to duplicate event")
  }

  return { inserted, original }
}

export async function duplicateEvent(id: string) {
  const auth = await getCurrentUserOrg()
  if (!auth || !auth.organization_id) throw new Error("Unauthorized")

  const supabase = await createClient()
  const { inserted, original } = await duplicateEventInternal(supabase, auth.organization_id, id)

  await createAuditLog({
    organization_id: auth.organization_id,
    entity_type: "event",
    entity_id: inserted.id,
    action: "duplicate",
    old_values: original,
    new_values: inserted,
    changed_by: auth.userTableId || null,
  })

  revalidatePath("/events")
  revalidatePath(`/events/${inserted.id}`)
  return inserted
}

export async function deleteEvent(id: string) {
  const auth = await getCurrentUserOrg()
  if (!auth || !auth.organization_id) throw new Error("Unauthorized")

  const supabase = await createClient()

  const { data: existing } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .eq("organization_id", auth.organization_id)
    .maybeSingle()

  const { error } = await supabase
    .from("events")
    .delete()
    .eq("id", id)
    .eq("organization_id", auth.organization_id)

  if (error) {
    throw new Error(error.message || "Failed to delete event")
  }

  if (existing) {
    await createAuditLog({
      organization_id: auth.organization_id,
      entity_type: "event",
      entity_id: id,
      action: "delete",
      old_values: existing,
      new_values: null,
      changed_by: auth.userTableId || null,
    })
  }

  revalidatePath("/events")
}

export async function bulkDeleteEvents(ids: string[]) {
  if (!ids.length) return
  const auth = await getCurrentUserOrg()
  if (!auth || !auth.organization_id) throw new Error("Unauthorized")

  const supabase = await createClient()

  const { data: existing } = await supabase
    .from("events")
    .select("*")
    .eq("organization_id", auth.organization_id)
    .in("id", ids)

  const { error } = await supabase
    .from("events")
    .delete()
    .eq("organization_id", auth.organization_id)
    .in("id", ids)

  if (error) {
    throw new Error(error.message || "Failed to delete events")
  }

  if (existing) {
    for (const event of existing) {
      await createAuditLog({
        organization_id: auth.organization_id,
        entity_type: "event",
        entity_id: event.id,
        action: "bulk_delete",
        old_values: event,
        new_values: null,
        changed_by: auth.userTableId || null,
      })
    }
  }

  revalidatePath("/events")
}

export async function bulkDuplicateEvents(ids: string[]) {
  if (!ids.length) return
  const auth = await getCurrentUserOrg()
  if (!auth || !auth.organization_id) throw new Error("Unauthorized")

  const supabase = await createClient()

  const duplicates: Array<{ inserted: any; original: any }> = []
  for (const id of ids) {
    duplicates.push(await duplicateEventInternal(supabase, auth.organization_id, id))
  }

  for (const { inserted, original } of duplicates) {
    await createAuditLog({
      organization_id: auth.organization_id,
      entity_type: "event",
      entity_id: inserted.id,
      action: "bulk_duplicate",
      old_values: original,
      new_values: inserted,
      changed_by: auth.userTableId || null,
    })
  }

  revalidatePath("/events")
}



