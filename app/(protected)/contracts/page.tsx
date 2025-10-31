import { GeneralPageLayout } from "@/components/protected/general-page-layout"
import { ContractsDataTable08, type Contract } from "@/components/reuseable/data-table/data-table-08-contracts"
import { AddContractButton } from "@/components/contracts/add-contract-button"
import { createClient } from "@/lib/supabase/server"
import { contractsQuerySchema, getContractsPage } from "@/lib/data/contracts"
import { SummaryCard } from "@/components/ui/summary-card"
import { FileText, CheckCircle2, Clock, AlertCircle } from "lucide-react"

export default async function ContractsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string; q?: string }>
}) {
  const params = await searchParams
  const parsed = contractsQuerySchema.parse(params)
  const { rows, total } = await getContractsPage(parsed)
  const supabase = await createClient()
  
  // Get summary stats
  const [activeRes, expiredRes, draftRes, newRes] = await Promise.all([
    supabase.from("contracts").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("contracts").select("id", { count: "exact", head: true }).eq("status", "expired"),
    supabase.from("contracts").select("id", { count: "exact", head: true }).eq("status", "draft"),
    supabase
      .from("contracts")
      .select("id", { count: "exact", head: true })
      .gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
  ])

  return (
    <GeneralPageLayout
      title="Contracts"
      subtitle="Manage contracts, terms, and supplier agreements."
      actions={<AddContractButton />}
    >
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <SummaryCard
          title="Total contracts"
          value={total ?? 0}
          subtitle="Total contract records across your organization."
          icon={<FileText className="h-5 w-5" />}
          variant="info"
        />
        <SummaryCard
          title="Active"
          value={activeRes.count ?? 0}
          subtitle="Contracts currently active and valid."
          icon={<CheckCircle2 className="h-5 w-5" />}
          variant="success"
        />
        <SummaryCard
          title="Expired"
          value={expiredRes.count ?? 0}
          subtitle="Contracts that have expired."
          icon={<AlertCircle className="h-5 w-5" />}
          variant="warning"
        />
        <SummaryCard
          title="New this month"
          value={newRes.count ?? 0}
          subtitle="Contracts added since month start."
          icon={<Clock className="h-5 w-5" />}
          variant="default"
        />
      </div>
      <ContractsDataTable08
        initialData={(rows ?? []) as Contract[]}
        totalCount={total ?? 0}
        page={parsed.page}
        pageSize={parsed.pageSize}
        q={parsed.q}
      />
    </GeneralPageLayout>
  )
}

