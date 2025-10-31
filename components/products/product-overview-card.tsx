"use client"

import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CalendarDays, Layers } from "lucide-react"
import { format } from "date-fns"
import type { ProductDetailsResult } from "@/lib/data/products"

type ProductOverviewCardProps = {
  product: ProductDetailsResult["product"]
  counts: ProductDetailsResult["counts"]
}

const metricLabels: Array<{ key: keyof ProductDetailsResult["counts"]; label: string }> = [
  { key: "options", label: "Options" },
  { key: "sellingRates", label: "Selling rates" },
  { key: "supplierRates", label: "Supplier rates" },
  { key: "bookings", label: "Bookings" },
]

function formatEventRange(product: ProductDetailsResult["product"]) {
  const event = product.event
  if (!event) return null
  const parts: string[] = []
  if (event.event_date_from) {
    parts.push(format(new Date(event.event_date_from), "MMM dd, yyyy"))
  }
  if (event.event_date_to && event.event_date_to !== event.event_date_from) {
    parts.push(format(new Date(event.event_date_to), "MMM dd, yyyy"))
  }
  return parts.join(" — ")
}

export function ProductOverviewCard({ product, counts }: ProductOverviewCardProps) {
  const eventDates = formatEventRange(product)

  return (
    <Card className="overflow-hidden">
      {product.media.length > 0 ? (
        <div className="relative h-48 w-full">
          <Image
            src={product.media[0]}
            alt={`${product.name} hero`}
            fill
            className="object-cover"
            sizes="(min-width: 1024px) 33vw, 100vw"
          />
        </div>
      ) : null}
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Overview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          {product.description ? (
            <p className="text-sm text-muted-foreground leading-6">{product.description}</p>
          ) : (
            <p className="text-sm text-muted-foreground italic">No description provided.</p>
          )}
          {product.tags.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {product.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="uppercase tracking-wide text-[10px]">
                  {tag}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>

        <Separator />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Product type</p>
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-muted-foreground" aria-hidden />
              <span className="text-sm font-medium">
                {product.product_type?.type_name ?? "Uncategorised"}
              </span>
            </div>
            {product.product_type?.type_code ? (
              <p className="text-xs text-muted-foreground">Code: {product.product_type.type_code}</p>
            ) : null}
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Linked event</p>
            {product.event ? (
              <div className="flex flex-col gap-1 text-sm">
                <div className="flex items-center gap-2 font-medium">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" aria-hidden />
                  <span>{product.event.event_name}</span>
                </div>
                {eventDates ? <span className="text-xs text-muted-foreground">{eventDates}</span> : null}
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">No event linked</span>
            )}
          </div>
        </div>

        <Separator />

        <div className="grid gap-3 sm:grid-cols-2">
          {metricLabels.map(({ key, label }) => (
            <div key={key} className="rounded-lg border bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
              <p className="text-xl font-semibold">{counts[key]}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}


