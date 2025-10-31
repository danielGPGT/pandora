"use client"

import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { Layers, ChevronRight, Circle, CircleCheck } from "lucide-react"

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/ui/status-badge"
import type { EventDetailsResult } from "@/lib/data/events"

type EventProductsCardProps = {
  products: EventDetailsResult["products"]
  counts: EventDetailsResult["counts"]
  eventId: string
}

export function EventProductsCard({ products, counts, eventId }: EventProductsCardProps) {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="text-lg font-semibold">Linked products</CardTitle>
          <p className="text-xs text-muted-foreground">
            Showing up to 6 recent products. Total linked: {counts.productsTotal.toLocaleString()}.
          </p>
        </div>
        <Badge variant="secondary" className="uppercase tracking-wide">
          {counts.productsActive}/{counts.productsTotal} active
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {products.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/40 p-6 text-center text-sm text-muted-foreground">
            No products linked to this event yet.
          </div>
        ) : (
          <div className="space-y-3">
            {products.map((product) => (
              <ProductRow key={product.id} product={product} />
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end">
        <Link
          href={`/products?event=${eventId}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          View products
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      </CardFooter>
    </Card>
  )
}

function ProductRow({
  product,
}: {
  product: EventDetailsResult["products"][number]
}) {
  const href = `/products/${product.id}`
  const updatedAgo = product.updated_at
    ? formatDistanceToNow(new Date(product.updated_at), { addSuffix: true })
    : null

  const isActive = product.is_active

  return (
    <Link
      href={href}
      className="flex items-start justify-between gap-3 rounded-lg border bg-card/60 p-3 transition hover:border-primary/40 hover:bg-card"
    >
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-muted-foreground" aria-hidden />
          <p className="truncate text-sm font-medium">{product.name}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {product.code ? <Badge variant="outline">{product.code}</Badge> : null}
          {product.product_type?.type_name ? <span>{product.product_type.type_name}</span> : null}
          {updatedAgo ? <span>Updated {updatedAgo}</span> : null}
        </div>
      </div>
      <StatusBadge variant={isActive ? "success" : "warning"} className="flex items-center gap-1">
        {isActive ? (
          <CircleCheck className="h-3.5 w-3.5" aria-hidden />
        ) : (
          <Circle className="h-3.5 w-3.5" aria-hidden />
        )}
        {isActive ? "Active" : "Inactive"}
      </StatusBadge>
    </Link>
  )
}

