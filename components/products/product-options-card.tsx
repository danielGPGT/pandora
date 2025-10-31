"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Layers, Pencil } from "lucide-react"
import type { ProductDetailsResult } from "@/lib/data/products"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type ProductOptionsCardProps = {
  productId: string
  options: ProductDetailsResult["options"]
}

function formatAttributes(attributes: Record<string, any>) {
  if (!attributes || Object.keys(attributes).length === 0) return "—"
  return JSON.stringify(attributes, null, 2)
}

export function ProductOptionsCard({ productId, options }: ProductOptionsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="text-lg font-semibold">Product options</CardTitle>
          <CardDescription>Variants, room types, or services attached to this product.</CardDescription>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/products/${productId}/edit`}>
            <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {options.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            No product options have been created yet.
          </div>
        ) : (
          <div className="space-y-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Option</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Attributes</TableHead>
                  <TableHead className="w-[80px] text-center">Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {options.map((option) => (
                  <TableRow key={option.id} className="align-top">
                    <TableCell className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Layers className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                        <span className="font-medium">{option.option_name}</span>
                      </div>
                      <Badge variant="outline" className="uppercase tracking-wide text-[10px]">
                        {option.option_code}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {option.description ? option.description : <span className="italic">No description</span>}
                    </TableCell>
                    <TableCell>
                      <pre className="max-h-40 overflow-auto rounded-md border bg-muted/40 p-3 text-xs">
                        {formatAttributes(option.attributes)}
                      </pre>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch checked={Boolean(option.is_active)} disabled className={cn("data-[state=checked]:bg-primary")}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Separator />
            <p className="text-xs text-muted-foreground">
              Product options can be managed from the edit screen. Each option can have dedicated supplier and selling rates
              as well as contract allocations.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}


