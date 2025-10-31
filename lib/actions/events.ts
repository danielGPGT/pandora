"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { eventFormSchema, normalizeEventPayload, type EventFormValues } from "@/lib/validators/event"

async function getCurrentOrganizationId() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  const user = data.user
  if (!user) return null

  const { data: appUser } = await supabase
    .from("users")
    .select("organization_id,is_active")
    .eq("auth_id", user.id)
    .maybeSingle()

  if (appUser?.organization_id && appUser.is_active !== false) {
    return appUser.organization_id as string
  }

  return null
}

const eventSelect = `
  *,
  organization:organizations ( id, name )
`

export async function createEvent(values: EventFormValues) {
  const organizationId = await getCurrentOrganizationId()
  if (!organizationId) throw new Error("Unauthorized")

  const supabase = await createClient()
  const parsed = eventFormSchema.parse(values)
  const payload = {
    ...normalizeEventPayload(parsed),
    organization_id: organizationId,
  }

  const { data, error } = await supabase.from("events").insert(payload).select(eventSelect).single()

  if (error) {
    throw new Error(error.message || "Failed to create event")
  }

  revalidatePath("/events")
  return data
}

export async function updateEvent(id: string, values: EventFormValues) {
  const organizationId = await getCurrentOrganizationId()
  if (!organizationId) throw new Error("Unauthorized")

  const supabase = await createClient()
  const parsed = eventFormSchema.parse(values)
  const payload = normalizeEventPayload(parsed)

  const { data, error } = await supabase
    .from("events")
    .update(payload)
    .eq("id", id)
    .eq("organization_id", organizationId)
    .select(eventSelect)
    .single()

  if (error) {
    throw new Error(error.message || "Failed to update event")
  }

  revalidatePath(`/events`)
  revalidatePath(`/events/${id}`)
  return data
}

export async function setEventImage(id: string, imageUrl: string | null) {
  const organizationId = await getCurrentOrganizationId()
  if (!organizationId) throw new Error("Unauthorized")

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("events")
    .update({ event_image_url: imageUrl })
    .eq("id", id)
    .eq("organization_id", organizationId)
    .select(eventSelect)
    .single()

  if (error) {
    throw new Error(error.message || "Failed to update event image")
  }

  revalidatePath(`/events/${id}`)
  revalidatePath(`/events`)
  return data
}

async function duplicateEventInternal(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  id: string
) {
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
    .select(eventSelect)
    .single()

  if (insertError) {
    throw new Error(insertError.message || "Failed to duplicate event")
  }

  return inserted
}

export async function duplicateEvent(id: string) {
  const organizationId = await getCurrentOrganizationId()
  if (!organizationId) throw new Error("Unauthorized")

  const supabase = await createClient()
  const duplicated = await duplicateEventInternal(supabase, organizationId, id)
  revalidatePath("/events")
  return duplicated
}

export async function deleteEvent(id: string) {
  const organizationId = await getCurrentOrganizationId()
  if (!organizationId) throw new Error("Unauthorized")

  const supabase = await createClient()
  const { error } = await supabase
    .from("events")
    .delete()
    .eq("id", id)
    .eq("organization_id", organizationId)

  if (error) {
    throw new Error(error.message || "Failed to delete event")
  }

  revalidatePath("/events")
}

export async function bulkDeleteEvents(ids: string[]) {
  if (!ids.length) return
  const organizationId = await getCurrentOrganizationId()
  if (!organizationId) throw new Error("Unauthorized")

  const supabase = await createClient()
  const { error } = await supabase
    .from("events")
    .delete()
    .eq("organization_id", organizationId)
    .in("id", ids)

  if (error) {
    throw new Error(error.message || "Failed to delete events")
  }

  revalidatePath("/events")
}

export async function bulkDuplicateEvents(ids: string[]) {
  if (!ids.length) return
  const organizationId = await getCurrentOrganizationId()
  if (!organizationId) throw new Error("Unauthorized")

  const supabase = await createClient()

  for (const id of ids) {
    await duplicateEventInternal(supabase, organizationId, id)
  }

  revalidatePath("/events")
}



