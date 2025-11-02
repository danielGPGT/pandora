"use client"

import { useMemo, useState, useTransition } from "react"
import { type ColumnDef } from "@tanstack/react-table"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { DataTable08 } from "@/components/reusable/data-table/data-table-08"
import { StatusBadge } from "@/components/ui/status-badge"
import { ProductOptionDialog } from "@/components/products/product-option-dialog"
import {
  bulkDeleteProductOptions,
  bulkUpdateProductOptionStatus,
  deleteProductOption,
  duplicateProductOption,
  updateProductOptionStatus,
} from "@/lib/actions/product-options"
import type { ProductDetailsResult } from "@/lib/data/products"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Layers, MoreHorizontal, Plus, Copy, Pencil, Trash2, TrendingUp, Building2, CalendarClock, BadgeDollarSign, History, CheckCircle2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { SellingRatesSheet } from "@/components/products/selling-rates/selling-rates-sheet"
import { ActivityTimeline, type AuditLogEntry } from "@/components/audit/activity-timeline"
import { getAuditLogs } from "@/lib/actions/audit-logs"
import { DeleteDialog } from "@/components/reusable/delete-dialog"

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
  const [ratesOptionId, setRatesOptionId] = useState<string | null>(null)

  // Get fresh option from props when ID changes or props update
  const ratesOption = useMemo(() => {
    if (!ratesOptionId) return null
    return options.find((opt) => opt.id === ratesOptionId) ?? null
  }, [ratesOptionId, options])
  const [activitySheetOpen, setActivitySheetOpen] = useState(false)
  const [activityOption, setActivityOption] = useState<OptionRow | null>(null)
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([])
  const [auditLogsLoading, setAuditLogsLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [optionToDelete, setOptionToDelete] = useState<OptionRow | null>(null)
  const productTypeKey = product.product_type?.type_code?.toLowerCase()

  // Filter options based on status
  const filteredOptions = useMemo(() => {
    if (statusFilter === "all") return options
    return options.filter((opt) => {
      if (statusFilter === "active") return opt.is_active === true
      return opt.is_active !== true
    })
  }, [options, statusFilter])

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
    setRatesOptionId(option.id)
    setRatesSheetOpen(true)
  }

  const handleViewActivity = async (option: OptionRow) => {
    setActivityOption(option)
    setActivitySheetOpen(true)
    setAuditLogsLoading(true)
    
    try {
      const result = await getAuditLogs({
        entity_type: "product_option",
        entity_id: option.id,
        limit: 100,
        offset: 0,
      })
      
      const logs = (result.logs || []).map((log: any) => ({
        id: log.id,
        entity_type: log.entity_type,
        entity_id: log.entity_id,
        action: log.action,
        old_values: log.old_values,
        new_values: log.new_values,
        changed_by: log.changed_by,
        changed_at: log.changed_at,
        changed_by_user: log.changed_by_user
          ? {
              id: log.changed_by_user.id,
              email: log.changed_by_user.email ?? null,
              first_name: log.changed_by_user.first_name ?? null,
              last_name: log.changed_by_user.last_name ?? null,
            }
          : null,
      })) as AuditLogEntry[]
      
      setAuditLogs(logs)
    } catch (error) {
      toast.error("Failed to load activity", {
        description: error instanceof Error ? error.message : undefined,
      })
      setAuditLogs([])
    } finally {
      setAuditLogsLoading(false)
    }
  }

  const handleToggleStatus = async (option: OptionRow) => {
    setUpdatingStatus(option.id)
    try {
      await updateProductOptionStatus(option.id, !option.is_active)
      toast.success(`Option ${!option.is_active ? "activated" : "deactivated"}`)
      router.refresh()
    } catch (error) {
      toast.error("Failed to update status", {
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setUpdatingStatus(null)
    }
  }

  const handleDelete = (option: OptionRow) => {
    setOptionToDelete(option)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!optionToDelete) return
    try {
      await deleteProductOption(optionToDelete.id)
      toast.success("Option deleted")
      router.refresh()
    } catch (error) {
      toast.error("Failed to delete option", {
        description: error instanceof Error ? error.message : undefined,
      })
      throw error
    }
  }

  const columns = useMemo<ColumnDef<OptionRow>[]>(
    () => [
      {
        accessorKey: "option_name",
        header: "Option",
        cell: ({ row }) => {
          const option = row.original
          // Calculate completion score
          const hasSellingRates = option.selling_rate_count > 0
          const hasSupplierRates = option.supplier_rate_count > 0
          const hasAllocations = option.allocation_count > 0
          const completionItems = [hasSellingRates, hasSupplierRates, hasAllocations].filter(Boolean).length
          const completionScore = completionItems
          
          return (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-muted-foreground" aria-hidden />
                <span className="font-medium leading-none">{option.option_name}</span>
                {completionScore < 2 && (
                  <Badge variant="outline" className="text-xs">
                    {completionScore}/3
                  </Badge>
                )}
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
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const option = row.original
          const isUpdating = updatingStatus === option.id
          return (
            <Switch
              checked={option.is_active ?? false}
              onCheckedChange={() => handleToggleStatus(option)}
              disabled={isUpdating}
              aria-label={`Toggle ${option.option_name} status`}
            />
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
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => handleDuplicate(option)}
                title="Duplicate option"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">More actions</span>
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
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleViewActivity(option)}>
                    <History className="mr-2 h-4 w-4" /> View activity
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleDelete(option)} className="text-destructive focus:text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ],
    [handleEdit, handleDuplicate, handleDelete, handleManageRates, handleToggleStatus, updatingStatus]
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
      <CardContent className="space-y-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center justify-between">
          <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
            <TabsList>
              <TabsTrigger value="all">
                All ({options.length})
              </TabsTrigger>
              <TabsTrigger value="active">
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                Active ({options.filter((o) => o.is_active === true).length})
              </TabsTrigger>
              <TabsTrigger value="inactive">
                <AlertCircle className="mr-1.5 h-3.5 w-3.5" />
                Inactive ({options.filter((o) => o.is_active !== true).length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <DataTable08<OptionRow>
          data={filteredOptions}
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
          emptyMessage={
            statusFilter === "all" ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Layers className="h-12 w-12 text-muted-foreground/40 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No options defined yet</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-md">
                  Product options are the sellable variants for this product. Create your first option to start defining rates, allocations, and availability.
                </p>
                <Button onClick={handleCreate} className="gap-2">
                  <Plus className="h-4 w-4" /> Create your first option
                </Button>
              </div>
            ) : (
              `No ${statusFilter} options found.`
            )
          }
          cardViewRenderer={({ original }: { original: OptionRow }) => {
            // Calculate completion score
            const hasSellingRates = original.selling_rate_count > 0
            const hasSupplierRates = original.supplier_rate_count > 0
            const hasAllocations = original.allocation_count > 0
            const completionItems = [hasSellingRates, hasSupplierRates, hasAllocations].filter(Boolean).length
            const completionScore = completionItems
            const isUpdating = updatingStatus === original.id
            
            return (
              <div className={cn("space-y-3 rounded-lg border bg-card p-3 shadow-sm", !original.is_active && "opacity-60")}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-muted-foreground" aria-hidden />
                      <span className="font-medium">{original.option_name}</span>
                      {completionScore < 2 && (
                        <Badge variant="outline" className="text-xs">
                          {completionScore}/3
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline">{original.option_code}</Badge>
                      <StatusBadge variant={original.is_active ? "success" : "warning"}>
                        {original.is_active ? "Active" : "Inactive"}
                      </StatusBadge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Switch
                      checked={original.is_active ?? false}
                      onCheckedChange={() => handleToggleStatus(original)}
                      disabled={isUpdating}
                      aria-label={`Toggle ${original.option_name} status`}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => handleDuplicate(original)}
                      title="Duplicate option"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">More actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleEdit(original)}>
                          <Pencil className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleManageRates(original)}>
                          <BadgeDollarSign className="mr-2 h-4 w-4" /> Manage selling rates
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleViewActivity(original)}>
                          <History className="mr-2 h-4 w-4" /> View activity
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(original)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <span>Selling rates: {original.selling_rate_count}</span>
                  <span>Supplier rates: {original.supplier_rate_count}</span>
                  <span>Allocations: {original.allocation_count}</span>
                  <span>Upcoming bookings: {original.upcoming_booking_count}</span>
                </div>
              </div>
            )
          }}
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
          key={`rates-${ratesOption.id}`}
          product={product}
          option={ratesOption}
          options={options}
          open={ratesSheetOpen}
          onOpenChange={(open) => {
            setRatesSheetOpen(open)
            if (!open) {
              setRatesOptionId(null)
            }
          }}
        />
      ) : null}
      
      {activityOption ? (
        <Sheet open={activitySheetOpen} onOpenChange={(open) => {
          setActivitySheetOpen(open)
          if (!open) {
            setActivityOption(null)
            setAuditLogs([])
          }
        }}>
          <SheetContent className="sm:max-w-2xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Activity Timeline</SheetTitle>
              <SheetDescription>
                Complete audit trail for option: <strong>{activityOption.option_name}</strong>
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6">
              {auditLogsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-sm text-muted-foreground">Loading activity...</div>
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                  No activity recorded for this option yet.
                </div>
              ) : (
                <ActivityTimeline 
                  logs={auditLogs} 
                  showEntityType={false}
                  emptyMessage="No activity recorded for this option yet."
                />
              )}
            </div>
          </SheetContent>
        </Sheet>
      ) : null}

      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open)
          if (!open) {
            setOptionToDelete(null)
          }
        }}
        onConfirm={handleConfirmDelete}
        itemName={optionToDelete?.option_name}
        title="Delete product option?"
        description={`Are you sure you want to delete "${optionToDelete?.option_name ?? "this option"}"?`}
        details={
          optionToDelete ? (
            <div className="text-sm text-muted-foreground space-y-1">
              <p>
                <strong>Option code:</strong> {optionToDelete.option_code}
              </p>
              <p>
                <strong>Selling rates:</strong> {optionToDelete.selling_rate_count}
              </p>
              <p>
                <strong>Supplier rates:</strong> {optionToDelete.supplier_rate_count}
              </p>
              <p>
                <strong>Allocations:</strong> {optionToDelete.allocation_count}
              </p>
            </div>
          ) : null
        }
        warningMessage="This will permanently delete the product option and all associated data, including selling rates, supplier rates, and allocations."
      />
    </Card>
  )
}

