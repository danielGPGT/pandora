"use client"

import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CalendarDays, Layers } from "lucide-react"
import type { ProductDetailsResult } from "@/lib/data/products"
// Use centralized utilities
import { formatEventDateRange } from "@/lib/utils/date-range"

type ProductOverviewCardProps = {
  product: ProductDetailsResult["product"]
  counts: ProductDetailsResult["counts"]
}

const metricLabels: Array<{
  key: keyof ProductDetailsResult["counts"]
  label: string
  format?: (counts: ProductDetailsResult["counts"]) => string
  hideZero?: boolean
}> = [
  {
    key: "options",
    label: "Options",
    format: (counts) => (counts.options ? `${counts.optionsActive}/${counts.options}` : "0"),
  },
  { key: "allocations", label: "Allocations", hideZero: true },
  { key: "bookings", label: "Bookings" },
]

// Formatting function moved to lib/utils/date-range - see imports above

export function ProductOverviewCard({ product, counts }: ProductOverviewCardProps) {
  const eventDates = product.event ? formatEventDateRange(product.event) : null

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
          {metricLabels.map(({ key, label, format: formatter, hideZero }) => {
            const value = counts[key]
            if (hideZero && typeof value === "number" && value === 0) {
              return null
            }

            const display = formatter ? formatter(counts) : typeof value === "number" ? value.toLocaleString() : String(value)

            return (
              <div key={key} className="rounded-lg border bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
                <p className="text-xl font-semibold">{display}</p>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}


