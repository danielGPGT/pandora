"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { supplierSchema, type SupplierFormData } from "@/lib/suppliers/schema"
import { createAuditLog } from "@/lib/audit/audit-log"

// schema now shared via lib/suppliers/schema

async function getCurrentUserOrg() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  const user = data.user
  if (!user) return null

  // 0) Your schema: map auth user -> public.users by auth_id
  const { data: appUser } = await supabase
    .from("users")
    .select("id,organization_id,is_active")
    .eq("auth_id", user.id)
    .maybeSingle()

  if (appUser?.organization_id && appUser.is_active !== false) {
    return { userId: user.id, userTableId: appUser.id, organization_id: appUser.organization_id as string }
  }

  // 1) Prefer explicit org on profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .maybeSingle()

  if (profile?.organization_id) {
    // Try to get user ID from users table
    const { data: appUserByProfile } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", user.id)
      .maybeSingle()
    return { userId: user.id, userTableId: appUserByProfile?.id, organization_id: profile.organization_id as string }
  }

  // 2) Fallback: default membership from organization_members
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
    return { userId: user.id, userTableId: appUserByMember?.id, organization_id: defaultMembership.organization_id as string }
  }

  // 3) Fallback: any membership
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
    return { userId: user.id, userTableId: appUserByMember?.id, organization_id: anyMembership.organization_id as string }
  }

  const { data: appUserFallback } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .maybeSingle()

  return { userId: user.id, userTableId: appUserFallback?.id, organization_id: null }
}

export async function createSupplier(data: SupplierFormData) {
  const auth = await getCurrentUserOrg()
  if (!auth || !auth.organization_id) throw new Error("Unauthorized")

  const validated = supplierSchema.parse(data)
  const supabase = await createClient()

  // Optional friendly check for duplicate codes within org
  const { data: existing } = await supabase
    .from("suppliers")
    .select("id")
    .eq("organization_id", auth.organization_id)
    .eq("code", validated.code)
    .limit(1)
  if (existing && existing.length > 0) {
    throw new Error("Supplier code already exists in your organization")
  }

  const { data: supplier, error } = await supabase
    .from("suppliers")
    .insert({ ...validated, organization_id: auth.organization_id })
    .select()
    .single()

  if (error) {
    // Surface clearer server-side error to the client
    console.error("createSupplier insert error", { message: error.message, details: error.details, hint: error.hint })
    throw new Error(error.message || "Insert failed")
  }

  // Audit log
  await createAuditLog({
    organization_id: auth.organization_id,
    entity_type: "supplier",
    entity_id: supplier.id,
    action: "create",
    old_values: null,
    new_values: supplier,
    changed_by: auth.userTableId || null,
  })

  revalidatePath("/suppliers")
  return supplier
}

export async function updateSupplier(id: string, data: Partial<SupplierFormData>) {
  const auth = await getCurrentUserOrg()
  if (!auth || !auth.organization_id) throw new Error("Unauthorized")
  const supabase = await createClient()

  // Get old values for audit log
  const { data: oldSupplier } = await supabase
    .from("suppliers")
    .select("*")
    .eq("id", id)
    .eq("organization_id", auth.organization_id)
    .single()

  const { data: supplier, error } = await supabase
    .from("suppliers")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", auth.organization_id)
    .select()
    .single()

  if (error) throw error

  // Audit log
  await createAuditLog({
    organization_id: auth.organization_id,
    entity_type: "supplier",
    entity_id: id,
    action: "update",
    old_values: oldSupplier || null,
    new_values: supplier,
    changed_by: auth.userTableId || null,
  })

  revalidatePath("/suppliers")
  revalidatePath(`/suppliers/${id}`)
  return supplier
}

