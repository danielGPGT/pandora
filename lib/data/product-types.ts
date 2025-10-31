import { createClient } from "@/lib/supabase/server"

export async function getProductTypes() {
  const supabase = await createClient()
  const { data, error } = await supabase.from("product_types").select("id, type_name, type_code").order("type_name")
  if (error) {
    throw error
  }
  return (data ?? []).map((type) => ({
    id: type.id,
    name: type.type_name,
    code: type.type_code,
  }))
}


