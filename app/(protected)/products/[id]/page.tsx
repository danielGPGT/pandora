import { notFound } from "next/navigation"
import { Suspense } from "react"
import { DetailsPageLayout } from "@/components/protected/details-page-layout"
import { StatusBadge } from "@/components/ui/status-badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Info } from "lucide-react"
import { getProductDetails } from "@/lib/data/products"
import { ProductOverviewCard } from "@/components/products/product-overview-card"
import { ProductAttributesCard } from "@/components/products/product-attributes-card"
import { ProductOptionsCard } from "@/components/products/product-options-card"
import { ProductOptionsManager } from "@/components/products/product-options-manager"
import { ActivityTimeline, type AuditLogEntry } from "@/components/audit/activity-timeline"
import { ProductDetailsTabs } from "@/components/products/product-details-tabs"
// Use centralized utilities
import { getSupplierStatusVariant } from "@/lib/utils/status"
import { buildLoadErrorMessages } from "@/lib/utils/errors"
import { logger } from "@/lib/middleware/logging"

type ProductDetailsPageProps = {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ tab?: string }>
}

export default async function ProductDetailsPage({ params, searchParams }: ProductDetailsPageProps) {
  const { id } = await params
  
  let details = null
  try {
    details = await getProductDetails(id)
  } catch (error) {
    logger.error('Failed to fetch product details', error, { productId: id })
    notFound()
  }

  if (!details) {
    logger.warn('Product not found', { productId: id })
    notFound()
  }

  const { product, counts, auditLog, loadErrors } = details
  
  // Build audit log entries for ActivityTimeline
  const auditEntries: AuditLogEntry[] = auditLog.map((entry) => ({
    id: entry.id,
    entity_type: entry.entity_type,
    entity_id: entry.entity_id,
    action: entry.action,
    old_values: entry.old_values,
    new_values: entry.new_values,
    changed_by: entry.changed_by,
    changed_at: entry.changed_at,
    changed_by_user: entry.changed_by_user,
  }))

  const statusVariant = getSupplierStatusVariant(product.is_active)
  
  // Error messages for load errors
  const PRODUCT_ERROR_MESSAGES = {
    options: "We couldn't load product options. Some data may be incomplete.",
    auditLog: "We couldn't load the audit trail. Activity shown below may be incomplete.",
  } as const
  
  const errorMessages = buildLoadErrorMessages(loadErrors, PRODUCT_ERROR_MESSAGES)
  const hasErrors = errorMessages.length > 0

  return (
    <DetailsPageLayout
      title={product.name}
      subtitle="Full product overview, attributes, and linked data."
      backHref="/products"
      badge={<StatusBadge variant={statusVariant}>{product.is_active ? "Active" : "Inactive"}</StatusBadge>}
    >
      {hasErrors && (
        <Alert className="border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <Info className="h-4 w-4" aria-hidden />
          <AlertTitle>Some panels failed to load</AlertTitle>
          <AlertDescription>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {errorMessages.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      
      <Suspense fallback={<div className="h-96" />}>
        <ProductDetailsTabs
          overviewContent={
            <>
              <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
                <ProductOverviewCard product={product} counts={counts} />
                <ProductAttributesCard product={product} />
              </div>
              <ProductOptionsCard productId={product.id} options={details.options} />
            </>
          }
          optionsContent={<ProductOptionsManager product={product} options={details.options} />}
          activityContent={
            <>
              {loadErrors.auditLog ? (
                <Alert variant="default" className="border-dashed border-amber-500/40">
                  <AlertTitle>Audit log unavailable</AlertTitle>
                  <AlertDescription>
                    We couldn't load the audit trail for this product. Activity shown below may be incomplete.
                  </AlertDescription>
                </Alert>
              ) : null}
              <Card>
                <CardHeader>
                  <CardTitle>Activity Timeline</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Complete audit trail of all changes to this product
                  </p>
                </CardHeader>
                <CardContent>
                  <ActivityTimeline 
                    logs={auditEntries} 
                    showEntityType={false}
                    emptyMessage="No activity recorded for this product yet."
                  />
                </CardContent>
              </Card>
            </>
          }
        />
      </Suspense>
    </DetailsPageLayout>
  )
}


