"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import { createAuditLog } from "@/lib/audit/audit-log"

type AuthContext = {
  userId: string
  userTableId: string | null
  organization_id: string
}

const optionSchema = z.object({
  option_name: z.string().min(1, "Option name is required"),
  option_code: z.string().min(1, "Option code is required"),
  description: z.string().optional().nullable(),
  attributes: z.any().optional(),
  is_active: z.boolean().optional().default(true),
})

export type ProductOptionInput = z.input<typeof optionSchema>
export type ProductOptionPayload = z.output<typeof optionSchema>

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
    return {
      userId: user.id,
      userTableId: appUser.id,
      organization_id: appUser.organization_id as string,
    }
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("is_default", true)
    .maybeSingle()

  if (membership?.organization_id) {
    const { data: userRow } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", user.id)
      .maybeSingle()
    return {
      userId: user.id,
      userTableId: userRow?.id ?? null,
      organization_id: membership.organization_id as string,
    }
  }

  return null
}

async function ensureProductOwnership(productId: string, organizationId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("products")
    .select("id")
    .eq("id", productId)
    .eq("organization_id", organizationId)
    .maybeSingle()

  if (error || !data) {
    throw new Error("Product not found or access denied")
  }
}

async function getNextSortOrder(productId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("product_options")
    .select("sort_order")
    .eq("product_id", productId)
    .order("sort_order", { ascending: false, nullsFirst: false })
    .limit(1)

  const current = data?.[0]?.sort_order ?? 0
  return (current ?? 0) + 100
}

function normalizePayload(values: ProductOptionInput): ProductOptionPayload {
  const parsedResult = optionSchema.safeParse(values)
  if (!parsedResult.success) {
    console.error("product option payload validation failed", parsedResult.error.flatten())
    throw new Error("Invalid product option payload")
  }
  const parsed = parsedResult.data
  return {
    ...parsed,
    description: parsed.description ?? null,
    attributes: typeof parsed.attributes === "object" && parsed.attributes !== null ? parsed.attributes : {},
    is_active: parsed.is_active ?? true,
  }
}

export async function createProductOption(productId: string, values: ProductOptionInput) {
  const auth = await getCurrentUserOrg()
  if (!auth) throw new Error("Unauthorized")

  await ensureProductOwnership(productId, auth.organization_id)

  const supabase = await createClient()
  const payload = normalizePayload(values)
  const sortOrder = await getNextSortOrder(productId)

  const { data, error } = await supabase
    .from("product_options")
    .insert({
      product_id: productId,
      ...payload,
      sort_order: sortOrder,
    })
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message || "Failed to create product option")
  }

  await createAuditLog({
    organization_id: auth.organization_id,
    entity_type: "product_option",
    entity_id: data.id,
    action: "create",
    old_values: null,
    new_values: data,
    changed_by: auth.userTableId,
  })

  revalidatePath(`/products/${productId}`)
  revalidatePath("/products")
  return data
}

export async function updateProductOption(optionId: string, values: ProductOptionInput) {
  const auth = await getCurrentUserOrg()
  if (!auth) throw new Error("Unauthorized")

  const supabase = await createClient()
  const { data: existing, error: existingError } = await supabase
    .from("product_options")
    .select("*")
    .eq("id", optionId)
    .maybeSingle()

  if (existingError || !existing) {
    throw new Error("Product option not found")
  }

  await ensureProductOwnership(existing.product_id, auth.organization_id)

  const payload = normalizePayload(values)

  const { data, error } = await supabase
    .from("product_options")
    .update(payload)
    .eq("id", optionId)
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message || "Failed to update product option")
  }

  await createAuditLog({
    organization_id: auth.organization_id,
    entity_type: "product_option",
    entity_id: optionId,
    action: "update",
    old_values: existing,
    new_values: data,
    changed_by: auth.userTableId,
  })

  revalidatePath(`/products/${existing.product_id}`)
  revalidatePath("/products")
  return data
}

export async function duplicateProductOption(optionId: string) {
  const auth = await getCurrentUserOrg()
  if (!auth) throw new Error("Unauthorized")

  const supabase = await createClient()
  const { data: existing, error: existingError } = await supabase
    .from("product_options")
    .select("*")
    .eq("id", optionId)
    .maybeSingle()

  if (existingError || !existing) {
    throw new Error("Product option not found")
  }

  await ensureProductOwnership(existing.product_id, auth.organization_id)

  const baseName = existing.option_name || "Untitled Option"
  let name = `${baseName} (Copy)`
  let counter = 2

  while (true) {
    const { data: conflict } = await supabase
      .from("product_options")
      .select("id")
      .eq("product_id", existing.product_id)
      .eq("option_name", name)
      .limit(1)

    if (!conflict || conflict.length === 0) break
    name = `${baseName} (Copy ${counter})`
    counter += 1
  }

  let codeBase = `${existing.option_code}-COPY`
  let codeCounter = 1
  while (true) {
    const { data: codeConflict } = await supabase
      .from("product_options")
      .select("id")
      .eq("product_id", existing.product_id)
      .eq("option_code", codeBase)
      .limit(1)

    if (!codeConflict || codeConflict.length === 0) break
    codeBase = `${existing.option_code}-COPY-${codeCounter}`
    codeCounter += 1
  }

  const sortOrder = await getNextSortOrder(existing.product_id)

  const { data, error } = await supabase
    .from("product_options")
    .insert({
      product_id: existing.product_id,
      option_name: name,
      option_code: codeBase,
      description: existing.description,
      attributes: existing.attributes ?? {},
      is_active: existing.is_active ?? true,
      sort_order: sortOrder,
    })
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message || "Failed to duplicate product option")
  }

  await createAuditLog({
    organization_id: auth.organization_id,
    entity_type: "product_option",
    entity_id: data.id,
    action: "duplicate",
    old_values: existing,
    new_values: data,
    changed_by: auth.userTableId,
  })

  revalidatePath(`/products/${existing.product_id}`)
  revalidatePath("/products")
  return data
}

