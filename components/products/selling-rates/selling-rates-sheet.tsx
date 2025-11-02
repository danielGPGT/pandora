"use client"

import { useMemo, useState, useTransition } from "react"
import { type ColumnDef } from "@tanstack/react-table"
import { format } from "date-fns"
import { useRouter, usePathname } from "next/navigation"
import { toast } from "sonner"

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/ui/status-badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { RateCalendarView } from "@/components/products/selling-rates/rate-calendar-view"
import { RateQuoteCalculator } from "@/components/products/selling-rates/rate-quote-calculator"
import { DataTable08 } from "@/components/reusable/data-table/data-table-08"
import { cn } from "@/lib/utils"
import type { ProductDetailsResult, SellingRateDetails } from "@/lib/data/products"
import { deleteSellingRate, duplicateSellingRate, setSellingRateActiveState } from "@/lib/actions/selling-rates"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { SellingRateDialog } from "@/components/products/selling-rates/selling-rate-dialog"
import { DeleteDialog } from "@/components/reusable/delete-dialog"
import { CircleDollarSign, Copy, MoreHorizontal, Pencil, ToggleLeft, Trash2 } from "lucide-react"

type OptionRow = ProductDetailsResult["options"][number]

type SellingRatesSheetProps = {
  product: ProductDetailsResult["product"]
  option: OptionRow
  options: ProductDetailsResult["options"] // All options for quote calculator
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SellingRatesSheet({ product, option, options, open, onOpenChange }: SellingRatesSheetProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create")
  const [selectedRate, setSelectedRate] = useState<SellingRateDetails | undefined>()
  const [isPending, startTransition] = useTransition()
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [rateToDelete, setRateToDelete] = useState<SellingRateDetails | null>(null)
  const [viewMode, setViewMode] = useState<"table" | "calendar" | "quote">("table")

  // Filter rates based on status
  const filteredRates = useMemo(() => {
    if (statusFilter === "all") return option.selling_rates
    return option.selling_rates.filter((rate) => {
      if (statusFilter === "active") return rate.is_active === true
      return rate.is_active !== true
    })
  }, [option.selling_rates, statusFilter])

  // Calculate stats
  const stats = useMemo(() => {
    const total = option.selling_rates.length
    const active = option.selling_rates.filter((r) => r.is_active).length
    const inactive = total - active
    return { total, active, inactive }
  }, [option.selling_rates])

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
        header: "Price",
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.currency} {row.original.base_price.toFixed(2)}
          </span>
        ),
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
        cell: ({ row }) => {
          const rate = row.original
          const isUpdating = updatingStatus === rate.id
          
          return (
            <div className="flex items-center gap-3">
              <Switch
                checked={rate.is_active}
                disabled={isUpdating}
                onCheckedChange={() => handleInlineToggle(rate)}
                aria-label={`Toggle ${rate.rate_name || "rate"} status`}
              />
              <StatusBadge variant={rate.is_active ? "success" : "warning"} className="uppercase">
                {rate.is_active ? "Active" : "Inactive"}
              </StatusBadge>
            </div>
          )
        },
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
    handleInlineToggle(rate)
  }

  const handleInlineToggle = (rate: SellingRateDetails) => {
    setUpdatingStatus(rate.id)
    startTransition(async () => {
      try {
        await setSellingRateActiveState(rate.id, !rate.is_active)
        toast.success(rate.is_active ? "Rate deactivated" : "Rate activated")
        router.refresh()
      } catch (error) {
        toast.error("Failed to update rate", {
          description: error instanceof Error ? error.message : undefined,
        })
      } finally {
        setUpdatingStatus(null)
      }
    })
  }

  const handleDelete = (rate: SellingRateDetails) => {
    setRateToDelete(rate)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!rateToDelete) return
    try {
      await deleteSellingRate(rateToDelete.id)
      toast.success("Selling rate deleted")
      router.refresh()
    } catch (error) {
      toast.error("Failed to delete rate", {
        description: error instanceof Error ? error.message : undefined,
      })
      throw error // Re-throw so DeleteDialog can handle it
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col px-4 gap-6 !overflow-y-auto max-w-5xl!">
        <SheetHeader className="px-0">
          <SheetTitle>Manage selling rates</SheetTitle>
          <SheetDescription>
            {option.option_name} · {option.option_code}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 ">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">{product.name}</p>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className={cn(option.is_active ? "border-green-500/40" : "border-yellow-500/40")}>
                  {option.is_active ? "Option active" : "Option inactive"}
                </Badge>
                <Badge variant="outline">
                  {stats.total} total {stats.total === 1 ? "rate" : "rates"}
                </Badge>
                <Badge variant="outline" className="border-green-500/40">
                  {stats.active} active
                </Badge>
                {stats.inactive > 0 && (
                  <Badge variant="outline" className="border-yellow-500/40">
                    {stats.inactive} inactive
                  </Badge>
                )}
              </div>
            </div>
            <Button onClick={handleCreate}>New rate</Button>
          </div>

          {/* View Mode and Status Filter Tabs */}
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as typeof viewMode)} className="space-y-4">
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="table">Table View</TabsTrigger>
                <TabsTrigger value="calendar">Calendar View</TabsTrigger>
                <TabsTrigger value="quote">Quote Calculator</TabsTrigger>
              </TabsList>
              
              {viewMode === "table" && (
                <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
                  <TabsList className="grid grid-cols-3">
                    <TabsTrigger value="all">
                      All ({stats.total})
                    </TabsTrigger>
                    <TabsTrigger value="active">
                      Active ({stats.active})
                    </TabsTrigger>
                    <TabsTrigger value="inactive">
                      Inactive ({stats.inactive})
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              )}
            </div>

            <TabsContent value="table" className="mt-0">
              <DataTable08
                columns={columns}
                data={filteredRates}
                storageKey={`selling-rates-${option.id}`}
                enableSearch={false}
                enableColumnVisibility={false}
                enableViewToggle={false}
                enablePagination={false}
                emptyMessage={
                  statusFilter === "all"
                    ? "No selling rates yet. Create your first rate to get started."
                    : `No ${statusFilter} rates found.`
                }
              />
            </TabsContent>

            <TabsContent value="calendar" className="mt-0">
              <div className="rounded-lg border bg-card p-4">
                <RateCalendarView
                  rates={filteredRates}
                  onRateClick={(rate) => {
                    handleEdit(rate)
                    setViewMode("table") // Switch to table to see details
                  }}
                />
              </div>
            </TabsContent>

            <TabsContent value="quote" className="mt-0">
              <RateQuoteCalculator product={product} options={options} />
            </TabsContent>
          </Tabs>
        </div>

        <SellingRateDialog
          productId={product.id}
          optionId={option.id}
          mode={dialogMode}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          rate={selectedRate}
          existingRates={option.selling_rates}
        />

        <DeleteDialog
          open={deleteDialogOpen}
          onOpenChange={(open) => {
            setDeleteDialogOpen(open)
            if (!open) {
              setRateToDelete(null)
            }
          }}
          onConfirm={handleConfirmDelete}
          itemName={rateToDelete?.rate_name ?? rateToDelete?.rate_basis ?? "rate"}
          title="Delete selling rate?"
          description={`Are you sure you want to delete "${rateToDelete?.rate_name ?? rateToDelete?.rate_basis ?? "this rate"}"?`}
          details={
            rateToDelete ? (
              <div className="text-sm text-muted-foreground space-y-1">
                <p>
                  <strong>Rate basis:</strong> {rateToDelete.rate_basis}
                </p>
                <p>
                  <strong>Pricing model:</strong> {rateToDelete.pricing_model}
                </p>
                <p>
                  <strong>Valid from:</strong> {format(new Date(rateToDelete.valid_from), "PP")}
                </p>
                <p>
                  <strong>Valid to:</strong> {format(new Date(rateToDelete.valid_to), "PP")}
                </p>
              </div>
            ) : null
          }
        />
      </SheetContent>
    </Sheet>
  )
}

