import { notFound } from "next/navigation"
import { DetailsPageLayout } from "@/components/protected/details-page-layout"
import EditProductForm from "@/components/products/forms/edit-product-form"
import { getProductById } from "@/lib/data/products"
import { getProductTypes } from "@/lib/data/product-types"
import { StatusBadge } from "@/components/ui/status-badge"
import { getEventsForSelect } from "@/lib/data/events"

type EditPageProps = {
  params: Promise<{ id: string }>
}

export default async function EditProductPage({ params }: EditPageProps) {
  const { id } = await params
  const [product, productTypes, events] = await Promise.all([getProductById(id), getProductTypes(), getEventsForSelect()])

  if (!product) {
    notFound()
  }

  return (
    <DetailsPageLayout
      title={product.name}
      subtitle="Update product details, attributes, media, and availability."
      backHref="/products"
      badge={
        <StatusBadge variant={product.is_active ? "success" : "warning"}>
          {product.is_active ? "Active" : "Inactive"}
        </StatusBadge>
      }
    >
      <EditProductForm product={product} productTypes={productTypes} events={events} />
    </DetailsPageLayout>
  )
}