export async function deleteSupplier(id: string) {
  const auth = await getCurrentUserOrg()
  if (!auth || !auth.organization_id) throw new Error("Unauthorized")
  const supabase = await createClient()

  // Get old values for audit log before deletion
  const { data: oldSupplier } = await supabase
    .from("suppliers")
    .select("*")
    .eq("id", id)
    .eq("organization_id", auth.organization_id)
    .single()

  const { data: contracts } = await supabase
    .from("contracts")
    .select("id")
    .eq("supplier_id", id)
    .limit(1)

  if (contracts && contracts.length > 0) {
    throw new Error("Cannot delete supplier with existing contracts")
  }

  const { error } = await supabase
    .from("suppliers")
    .delete()
    .eq("id", id)
    .eq("organization_id", auth.organization_id)

  if (error) throw error

  // Audit log
  await createAuditLog({
    organization_id: auth.organization_id,
    entity_type: "supplier",
    entity_id: id,
    action: "delete",
    old_values: oldSupplier || null,
    new_values: null,
    changed_by: auth.userTableId || null,
  })

  revalidatePath("/suppliers")
}

export async function getSupplierWithContracts(id: string) {
  const auth = await getCurrentUserOrg()
  if (!auth || !auth.organization_id) throw new Error("Unauthorized")
  const supabase = await createClient()

  const { data: supplier, error } = await supabase
    .from("suppliers")
    .select(`
      *,
      contracts (*, event:events ( event_name, event_code ))
    `)
    .eq("id", id)
    .eq("organization_id", auth.organization_id)
    .single()

  if (error) throw error
  return supplier
}

export async function checkSupplierCodeUnique(code: string, excludeId?: string) {
  const auth = await getCurrentUserOrg()
  if (!auth || !auth.organization_id) throw new Error("Unauthorized")
  const supabase = await createClient()

  let query = supabase
    .from("suppliers")
    .select("id")
    .eq("organization_id", auth.organization_id)
    .eq("code", code)

  if (excludeId) query = query.neq("id", excludeId)

  const { data } = await query.limit(1)
  return !data || data.length === 0
}

export async function duplicateSupplier(id: string) {
  const auth = await getCurrentUserOrg()
  if (!auth || !auth.organization_id) throw new Error("Unauthorized")
  const supabase = await createClient()

  // Get the original supplier
  const { data: original, error: fetchError } = await supabase
    .from("suppliers")
    .select("*")
    .eq("id", id)
    .eq("organization_id", auth.organization_id)
    .single()

  if (fetchError || !original) {
    throw new Error("Supplier not found")
  }

  // Generate a new unique code
  let newCode = `${original.code}-COPY`
  let counter = 1
  while (true) {
    const { data: existing } = await supabase
      .from("suppliers")
      .select("id")
      .eq("organization_id", auth.organization_id)
      .eq("code", newCode)
      .limit(1)

    if (!existing || existing.length === 0) break
    newCode = `${original.code}-COPY-${counter}`
    counter++
    if (counter > 100) {
      // Fallback: use timestamp
      newCode = `${original.code}-${Date.now()}`
      break
    }
  }

  // Create duplicate with new code
  const duplicateData: SupplierFormData = {
    name: `${original.name} (Copy)`,
    code: newCode,
    supplier_type: original.supplier_type || undefined,
    email: original.email || undefined,
    phone: original.phone || undefined,
    contact_info: original.contact_info && Array.isArray(original.contact_info) ? original.contact_info : undefined,
    address_line1: original.address_line1 || undefined,
    city: original.city || undefined,
    country: original.country || undefined,
    default_currency: original.default_currency || "USD",
    is_active: original.is_active ?? true,
    notes: original.notes || undefined,
  }

  const validated = supplierSchema.parse(duplicateData)

  const { data: duplicated, error } = await supabase
    .from("suppliers")
    .insert({ ...validated, organization_id: auth.organization_id })
    .select()
    .single()

  if (error) {
    console.error("duplicateSupplier insert error", { message: error.message, details: error.details, hint: error.hint })
    throw new Error(error.message || "Duplicate failed")
  }

  // Audit log
  await createAuditLog({
    organization_id: auth.organization_id,
    entity_type: "supplier",
    entity_id: duplicated.id,
    action: "duplicate",
    old_values: original,
    new_values: duplicated,
    changed_by: auth.userTableId || null,
  })

  revalidatePath("/suppliers")
  return duplicated
}

