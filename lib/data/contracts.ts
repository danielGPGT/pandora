import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

export const contractsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  q: z.string().default(""),
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

export async function getContractsPage(params: z.infer<typeof contractsQuerySchema>) {
  const auth = await getCurrentUserOrg()
  if (!auth || !auth.organization_id) {
    return { rows: [], total: 0 }
  }

  const supabase = await createClient()
  const { page, pageSize, q } = params
  const offset = (page - 1) * pageSize

  let query = supabase
    .from("contracts")
    .select(
      `
      *,
      event:events (
        event_name,
        event_code
      ),
      supplier:suppliers (
        id,
        name,
        code
      )
    `,
      { count: "exact" }
    )
    .eq("organization_id", auth.organization_id)

  // Search filter
  if (q) {
    query = query.or(`contract_number.ilike.%${q}%,contract_name.ilike.%${q}%`)
  }

  query = query.order("created_at", { ascending: false }).range(offset, offset + pageSize - 1)

  const { data: rows, error, count } = await query

  if (error) {
    console.error("getContractsPage error:", error)
    throw error
  }

  return {
    rows: rows || [],
    total: count || 0,
  }
}