export async function deleteProductOption(optionId: string) {
  const auth = await getCurrentUserOrg()
  if (!auth) throw new Error("Unauthorized")

  const supabase = await createClient()
  const { data: existing, error: existingError } = await supabase
    .from("product_options")
    .select("*")
    .eq("id", optionId)
    .maybeSingle()

  if (existingError || !existing) {
    throw new Error("Product option not found")
  }

  await ensureProductOwnership(existing.product_id, auth.organization_id)

  const { error } = await supabase
    .from("product_options")
    .delete()
    .eq("id", optionId)

  if (error) {
    throw new Error(error.message || "Failed to delete product option")
  }

  await createAuditLog({
    organization_id: auth.organization_id,
    entity_type: "product_option",
    entity_id: optionId,
    action: "delete",
    old_values: existing,
    new_values: null,
    changed_by: auth.userTableId,
  })

  revalidatePath(`/products/${existing.product_id}`)
  revalidatePath("/products")
}

export async function bulkUpdateProductOptionStatus(optionIds: string[], isActive: boolean) {
  if (!optionIds.length) return
  const auth = await getCurrentUserOrg()
  if (!auth) throw new Error("Unauthorized")

  const supabase = await createClient()
  const { data: existing } = await supabase
    .from("product_options")
    .select("*")
    .in("id", optionIds)

  if (!existing || !existing.length) return

  const productId = existing[0].product_id
  await ensureProductOwnership(productId, auth.organization_id)

  const { error, data: updated } = await supabase
    .from("product_options")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .in("id", optionIds)
    .select("*")

  if (error) {
    throw new Error(error.message || "Failed to update options")
  }

  for (const original of existing) {
    const next = updated?.find((option) => option.id === original.id)
    if (!next) continue
    await createAuditLog({
      organization_id: auth.organization_id,
      entity_type: "product_option",
      entity_id: original.id,
      action: "bulk_update",
      old_values: original,
      new_values: next,
      changed_by: auth.userTableId,
    })
  }

  revalidatePath(`/products/${productId}`)
  revalidatePath("/products")
}

export async function bulkDeleteProductOptions(optionIds: string[]) {
  if (!optionIds.length) return
  const auth = await getCurrentUserOrg()
  if (!auth) throw new Error("Unauthorized")

  const supabase = await createClient()
  const { data: existing } = await supabase
    .from("product_options")
    .select("*")
    .in("id", optionIds)

  if (!existing?.length) return

  const productId = existing[0].product_id
  await ensureProductOwnership(productId, auth.organization_id)

  const { error } = await supabase
    .from("product_options")
    .delete()
    .in("id", optionIds)

  if (error) {
    throw new Error(error.message || "Failed to delete options")
  }

  for (const option of existing) {
    await createAuditLog({
      organization_id: auth.organization_id,
      entity_type: "product_option",
      entity_id: option.id,
      action: "bulk_delete",
      old_values: option,
      new_values: null,
      changed_by: auth.userTableId,
    })
  }

  revalidatePath(`/products/${productId}`)
  revalidatePath("/products")
}

export async function reorderProductOptions(productId: string, orderedOptionIds: string[]) {
  if (!orderedOptionIds.length) return
  const auth = await getCurrentUserOrg()
  if (!auth) throw new Error("Unauthorized")

  await ensureProductOwnership(productId, auth.organization_id)

  const supabase = await createClient()
  const updates = orderedOptionIds.map((id, index) => ({ id, sort_order: (index + 1) * 100 }))

  const { error, data } = await supabase
    .from("product_options")
    .upsert(updates, { onConflict: "id" })
    .select("*")

  if (error) {
    throw new Error(error.message || "Failed to reorder options")
  }

  for (const option of data ?? []) {
    await createAuditLog({
      organization_id: auth.organization_id,
      entity_type: "product_option",
      entity_id: option.id,
      action: "bulk_update",
      old_values: null,
      new_values: option,
      changed_by: auth.userTableId,
    })
  }

  revalidatePath(`/products/${productId}`)
  revalidatePath("/products")
}

