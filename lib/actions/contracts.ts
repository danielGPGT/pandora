"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { contractSchema, type ContractFormData } from "@/lib/contracts/schema"
import { createAuditLog } from "@/lib/audit/audit-log"

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
    return { userId: user.id, userTableId: appUserByProfile?.id, organization_id: profile.organization_id as string }
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
    return { userId: user.id, userTableId: appUserByMember?.id, organization_id: defaultMembership.organization_id as string }
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
    return { userId: user.id, userTableId: appUserByMember?.id, organization_id: anyMembership.organization_id as string }
  }

  const { data: appUserFallback } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .maybeSingle()

  return { userId: user.id, userTableId: appUserFallback?.id, organization_id: null }
}

export async function createContract(data: ContractFormData) {
  const auth = await getCurrentUserOrg()
  if (!auth || !auth.organization_id) throw new Error("Unauthorized")

  const validated = contractSchema.parse(data)
  const supabase = await createClient()

  // Check for duplicate contract number within org
  const { data: existing } = await supabase
    .from("contracts")
    .select("id")
    .eq("organization_id", auth.organization_id)
    .eq("contract_number", validated.contract_number)
    .limit(1)
  
  if (existing && existing.length > 0) {
    throw new Error("Contract number already exists in your organization")
  }

  const { data: contract, error } = await supabase
    .from("contracts")
    .insert({
      ...validated,
      organization_id: auth.organization_id,
      contract_files: validated.contract_files || [],
    })
    .select()
    .single()

  if (error) {
    console.error("createContract insert error", { message: error.message, details: error.details, hint: error.hint })
    throw new Error(error.message || "Insert failed")
  }

  // Audit log
  await createAuditLog({
    organization_id: auth.organization_id,
    entity_type: "contract",
    entity_id: contract.id,
    action: "create",
    old_values: null,
    new_values: contract,
    changed_by: auth.userTableId || null,
  })

  revalidatePath("/suppliers")
  revalidatePath("/contracts")
  if (validated.supplier_id) {
    revalidatePath(`/suppliers/${validated.supplier_id}`)
  }
  return contract
}

export async function updateContract(id: string, data: Partial<ContractFormData>) {
  const auth = await getCurrentUserOrg()
  if (!auth || !auth.organization_id) throw new Error("Unauthorized")
  const supabase = await createClient()

  // Get old values for audit log
  const { data: oldContract } = await supabase
    .from("contracts")
    .select("*")
    .eq("id", id)
    .eq("organization_id", auth.organization_id)
    .single()

  const { data: contract, error } = await supabase
    .from("contracts")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", auth.organization_id)
    .select()
    .single()

  if (error) throw error

  // Audit log
  await createAuditLog({
    organization_id: auth.organization_id,
    entity_type: "contract",
    entity_id: id,
    action: "update",
    old_values: oldContract || null,
    new_values: contract,
    changed_by: auth.userTableId || null,
  })

  revalidatePath("/suppliers")
  revalidatePath("/contracts")
  if (contract?.supplier_id) {
    revalidatePath(`/suppliers/${contract.supplier_id}`)
  }
  return contract
}

export async function deleteContract(id: string) {
  const auth = await getCurrentUserOrg()
  if (!auth || !auth.organization_id) throw new Error("Unauthorized")
  const supabase = await createClient()

  // Get old values for audit log before deletion
  const { data: oldContract } = await supabase
    .from("contracts")
    .select("*")
    .eq("id", id)
    .eq("organization_id", auth.organization_id)
    .single()

  const { error } = await supabase
    .from("contracts")
    .delete()
    .eq("id", id)
    .eq("organization_id", auth.organization_id)

  if (error) throw error

  // Audit log
  await createAuditLog({
    organization_id: auth.organization_id,
    entity_type: "contract",
    entity_id: id,
    action: "delete",
    old_values: oldContract || null,
    new_values: null,
    changed_by: auth.userTableId || null,
  })

  revalidatePath("/suppliers")
  revalidatePath("/contracts")
  if (oldContract?.supplier_id) {
    revalidatePath(`/suppliers/${oldContract.supplier_id}`)
  }
}

export async function getContractsBySupplier(supplierId: string) {
  const auth = await getCurrentUserOrg()
  if (!auth || !auth.organization_id) throw new Error("Unauthorized")
  const supabase = await createClient()

  const { data: contracts, error } = await supabase
    .from("contracts")
    .select(`
      *,
      event:events (
        event_name,
        event_code
      )
    `)
    .eq("supplier_id", supplierId)
    .eq("organization_id", auth.organization_id)
    .order("created_at", { ascending: false })

  if (error) throw error
  return contracts || []
}

export async function checkContractNumberUnique(contractNumber: string, excludeId?: string) {
  const auth = await getCurrentUserOrg()
  if (!auth || !auth.organization_id) throw new Error("Unauthorized")
  const supabase = await createClient()

  let query = supabase
    .from("contracts")
    .select("id")
    .eq("organization_id", auth.organization_id)
    .eq("contract_number", contractNumber)

  if (excludeId) query = query.neq("id", excludeId)

  const { data } = await query.limit(1)
  return !data || data.length === 0
}

