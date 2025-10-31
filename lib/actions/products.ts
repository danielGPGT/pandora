"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { createAuditLog } from "@/lib/audit/audit-log"

type Nullable<T> = T | null

type AuthContext = {
  userId: string
  userTableId: Nullable<string>
  organization_id: string
}

const productCreateSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  description: z.string().optional().nullable(),
  product_type_id: z.string().uuid(),
  event_id: z.string().uuid().optional().nullable(),
  is_active: z.boolean().default(true),
  location: z.any().optional(),
  attributes: z.any().optional(),
  tags: z.array(z.string()).optional().default([]),
  media: z.array(z.string()).optional().default([]),
})

const productUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  event_id: z.string().uuid().optional().nullable(),
  is_active: z.boolean().optional(),
  product_type_id: z.string().uuid().optional(),
})

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

  return null
}

function ensureData(data: Record<string, unknown>) {
  if (!Object.keys(data).length) {
    throw new Error("No changes were provided")
  }
}

export async function updateProduct(id: string, data: Record<string, any>) {
  const auth = await getCurrentUserOrg()
  if (!auth) throw new Error("Unauthorized")

  const supabase = await createClient()
  const parsed = productUpdateSchema.parse(data)

  if (parsed.code) {
    const { data: existing } = await supabase
      .from("products")
      .select("id")
      .eq("organization_id", auth.organization_id)
      .eq("code", parsed.code)
      .neq("id", id)
      .limit(1)

    if (existing && existing.length > 0) {
      throw new Error("Product code already exists")
    }
  }

  const { data: oldProduct } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .eq("organization_id", auth.organization_id)
    .maybeSingle()

  const updatePayload: Record<string, any> = {
    ...parsed,
    updated_at: new Date().toISOString(),
  }

  if ("attributes" in data && typeof data.attributes === "object") {
    updatePayload.attributes = data.attributes
  }

  if ("tags" in data && Array.isArray(data.tags)) {
    updatePayload.tags = data.tags
  }

  if ("media" in data && Array.isArray(data.media)) {
    updatePayload.media = data.media
  }

  if ("location" in data) {
    const location = data.location
    if (location && typeof location === "object") {
      const values = Object.values(location as Record<string, any>)
      const allEmpty = values.every((value) => value == null || value === "")
      updatePayload.location = allEmpty ? null : location
    } else {
      updatePayload.location = null
    }
  }

  const { data: updatedProduct, error } = await supabase
    .from("products")
    .update(updatePayload)
    .eq("id", id)
    .eq("organization_id", auth.organization_id)
    .select()
    .single()

  if (error) {
    throw new Error(error.message || "Failed to update product")
  }

  await createAuditLog({
    organization_id: auth.organization_id,
    entity_type: "product",
    entity_id: id,
    action: "update",
    old_values: oldProduct || null,
    new_values: updatedProduct,
    changed_by: auth.userTableId || null,
  })

  revalidatePath("/products")
  return updatedProduct
}

export async function createProduct(data: z.infer<typeof productCreateSchema>) {
  const auth = await getCurrentUserOrg()
  if (!auth) throw new Error("Unauthorized")

  const supabase = await createClient()
  const parsed = productCreateSchema.parse(data)

  const { data: dupCode } = await supabase
    .from("products")
    .select("id")
    .eq("organization_id", auth.organization_id)
    .eq("code", parsed.code)
    .limit(1)

  if (dupCode && dupCode.length > 0) {
    throw new Error("A product with this code already exists")
  }

  const payload: Record<string, any> = {
    organization_id: auth.organization_id,
    created_by: auth.userTableId,
    ...parsed,
    attributes: parsed.attributes && typeof parsed.attributes === "object" ? parsed.attributes : {},
    tags: parsed.tags ?? [],
    media: parsed.media ?? [],
  }

  if (payload.location && typeof payload.location === "object") {
    const values = Object.values(payload.location as Record<string, any>)
    const allEmpty = values.every((value) => value == null || value === "")
    if (allEmpty) {
      payload.location = null
    }
  } else {
    payload.location = null
  }

  const { data: product, error } = await supabase
    .from("products")
    .insert(payload)
    .select()
    .single()

  if (error) {
    throw new Error(error.message || "Failed to create product")
  }

  await createAuditLog({
    organization_id: auth.organization_id,
    entity_type: "product",
    entity_id: product.id,
    action: "create",
    old_values: null,
    new_values: product,
    changed_by: auth.userTableId || null,
  })

  revalidatePath("/products")
  return product
}

