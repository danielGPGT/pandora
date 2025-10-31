"use client"

import { useMemo, useState, useTransition } from "react"
import { type ColumnDef } from "@tanstack/react-table"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { DataTable08 } from "@/components/reuseable/data-table/data-table-08"
import { StatusBadge } from "@/components/ui/status-badge"
import { ProductOptionDialog } from "@/components/products/product-option-dialog"
import {
  bulkDeleteProductOptions,
  bulkUpdateProductOptionStatus,
  deleteProductOption,
  duplicateProductOption,
} from "@/lib/actions/product-options"
import type { ProductDetailsResult } from "@/lib/data/products"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Layers, MoreHorizontal, Plus, Copy, Pencil, Trash2, TrendingUp, Building2, CalendarClock, BadgeDollarSign } from "lucide-react"
import { cn } from "@/lib/utils"
import { SellingRatesSheet } from "@/components/products/selling-rates/selling-rates-sheet"

type OptionRow = ProductDetailsResult["options"][number]

type ProductOptionsManagerProps = {
  product: ProductDetailsResult["product"]
  options: ProductDetailsResult["options"]
}

export function ProductOptionsManager({ product, options }: ProductOptionsManagerProps) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create")
  const [selectedOption, setSelectedOption] = useState<OptionRow | undefined>()
  const [isPending, startTransition] = useTransition()
  const [ratesSheetOpen, setRatesSheetOpen] = useState(false)
  const [ratesOption, setRatesOption] = useState<OptionRow | null>(null)
  const productTypeKey = product.product_type?.type_code?.toLowerCase()

  const handleCreate = () => {
    setSelectedOption(undefined)
    setDialogMode("create")
    setDialogOpen(true)
  }

  const handleEdit = (option: OptionRow) => {
    setSelectedOption(option)
    setDialogMode("edit")
    setDialogOpen(true)
  }

  const handleDuplicate = (option: OptionRow) => {
    startTransition(async () => {
      try {
        await duplicateProductOption(option.id)
        toast.success(`Duplicated ${option.option_name}`)
        router.refresh()
      } catch (error) {
        toast.error("Failed to duplicate option", {
          description: error instanceof Error ? error.message : undefined,
        })
      }
    })
  }

  const handleManageRates = (option: OptionRow) => {
    setRatesOption(option)
    setRatesSheetOpen(true)
  }

  const handleDelete = (option: OptionRow) => {
    if (!confirm(`Delete option “${option.option_name}”? This cannot be undone.`)) return
    startTransition(async () => {
      try {
        await deleteProductOption(option.id)
        toast.success("Option deleted")
        router.refresh()
      } catch (error) {
        toast.error("Failed to delete option", {
          description: error instanceof Error ? error.message : undefined,
        })
      }
    })
  }

  const columns = useMemo<ColumnDef<OptionRow>[]>(
    () => [
      {
        accessorKey: "option_name",
        header: "Option",
        cell: ({ row }) => {
          const option = row.original
          return (
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
          )
        },
      },
      {
        accessorKey: "selling_rate_count",
        header: "Selling rates",
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-2 px-2 text-sm"
            onClick={() => handleManageRates(row.original)}
          >
            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            <span>{row.original.selling_rate_count}</span>
          </Button>
        ),
      },
      {
        accessorKey: "supplier_rate_count",
        header: "Supplier rates",
        cell: ({ row }) => (
          <div className="flex items-center gap-1 text-sm">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            <span>{row.original.supplier_rate_count}</span>
          </div>
        ),
      },
      {
        accessorKey: "allocation_count",
        header: "Allocations",
        cell: ({ row }) => <span className="text-sm">{row.original.allocation_count}</span>,
      },
      {
        accessorKey: "upcoming_booking_count",
        header: "Upcoming",
        cell: ({ row }) => (
          <div className="flex items-center gap-1 text-sm">
            <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            <span>{row.original.upcoming_booking_count}</span>
          </div>
        ),
      },
      {
        accessorKey: "updated_at",
        header: "Updated",
        cell: ({ row }) => {
          const updated = row.original.updated_at ? new Date(row.original.updated_at) : null
          return (
            <span className="text-sm text-muted-foreground">
              {updated ? format(updated, "MMM dd, yyyy") : "—"}
            </span>
          )
        },
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          const option = row.original
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleEdit(option)}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleManageRates(option)}>
                  <BadgeDollarSign className="mr-2 h-4 w-4" /> Manage selling rates
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDuplicate(option)}>
                  <Copy className="mr-2 h-4 w-4" /> Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDelete(option)} className="text-destructive focus:text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
    ],
    [handleEdit, handleDuplicate, handleDelete, handleManageRates]
  )

  const handleBulkDelete = async (selected: OptionRow[]) => {
    const ids = selected.map((option) => option.id)
    try {
      await bulkDeleteProductOptions(ids)
      toast.success(`Deleted ${ids.length} option${ids.length === 1 ? "" : "s"}`)
      router.refresh()
    } catch (error) {
      toast.error("Failed to delete options", {
        description: error instanceof Error ? error.message : undefined,
      })
    }
  }

  const handleBulkStatusChange = async (selected: OptionRow[], status: boolean) => {
    const ids = selected.map((option) => option.id)
    try {
      await bulkUpdateProductOptionStatus(ids, status)
      toast.success(status ? "Activated options" : "Deactivated options")
      router.refresh()
    } catch (error) {
      toast.error("Failed to update options", {
        description: error instanceof Error ? error.message : undefined,
      })
    }
  }

  const handleBulkDuplicate = async (selected: OptionRow[]) => {
    try {
      for (const option of selected) {
        await duplicateProductOption(option.id)
      }
      toast.success(`Duplicated ${selected.length} option${selected.length === 1 ? "" : "s"}`)
      router.refresh()
    } catch (error) {
      toast.error("Failed to duplicate options", {
        description: error instanceof Error ? error.message : undefined,
      })
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="text-lg font-semibold">Options</CardTitle>
          <p className="text-sm text-muted-foreground">Manage the sellable variants for this product.</p>
        </div>
        <Button onClick={handleCreate} className="gap-2" disabled={isPending}>
          <Plus className="h-4 w-4" /> New option
        </Button>
      </CardHeader>
      <CardContent>
        <DataTable08<OptionRow>
          data={options}
          columns={columns}
          storageKey={`product-options-${product.id}`}
          enableSearch
          searchPlaceholder="Search options..."
          enableColumnVisibility
          enableExport
          enableRowSelection
          onBulkDelete={(rows) => handleBulkDelete(rows)}
          onBulkStatusChange={(rows, status) => handleBulkStatusChange(rows, status)}
          onBulkDuplicate={(rows) => handleBulkDuplicate(rows)}
          emptyMessage="No options defined yet."
          cardViewRenderer={({ original }: { original: OptionRow }) => (
            <div className={cn("space-y-2 rounded-lg border bg-card p-3 shadow-sm", !original.is_active && "opacity-60")}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-muted-foreground" aria-hidden />
                    <span className="font-medium">{original.option_name}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">{original.option_code}</Badge>
                    <StatusBadge variant={original.is_active ? "success" : "warning"}>
                      {original.is_active ? "Active" : "Inactive"}
                    </StatusBadge>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEdit(original)}>
                      <Pencil className="mr-2 h-4 w-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleManageRates(original)}>
                      <BadgeDollarSign className="mr-2 h-4 w-4" /> Manage selling rates
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDuplicate(original)}>
                      <Copy className="mr-2 h-4 w-4" /> Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDelete(original)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <span>Selling rates: {original.selling_rate_count}</span>
                <span>Supplier rates: {original.supplier_rate_count}</span>
                <span>Allocations: {original.allocation_count}</span>
                <span>Upcoming bookings: {original.upcoming_booking_count}</span>
              </div>
            </div>
          )}
        />
      </CardContent>
      <ProductOptionDialog
        mode={dialogMode}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        productId={product.id}
        option={dialogMode === "edit" ? selectedOption : undefined}
        productTypeKey={productTypeKey}
      />
      {ratesOption ? (
        <SellingRatesSheet
          product={product}
          option={ratesOption}
          open={ratesSheetOpen}
          onOpenChange={(open) => {
            setRatesSheetOpen(open)
            if (!open) {
              setRatesOption(null)
            }
          }}
        />
      ) : null}
    </Card>
  )
}

