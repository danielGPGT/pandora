import { GeneralPageLayout } from "@/components/protected/general-page-layout"
import { SuppliersDataTable08, type Supplier } from "@/components/reuseable/data-table/data-table-08-suppliers"
import { AddSupplierButton } from "@/components/suppliers/add-supplier-button"
import { createClient } from "@/lib/supabase/server"
import { suppliersQuerySchema, getSuppliersPage } from "@/lib/data/suppliers"
import { SummaryCard } from "@/components/ui/summary-card"
import { Users, CheckCircle2, CircleAlert, Clock } from "lucide-react"

export default async function SuppliersPage({ searchParams }: { searchParams: { page?: string; pageSize?: string; q?: string } }) {
  const parsed = suppliersQuerySchema.parse(searchParams)
  const { rows, total } = await getSuppliersPage(parsed)
  const supabase = await createClient()
  const [activeRes, inactiveRes, newRes] = await Promise.all([
    supabase.from("suppliers").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("suppliers").select("id", { count: "exact", head: true }).eq("is_active", false),
    supabase
      .from("suppliers")
      .select("id", { count: "exact", head: true })
      .gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
  ])

  return (
    <GeneralPageLayout
      title="Suppliers"
      subtitle="Manage supplier records, contacts, and contracts."
      actions={<AddSupplierButton />}
    >
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <SummaryCard
          title="Total suppliers"
          value={total ?? 0}
          subtitle="Total supplier records across your organization."
          icon={<Users className="h-5 w-5" />}
          variant="info"
        />
        <SummaryCard
          title="Active"
          value={activeRes.count ?? 0}
          subtitle="Suppliers currently marked as active."
          icon={<CheckCircle2 className="h-5 w-5" />}
          variant="success"
        />
        <SummaryCard
          title="Inactive"
          value={inactiveRes.count ?? 0}
          subtitle="Suppliers paused or deactivated."
          icon={<CircleAlert className="h-5 w-5" />}
          variant="warning"
        />
        <SummaryCard
          title="New this month"
          value={newRes.count ?? 0}
          subtitle="Suppliers added since month start."
          icon={<Clock className="h-5 w-5" />}
          variant="default"
        />
      </div>
      <SuppliersDataTable08 initialData={(rows ?? []) as Supplier[]} totalCount={total ?? 0} page={parsed.page} pageSize={parsed.pageSize} q={parsed.q} />
    </GeneralPageLayout>
  )
}