export async function bulkDeleteSuppliers(ids: string[]) {
  const auth = await getCurrentUserOrg()
  if (!auth || !auth.organization_id) throw new Error("Unauthorized")
  const supabase = await createClient()

  // Get old values for audit log before deletion
  const { data: oldSuppliers } = await supabase
    .from("suppliers")
    .select("*")
    .in("id", ids)
    .eq("organization_id", auth.organization_id)

  // Check for existing contracts
  const { data: contracts } = await supabase
    .from("contracts")
    .select("supplier_id")
    .in("supplier_id", ids)
    .limit(1)

  if (contracts && contracts.length > 0) {
    throw new Error("Cannot delete suppliers with existing contracts")
  }

  const { error } = await supabase
    .from("suppliers")
    .delete()
    .in("id", ids)
    .eq("organization_id", auth.organization_id)

  if (error) throw error

  // Audit log - log each deleted supplier
  if (oldSuppliers) {
    for (const oldSupplier of oldSuppliers) {
      await createAuditLog({
        organization_id: auth.organization_id,
        entity_type: "supplier",
        entity_id: oldSupplier.id,
        action: "bulk_delete",
        old_values: oldSupplier,
        new_values: null,
        changed_by: auth.userTableId || null,
      })
    }
  }

  revalidatePath("/suppliers")
}

export async function bulkUpdateSupplierStatus(ids: string[], isActive: boolean) {
  const auth = await getCurrentUserOrg()
  if (!auth || !auth.organization_id) throw new Error("Unauthorized")
  const supabase = await createClient()

  // Get old values for audit log
  const { data: oldSuppliers } = await supabase
    .from("suppliers")
    .select("*")
    .in("id", ids)
    .eq("organization_id", auth.organization_id)

  const { error } = await supabase
    .from("suppliers")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .in("id", ids)
    .eq("organization_id", auth.organization_id)

  if (error) throw error

  // Get new values for audit log
  const { data: newSuppliers } = await supabase
    .from("suppliers")
    .select("*")
    .in("id", ids)
    .eq("organization_id", auth.organization_id)

  // Audit log - log each updated supplier
  if (oldSuppliers && newSuppliers) {
    for (let i = 0; i < ids.length; i++) {
      const oldSupplier = oldSuppliers.find((s) => s.id === ids[i])
      const newSupplier = newSuppliers.find((s) => s.id === ids[i])
      if (oldSupplier && newSupplier) {
        await createAuditLog({
          organization_id: auth.organization_id,
          entity_type: "supplier",
          entity_id: ids[i],
          action: "bulk_update",
          old_values: oldSupplier,
          new_values: newSupplier,
          changed_by: auth.userTableId || null,
        })
      }
    }
  }

  revalidatePath("/suppliers")
}

export async function bulkDuplicateSuppliers(ids: string[]) {
  const auth = await getCurrentUserOrg()
  if (!auth || !auth.organization_id) throw new Error("Unauthorized")
  
  // Duplicate each supplier sequentially
  const results = []
  for (const id of ids) {
    try {
      const duplicated = await duplicateSupplier(id)
      results.push(duplicated)
    } catch (err) {
      console.error(`Failed to duplicate supplier ${id}:`, err)
      throw err
    }
  }
  
  // Audit log for each duplicate
  for (const duplicated of results) {
    await createAuditLog({
      organization_id: auth.organization_id,
      entity_type: "supplier",
      entity_id: duplicated.id,
      action: "bulk_duplicate",
      old_values: null, // Original is in the duplicate function's audit log
      new_values: duplicated,
      changed_by: auth.userTableId || null,
    })
  }

  return results
}