export async function deleteProductImage(url: string) {
  const auth = await getCurrentUserOrg()
  if (!auth) throw new Error("Unauthorized")

  const supabase = await createClient()
  try {
    const { error } = await supabase.storage.from("product_images").remove([getPathFromUrl(url)])
    if (error) throw error
  } catch (err) {
    console.error("deleteProductImage error", err)
  }
}

function getPathFromUrl(url: string) {
  try {
    const parsed = new URL(url)
    return decodeURIComponent(parsed.pathname.replace(/^\/(storage|public)\/v1\/object\/public\/product_images\//, ""))
  } catch {
    return url
  }
}

export async function deleteProduct(id: string) {
  const auth = await getCurrentUserOrg()
  if (!auth) throw new Error("Unauthorized")

  const supabase = await createClient()

  const { data: oldProduct } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .eq("organization_id", auth.organization_id)
    .maybeSingle()

  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", id)
    .eq("organization_id", auth.organization_id)

  if (error) {
    throw new Error(error.message || "Failed to delete product")
  }

  await createAuditLog({
    organization_id: auth.organization_id,
    entity_type: "product",
    entity_id: id,
    action: "delete",
    old_values: oldProduct || null,
    new_values: null,
    changed_by: auth.userTableId || null,
  })

  revalidatePath("/products")
}

export async function duplicateProduct(id: string) {
  const auth = await getCurrentUserOrg()
  if (!auth) throw new Error("Unauthorized")

  const supabase = await createClient()

  const { data: original, error: fetchError } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .eq("organization_id", auth.organization_id)
    .maybeSingle()

  if (fetchError || !original) {
    throw new Error("Product not found")
  }

  let newCode = `${original.code}-COPY`
  let counter = 1
  while (true) {
    const { data: existing } = await supabase
      .from("products")
      .select("id")
      .eq("organization_id", auth.organization_id)
      .eq("code", newCode)
      .limit(1)

    if (!existing || existing.length === 0) break
    newCode = `${original.code}-COPY-${counter}`
    counter++
    if (counter > 100) {
      newCode = `${original.code}-${Date.now()}`
      break
    }
  }

  const duplicatePayload = {
    organization_id: auth.organization_id,
    product_type_id: original.product_type_id,
    name: original.name ? `${original.name} (Copy)` : "Untitled Product",
    code: newCode,
    description: original.description,
    location: original.location,
    attributes: original.attributes ?? {},
    event_id: original.event_id,
    is_active: original.is_active ?? true,
    created_by: auth.userTableId,
    media: original.media ?? [],
    tags: original.tags ?? [],
  }

  const { data: duplicate, error } = await supabase
    .from("products")
    .insert(duplicatePayload)
    .select()
    .single()

  if (error) {
    throw new Error(error.message || "Failed to duplicate product")
  }

  await createAuditLog({
    organization_id: auth.organization_id,
    entity_type: "product",
    entity_id: duplicate.id,
    action: "duplicate",
    old_values: original,
    new_values: duplicate,
    changed_by: auth.userTableId || null,
  })

  revalidatePath("/products")
  return duplicate
}

export async function bulkDeleteProducts(ids: string[]) {
  const auth = await getCurrentUserOrg()
  if (!auth) throw new Error("Unauthorized")

  const supabase = await createClient()

  const { data: oldProducts } = await supabase
    .from("products")
    .select("*")
    .in("id", ids)
    .eq("organization_id", auth.organization_id)

  const { error } = await supabase
    .from("products")
    .delete()
    .in("id", ids)
    .eq("organization_id", auth.organization_id)

  if (error) {
    throw new Error(error.message || "Failed to delete products")
  }

  if (oldProducts) {
    for (const product of oldProducts) {
      await createAuditLog({
        organization_id: auth.organization_id,
        entity_type: "product",
        entity_id: product.id,
        action: "bulk_delete",
        old_values: product,
        new_values: null,
        changed_by: auth.userTableId || null,
      })
    }
  }

  revalidatePath("/products")
}

export async function bulkDuplicateProducts(ids: string[]) {
  const auth = await getCurrentUserOrg()
  if (!auth) throw new Error("Unauthorized")

  const duplicates = []
  for (const id of ids) {
    const duplicate = await duplicateProduct(id)
    duplicates.push(duplicate)
  }

  for (const product of duplicates) {
    await createAuditLog({
      organization_id: auth.organization_id,
      entity_type: "product",
      entity_id: product.id,
      action: "bulk_duplicate",
      old_values: null,
      new_values: product,
      changed_by: auth.userTableId || null,
    })
  }

  revalidatePath("/products")
}

export async function bulkUpdateProductStatus(ids: string[], isActive: boolean) {
  const auth = await getCurrentUserOrg()
  if (!auth) throw new Error("Unauthorized")

  const supabase = await createClient()

  const { data: oldProducts } = await supabase
    .from("products")
    .select("*")
    .in("id", ids)
    .eq("organization_id", auth.organization_id)

  const { data: updatedProducts, error } = await supabase
    .from("products")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .in("id", ids)
    .eq("organization_id", auth.organization_id)
    .select()

  if (error) {
    throw new Error(error.message || "Failed to update products")
  }

  if (oldProducts && updatedProducts) {
    for (const product of oldProducts) {
      const newProduct = updatedProducts.find((p) => p.id === product.id)
      if (!newProduct) continue
      await createAuditLog({
        organization_id: auth.organization_id,
        entity_type: "product",
        entity_id: product.id,
        action: "bulk_update",
        old_values: product,
        new_values: newProduct,
        changed_by: auth.userTableId || null,
      })
    }
  }

  revalidatePath("/products")
}

export async function generateProductCode(productTypeId: string, name: string, excludeId?: string) {
  const auth = await getCurrentUserOrg()
  if (!auth) throw new Error("Unauthorized")

  const supabase = await createClient()

  const { data: productType } = await supabase
    .from("product_types")
    .select("type_code")
    .eq("organization_id", auth.organization_id)
    .eq("id", productTypeId)
    .maybeSingle()

  const prefix = (productType?.type_code ?? "PRD").toUpperCase()
  const baseName = slugify(name)

  const normalizedName = baseName.startsWith(prefix)
    ? baseName.slice(prefix.length).replace(/^[-]+/, "")
    : baseName

  let base = normalizedName ? `${prefix}-${normalizedName}` : `${prefix}-PRODUCT`
  if (base.length > 28) {
    base = base.slice(0, 28)
  }

  let candidate = base
  let counter = 1

  while (true) {
    let query = supabase
      .from("products")
      .select("id")
      .eq("organization_id", auth.organization_id)
      .eq("product_type_id", productTypeId)
      .eq("code", candidate)
      .limit(1)

    if (excludeId) {
      query = query.neq("id", excludeId)
    }

    const { data } = await query.maybeSingle()

    if (!data) break

    counter += 1
    candidate = `${base}-${counter.toString().padStart(2, "0")}`
    if (candidate.length > 32) {
      candidate = `${base.slice(0, Math.max(0, 32 - 3))}-${counter
        .toString()
        .padStart(2, "0")}`
    }
  }

  return candidate
}

export async function isProductCodeAvailable(code: string, productTypeId: string, excludeId?: string) {
  const auth = await getCurrentUserOrg()
  if (!auth) throw new Error("Unauthorized")

  const supabase = await createClient()
  let query = supabase
    .from("products")
    .select("id")
    .eq("organization_id", auth.organization_id)
    .eq("product_type_id", productTypeId)
    .eq("code", code)
    .limit(1)

  if (excludeId) {
    query = query.neq("id", excludeId)
  }

  const { data } = await query.maybeSingle()

  return !data
}

function slugify(input: string) {
  return input
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24)
}


