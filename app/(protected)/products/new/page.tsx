import { Suspense } from "react"
import { getProductTypes } from "@/lib/data/product-types"
import { getEventsForSelect } from "@/lib/data/events"
import { DetailsPageLayout } from "@/components/protected/details-page-layout"
import { AddProductForm } from "@/components/products/forms/add-product-form"
import { createProduct } from "@/lib/actions/products"

export default async function NewProductPage() {
  const [productTypes, events] = await Promise.all([getProductTypes(), getEventsForSelect()])
  return (
    <DetailsPageLayout
      title="New Product"
      subtitle="Create a product record with structured attributes, media, and options."
      backHref="/products"
    >
      <Suspense fallback={<div className="rounded-lg border bg-muted/30 p-6 text-sm text-muted-foreground">Loading form…</div>}>
        <AddProductForm
          productTypes={productTypes}
          events={events}
          onSubmit={createProduct}
          submitLabel="Create product"
          successMessage="Product created"
          errorMessage="Failed to create product"
          redirectPath="/products"
          productId={undefined}
        />
      </Suspense>
    </DetailsPageLayout>
  )
}

