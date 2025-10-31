import { GeneralPageLayout } from "@/components/protected/general-page-layout"
import { SummaryCard } from "@/components/ui/summary-card"
import { ProductsDataTable08, type Product } from "@/components/reuseable/data-table/data-table-08-products"
import { AddProductButton } from "@/components/products/add-product-button"
import { getProductsPage, getProductSummary, productsQuerySchema } from "@/lib/data/products"
import { Package, CheckCircle2, CircleAlert, Clock } from "lucide-react"

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string; q?: string; sort?: string; dir?: string; is_active?: string; product_type?: string }>
}) {
  const params = await searchParams
  const parsed = productsQuerySchema.parse(params)
  const [{ rows, total }, summary] = await Promise.all([getProductsPage(parsed), getProductSummary()])

  return (
    <GeneralPageLayout
      title="Products"
      subtitle="Manage catalog products, availability, and related options."
      actions={<AddProductButton />}
    >
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <SummaryCard
          title="Total products"
          value={total ?? 0}
          subtitle="All products in your organization."
          icon={<Package className="h-5 w-5" />}
          variant="info"
        />
        <SummaryCard
          title="Active"
          value={summary.active}
          subtitle="Products currently available for use."
          icon={<CheckCircle2 className="h-5 w-5" />}
          variant="success"
        />
        <SummaryCard
          title="Inactive"
          value={summary.inactive}
          subtitle="Products paused or archived."
          icon={<CircleAlert className="h-5 w-5" />}
          variant="warning"
        />
        <SummaryCard
          title="New this month"
          value={summary.newThisMonth}
          subtitle="Products added since the start of the month."
          icon={<Clock className="h-5 w-5" />}
          variant="default"
        />
      </div>

      <ProductsDataTable08
        initialData={(rows ?? []) as Product[]}
        totalCount={total ?? 0}
        page={parsed.page}
        pageSize={parsed.pageSize}
        q={parsed.q ?? ""}
      />
    </GeneralPageLayout>
  )
}


