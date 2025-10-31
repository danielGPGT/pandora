import { createClient } from "@/utils/supabase/server"

export default async function Instruments() {
  const supabase = await createClient()
  const { data: instruments, error } = await supabase.from("instruments").select()

  if (error) {
    return (
      <div className="container mx-auto max-w-2xl p-6">
        <div className="rounded-md border bg-card p-4 text-sm">
          Failed to load instruments: {error.message}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-2xl p-6">
      <pre className="rounded-md border bg-muted/30 p-4 text-sm">{JSON.stringify(instruments, null, 2)}</pre>
    </div>
  )
}