export async function bulkDeleteContracts(ids: string[]) {
  const auth = await getCurrentUserOrg()
  if (!auth || !auth.organization_id) throw new Error("Unauthorized")
  const supabase = await createClient()

  // Get old values for audit log
  const { data: oldContracts } = await supabase
    .from("contracts")
    .select("*")
    .in("id", ids)
    .eq("organization_id", auth.organization_id)

  if (!oldContracts || oldContracts.length === 0) {
    throw new Error("No contracts found to delete")
  }

  const { error } = await supabase
    .from("contracts")
    .delete()
    .in("id", ids)
    .eq("organization_id", auth.organization_id)

  if (error) throw error

  // Audit log for each contract
  for (const oldContract of oldContracts) {
    await createAuditLog({
      organization_id: auth.organization_id,
      entity_type: "contract",
      entity_id: oldContract.id,
      action: "bulk_delete",
      old_values: oldContract,
      new_values: null,
      changed_by: auth.userTableId || null,
    })
  }

  revalidatePath("/contracts")
  revalidatePath("/suppliers")
}

export async function bulkUpdateContractStatus(ids: string[], status: ContractFormData["status"]) {
  const auth = await getCurrentUserOrg()
  if (!auth || !auth.organization_id) throw new Error("Unauthorized")
  const supabase = await createClient()

  // Get old values for audit log
  const { data: oldContracts } = await supabase
    .from("contracts")
    .select("*")
    .in("id", ids)
    .eq("organization_id", auth.organization_id)

  if (!oldContracts || oldContracts.length === 0) {
    throw new Error("No contracts found to update")
  }

  const { data: updatedContracts, error } = await supabase
    .from("contracts")
    .update({ status, updated_at: new Date().toISOString() })
    .in("id", ids)
    .eq("organization_id", auth.organization_id)
    .select()

  if (error) throw error

  // Audit log for each contract
  for (let i = 0; i < oldContracts.length; i++) {
    const oldContract = oldContracts[i]
    const newContract = updatedContracts?.[i]
    if (newContract) {
      await createAuditLog({
        organization_id: auth.organization_id,
        entity_type: "contract",
        entity_id: oldContract.id,
        action: "bulk_update",
        old_values: oldContract,
        new_values: newContract,
        changed_by: auth.userTableId || null,
      })
    }
  }

  revalidatePath("/contracts")
  revalidatePath("/suppliers")
}

export async function bulkDuplicateContracts(ids: string[]) {
  const auth = await getCurrentUserOrg()
  if (!auth || !auth.organization_id) throw new Error("Unauthorized")
  const supabase = await createClient()

  // Get original contracts
  const { data: originals, error: fetchError } = await supabase
    .from("contracts")
    .select("*")
    .in("id", ids)
    .eq("organization_id", auth.organization_id)

  if (fetchError || !originals || originals.length === 0) {
    throw new Error("Contracts not found")
  }

  // Create duplicates with unique contract numbers
  const duplicates = await Promise.all(
    originals.map(async (original) => {
      // Generate unique contract number
      let newNumber = `${original.contract_number}-COPY`
      let counter = 1
      while (true) {
        const { data: existing } = await supabase
          .from("contracts")
          .select("id")
          .eq("organization_id", auth.organization_id)
          .eq("contract_number", newNumber)
          .limit(1)

        if (!existing || existing.length === 0) break
        newNumber = `${original.contract_number}-COPY-${counter}`
        counter++
        if (counter > 100) {
          newNumber = `${original.contract_number}-${Date.now()}`
          break
        }
      }

      const duplicateData: ContractFormData = {
        contract_number: newNumber,
        contract_name: original.contract_name ? `${original.contract_name} (Copy)` : undefined,
        contract_type: original.contract_type || undefined,
        supplier_id: original.supplier_id || undefined,
        event_id: original.event_id || undefined,
        valid_from: original.valid_from,
        valid_to: original.valid_to,
        currency: original.currency || "USD",
        total_cost: original.total_cost || undefined,
        commission_rate: original.commission_rate || undefined,
        payment_terms: original.payment_terms || undefined,
        cancellation_policy: original.cancellation_policy || undefined,
        terms_and_conditions: original.terms_and_conditions || undefined,
        contract_files: Array.isArray(original.contract_files) ? original.contract_files : [],
        notes: original.notes || undefined,
        status: (original.status as ContractFormData["status"]) || "draft",
      }

      return duplicateData
    })
  )

  // Insert duplicates
  const { data: newContracts, error: insertError } = await supabase
    .from("contracts")
    .insert(
      duplicates.map((d) => ({
        ...d,
        organization_id: auth.organization_id,
      }))
    )
    .select()

  if (insertError) throw insertError

  // Audit log for each duplicate
  for (let i = 0; i < originals.length; i++) {
    const original = originals[i]
    const newContract = newContracts?.[i]
    if (newContract) {
      await createAuditLog({
        organization_id: auth.organization_id,
        entity_type: "contract",
        entity_id: newContract.id,
        action: "bulk_duplicate",
        old_values: original,
        new_values: newContract,
        changed_by: auth.userTableId || null,
      })
    }
  }

  revalidatePath("/contracts")
  revalidatePath("/suppliers")
  return newContracts || []
}

