"use client"

import { useMemo, useState, useTransition } from "react"
import { type ColumnDef } from "@tanstack/react-table"
import { format } from "date-fns"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/ui/status-badge"
import { DataTable08 } from "@/components/reuseable/data-table/data-table-08"
import { cn } from "@/lib/utils"
import type { ProductDetailsResult, SellingRateDetails } from "@/lib/data/products"
import { deleteSellingRate, duplicateSellingRate, setSellingRateActiveState } from "@/lib/actions/selling-rates"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { SellingRateDialog } from "@/components/products/selling-rates/selling-rate-dialog"
import { CircleDollarSign, Copy, MoreHorizontal, Pencil, ToggleLeft, Trash2 } from "lucide-react"

type OptionRow = ProductDetailsResult["options"][number]

type SellingRatesSheetProps = {
  product: ProductDetailsResult["product"]
  option: OptionRow
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SellingRatesSheet({ product, option, open, onOpenChange }: SellingRatesSheetProps) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create")
  const [selectedRate, setSelectedRate] = useState<SellingRateDetails | undefined>()
  const [isPending, startTransition] = useTransition()

  const columns = useMemo<ColumnDef<SellingRateDetails>[]>(
    () => [
      {
        accessorKey: "rate_name",
        header: "Rate",
        cell: ({ row }) => {
          const rate = row.original
          return (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CircleDollarSign className="h-4 w-4 text-muted-foreground" aria-hidden />
                <span className="font-medium leading-none">{rate.rate_name || "Untitled rate"}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="uppercase">
                  {rate.rate_basis}
                </Badge>
                <Badge className="bg-muted text-muted-foreground capitalize">{rate.pricing_model.replaceAll("_", " ")}</Badge>
              </div>
            </div>
          )
        },
      },
      {
        accessorKey: "base_price",
        header: "Base price",
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.currency} {row.original.base_price.toFixed(2)}
          </span>
        ),
      },
      {
        accessorKey: "markup_amount",
        header: "Markup",
        cell: ({ row }) => {
          const { markup_amount, markup_type } = row.original
          if (markup_amount === null || !markup_type) return <span className="text-sm text-muted-foreground">—</span>
          return (
            <span className="text-sm">
              {markup_type === "percentage" ? `${markup_amount}%` : `${markup_amount.toFixed(2)} ${row.original.currency}`}
            </span>
          )
        },
      },
      {
        accessorKey: "valid_from",
        header: "Valid",
        cell: ({ row }) => {
          const { valid_from, valid_to } = row.original
          const from = format(new Date(valid_from), "MMM d, yyyy")
          const to = format(new Date(valid_to), "MMM d, yyyy")
          return <span className="text-sm text-muted-foreground">{from} → {to}</span>
        },
      },
      {
        accessorKey: "is_active",
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge variant={row.original.is_active ? "success" : "warning"} className="uppercase">
            {row.original.is_active ? "Active" : "Inactive"}
          </StatusBadge>
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          const rate = row.original
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleEdit(rate)}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDuplicate(rate)}>
                  <Copy className="mr-2 h-4 w-4" /> Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toggleStatus(rate)}>
                  <ToggleLeft className="mr-2 h-4 w-4" /> {rate.is_active ? "Deactivate" : "Activate"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDelete(rate)} className="text-destructive focus:text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
    ],
    []
  )

  const handleCreate = () => {
    setDialogMode("create")
    setSelectedRate(undefined)
    setDialogOpen(true)
  }

  const handleEdit = (rate: SellingRateDetails) => {
    setDialogMode("edit")
    setSelectedRate(rate)
    setDialogOpen(true)
  }

  const handleDuplicate = (rate: SellingRateDetails) => {
    startTransition(async () => {
      try {
        await duplicateSellingRate(rate.id)
        toast.success("Selling rate duplicated")
        router.refresh()
      } catch (error) {
        toast.error("Failed to duplicate rate", {
          description: error instanceof Error ? error.message : undefined,
        })
      }
    })
  }

  const toggleStatus = (rate: SellingRateDetails) => {
    startTransition(async () => {
      try {
        await setSellingRateActiveState(rate.id, !rate.is_active)
        toast.success(rate.is_active ? "Rate deactivated" : "Rate activated")
        router.refresh()
      } catch (error) {
        toast.error("Failed to update rate", {
          description: error instanceof Error ? error.message : undefined,
        })
      }
    })
  }

  const handleDelete = (rate: SellingRateDetails) => {
    if (!confirm(`Delete rate “${rate.rate_name ?? rate.rate_basis}”? This cannot be undone.`)) return
    startTransition(async () => {
      try {
        await deleteSellingRate(rate.id)
        toast.success("Selling rate deleted")
        router.refresh()
      } catch (error) {
        toast.error("Failed to delete rate", {
          description: error instanceof Error ? error.message : undefined,
        })
      }
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-6 overflow-hidden md:max-w-3xl">
        <SheetHeader>
          <SheetTitle>Manage selling rates</SheetTitle>
          <SheetDescription>
            {option.option_name} · {option.option_code}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 overflow-hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{product.name}</p>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className={cn(option.is_active ? "border-green-500/40" : "border-yellow-500/40")}
                >
                  {option.is_active ? "Option active" : "Option inactive"}
                </Badge>
                <Badge variant="outline">{option.selling_rate_count} total rates</Badge>
              </div>
            </div>
            <Button onClick={handleCreate}>New rate</Button>
          </div>

          <DataTable08
            columns={columns}
            data={option.selling_rates}
            storageKey={`selling-rates-${option.id}`}
            enableSearch={false}
            enableColumnVisibility={false}
            enableViewToggle={false}
            enablePagination={false}
            emptyMessage="No selling rates yet"
          />
        </div>

        <SellingRateDialog
          productId={product.id}
          optionId={option.id}
          mode={dialogMode}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          rate={selectedRate}
        />
      </SheetContent>
    </Sheet>
  )
}

