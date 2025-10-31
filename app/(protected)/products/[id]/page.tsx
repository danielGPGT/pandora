import { notFound } from "next/navigation"
import { DetailsPageLayout } from "@/components/protected/details-page-layout"
import { StatusBadge } from "@/components/ui/status-badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getProductDetails } from "@/lib/data/products"
import { ProductOverviewCard } from "@/components/products/product-overview-card"
import { ProductAttributesCard } from "@/components/products/product-attributes-card"
import { ProductOptionsCard } from "@/components/products/product-options-card"
import { ProductOptionsManager } from "@/components/products/product-options-manager"

type ProductDetailsPageProps = {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ tab?: string }>
}

export default async function ProductDetailsPage({ params, searchParams }: ProductDetailsPageProps) {
  const { id } = await params
  const query = searchParams ? await searchParams : {}
  const initialTab = query?.tab === "options" ? "options" : "overview"
  const details = await getProductDetails(id)

  if (!details) {
    notFound()
  }

  const { product, counts } = details

  return (
    <DetailsPageLayout
      title={product.name}
      subtitle="Full product overview, attributes, and linked data."
      backHref="/products"
      badge={<StatusBadge variant={product.is_active ? "success" : "warning"}>{product.is_active ? "Active" : "Inactive"}</StatusBadge>}
    >
      <Tabs defaultValue={initialTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="options">Options</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            <ProductOverviewCard product={product} counts={counts} />
            <ProductAttributesCard product={product} />
          </div>
          <ProductOptionsCard productId={product.id} options={details.options} />
        </TabsContent>

        <TabsContent value="options">
          <ProductOptionsManager product={product} options={details.options} />
        </TabsContent>
      </Tabs>
    </DetailsPageLayout>
  )
}


