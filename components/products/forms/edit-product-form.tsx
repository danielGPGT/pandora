"use client"

import { AddProductForm } from "@/components/products/forms/add-product-form"
import { updateProduct } from "@/lib/actions/products"

type EditProductFormProps = {
  product: any
  productTypes: { id: string; name: string; code: string }[]
  events: { id: string; event_name: string; event_code: string | null; event_date_from: string | null; event_date_to: string | null }[]
}

export default function EditProductForm({ product, productTypes, events }: EditProductFormProps) {
  return (
    <AddProductForm
      productTypes={productTypes}
      events={events}
      defaultValues={{
        name: product.name,
        code: product.code,
        description: product.description ?? "",
        product_type_id: product.product_type_id,
        event_id: product.event_id ?? null,
        is_active: product.is_active ?? true,
        location: product.location ?? {},
        attributes: product.attributes ?? {},
        tags: product.tags ?? [],
        media: Array.isArray(product.media) ? (product.media as string[]) : [],
      }}
      onSubmit={async (values) => {
        await updateProduct(product.id, values)
      }}
      submitLabel="Save changes"
      successMessage="Product updated"
      errorMessage="Failed to update product"
      productId={product.id}
    />
  )
}

