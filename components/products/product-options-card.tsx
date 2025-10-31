"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Layers, ArrowRight } from "lucide-react"
import type { ProductDetailsResult } from "@/lib/data/products"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { cn } from "@/lib/utils"

type ProductOptionsCardProps = {
  productId: string
  options: ProductDetailsResult["options"]
}

export function ProductOptionsCard({ productId, options }: ProductOptionsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="text-lg font-semibold">Product options</CardTitle>
          <CardDescription>Variants, room types, or services attached to this product.</CardDescription>
        </div>
        <Button asChild variant="outline" size="sm" className="gap-1">
          <Link href={`/products/${productId}?tab=options`}>
            Manage options
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {options.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            No product options have been created yet.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3">
              {options.slice(0, 3).map((option) => (
                <div key={option.id} className={cn("rounded-lg border bg-muted/30 p-3", !option.is_active && "opacity-70")}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-muted-foreground" aria-hidden />
                        <span className="font-medium leading-none">{option.option_name}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline">{option.option_code}</Badge>
                        <StatusBadge variant={option.is_active ? "success" : "warning"} className="uppercase">
                          {option.is_active ? "Active" : "Inactive"}
                        </StatusBadge>
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p>Selling rates: {option.selling_rate_count}</p>
                      <p>Supplier rates: {option.supplier_rate_count}</p>
                    </div>
                  </div>
                  {option.description ? (
                    <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{option.description}</p>
                  ) : null}
                </div>
              ))}
            </div>
            {options.length > 3 ? (
              <p className="text-xs text-muted-foreground">
                Showing the first three options. Use the options tab to manage the full list.
              </p>
            ) : null}
            <Separator />
            <p className="text-xs text-muted-foreground">
              Each option can have dedicated supplier and selling rates as well as contract allocations and availability.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}


