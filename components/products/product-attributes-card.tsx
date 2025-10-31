"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { CalendarClock, Hash, MapPin, User } from "lucide-react"
import { format } from "date-fns"
import type { ProductDetailsResult } from "@/lib/data/products"
import { productTypeAttributeMap } from "@/components/products/product-attribute-editor"

type ProductAttributesCardProps = {
  product: ProductDetailsResult["product"]
}

function getAttributeValue(data: Record<string, any>, path: string) {
  if (!data) return undefined
  return path.split(".").reduce<any>((acc, key) => {
    if (acc == null) return undefined
    return acc[key]
  }, data)
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—"
  if (typeof value === "boolean") return value ? "Yes" : "No"
  if (Array.isArray(value)) return value.join(", ")
  if (typeof value === "object") return JSON.stringify(value)
  return String(value)
}

function formatDateTime(value: string) {
  try {
    return format(new Date(value), "MMM dd, yyyy HH:mm")
  } catch {
    return value
  }
}

export function ProductAttributesCard({ product }: ProductAttributesCardProps) {
  const typeKey = product.product_type?.type_code?.toLowerCase() ?? ""
  const typeFields = productTypeAttributeMap[typeKey] ?? []
  const attributes = product.attributes ?? {}
  const attributeEntries = typeFields
    .map((field) => ({
      label: field.label,
      value: getAttributeValue(attributes, field.path),
    }))
    .filter((entry) => entry.value !== undefined && entry.value !== null && entry.value !== "")

  const location = product.location ?? null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Attributes & metadata</CardTitle>
        <CardDescription>Type-guided attributes, system metadata, and location details.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Metadata</h3>
          <dl className="grid gap-3 md:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground uppercase tracking-wide">Product code</dt>
              <dd className="flex items-center gap-2 text-sm font-medium">
                <Hash className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                {product.code}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase tracking-wide">Product type</dt>
              <dd className="text-sm font-medium">{product.product_type?.type_name ?? "Uncategorised"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase tracking-wide">Linked event</dt>
              <dd className="text-sm">
                {product.event ? (
                  <div className="space-y-1">
                    <span className="font-medium">{product.event.event_name}</span>
                    <div className="text-xs text-muted-foreground">
                      {product.event.event_code ? <Badge variant="outline">{product.event.event_code}</Badge> : null}
                    </div>
                  </div>
                ) : (
                  <span className="text-muted-foreground">No event linked</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase tracking-wide">Created</dt>
              <dd className="flex items-center gap-2 text-sm">
                <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                {formatDateTime(product.created_at)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase tracking-wide">Updated</dt>
              <dd className="flex items-center gap-2 text-sm">
                <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                {formatDateTime(product.updated_at)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase tracking-wide">Created by</dt>
              <dd className="flex items-center gap-2 text-sm">
                <User className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                {product.created_by_user
                  ? [product.created_by_user.first_name, product.created_by_user.last_name]
                      .filter(Boolean)
                      .join(" ") || product.created_by_user.email || "Unknown user"
                  : "Unknown user"}
              </dd>
            </div>
          </dl>
        </section>

        {location ? (
          <section className="space-y-3">
            <Separator />
            <h3 className="text-sm font-semibold">Location</h3>
            <dl className="grid gap-3 md:grid-cols-2">
              {[
                { label: "Address", value: location.address_line1 },
                { label: "City", value: location.city },
                { label: "Country", value: location.country },
                { label: "Latitude", value: location.latitude },
                { label: "Longitude", value: location.longitude },
              ]
                .filter((item) => item.value)
                .map((item) => (
                  <div key={item.label}>
                    <dt className="text-xs text-muted-foreground uppercase tracking-wide">{item.label}</dt>
                    <dd className="flex items-center gap-2 text-sm">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                      {item.value}
                    </dd>
                  </div>
                ))}
            </dl>
          </section>
        ) : null}

        <section className="space-y-3">
          <Separator />
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Type-specific attributes</h3>
            {product.product_type?.type_code ? (
              <Badge variant="outline" className="uppercase tracking-wide text-[10px]">
                {product.product_type.type_code}
              </Badge>
            ) : null}
          </div>
          {attributeEntries.length > 0 ? (
            <dl className="grid gap-3">
              {attributeEntries.map((entry) => (
                <div key={entry.label}>
                  <dt className="text-xs text-muted-foreground uppercase tracking-wide">{entry.label}</dt>
                  <dd className="text-sm font-medium">{formatValue(entry.value)}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">No structured attributes recorded for this product type.</p>
          )}
        </section>

        <section className="space-y-3">
          <Separator />
          <h3 className="text-sm font-semibold">Raw attributes JSON</h3>
          <pre className="max-h-80 overflow-auto rounded-lg border bg-muted/40 p-3 text-xs">
            {JSON.stringify(attributes, null, 2)}
          </pre>
        </section>
      </CardContent>
    </Card>
  )
}


