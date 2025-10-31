import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

const sortKeys = ["name", "code", "created_at", "updated_at"] as const
type SortKey = typeof sortKeys[number]

export const suppliersQuerySchema = z.object({
  q: z.string().trim().optional().default(""),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(5)
    .max(100)
    .default(10),
  sort: z.enum(sortKeys).optional().default("created_at"),
  dir: z.enum(["asc", "desc"]).optional().default("desc"),
  is_active: z.union([z.literal("true"), z.literal("false")]).optional(),
})

export type SuppliersQuery = z.infer<typeof suppliersQuerySchema>

async function getCurrentUserOrg() {
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

export async function getSuppliersPage(params: SuppliersQuery) {
  const organization_id = await getCurrentUserOrg()
  if (!organization_id) throw new Error("Unauthorized")

  const supabase = await createClient()

  const from = (params.page - 1) * params.pageSize
  const to = from + params.pageSize - 1

  let query = supabase.from("suppliers").select("*", { count: "exact" }).eq("organization_id", organization_id)

  if (params.q) {
    const q = `%${params.q}%`
    query = query.or(
      `name.ilike.${q},code.ilike.${q},email.ilike.${q},phone.ilike.${q}`
    )
  }
  if (params.is_active) {
    query = query.eq("is_active", params.is_active === "true")
  }

  // Safe sort
  query = query.order(params.sort as SortKey, { ascending: params.dir === "asc" })

  const { data, error, count } = await query.range(from, to)
  if (error) throw new Error(error.message)

  return { rows: data ?? [], total: count ?? 0 }
}
