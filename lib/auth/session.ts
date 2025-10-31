import { createClient } from "@/lib/supabase/server"
import { cache } from "react"

export const getCurrentUser = cache(async () => {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return null

  const { data } = await supabase
    .from("users")
    .select(`*, organization:organizations (*)`)
    .eq("auth_id", authUser.id)
    .single()

  return data
})

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) throw new Error("Unauthorized")
  return user
}

export async function requireRole(allowedRoles: string[]) {
  const user = await requireAuth()
  if (!allowedRoles.includes(user.role)) throw new Error("Forbidden")
  return user
}


