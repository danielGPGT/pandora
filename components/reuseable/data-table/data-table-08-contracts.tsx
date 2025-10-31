"use client"

import { useEffect, useState } from "react"
import { type ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MoreVertical, Pencil, Trash2, Eye, Calendar, DollarSign, Percent, Download, Copy, X, Power } from "lucide-react"
import { format } from "date-fns"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { deleteContract, bulkDeleteContracts, bulkUpdateContractStatus, bulkDuplicateContracts, updateContract } from "@/lib/actions/contracts"
import { DataTable08 } from "@/components/reuseable/data-table/data-table-08"

export type Contract = {
  id: string
  contract_number: string
  contract_name: string | null
  contract_type: string | null
  valid_from: string
  valid_to: string
  currency: string | null
  total_cost: number | null
  commission_rate: number | null
  status: "draft" | "pending" | "active" | "expired" | "cancelled"
  created_at: string
  updated_at: string
  supplier?: {
    id: string
    name: string
    code: string | null
  } | null
  event?: {
    event_name: string
    event_code: string | null
  } | null
}

const statusVariantMap: Record<Contract["status"], "success" | "warning" | "info" | "destructive" | "default"> = {
  active: "success",
  pending: "warning",
  draft: "default",
  expired: "info",
  cancelled: "destructive",
}

function formatCurrency(amount: number | null, currency: string | null) {
  if (!amount) return "-"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(amount)
}

function formatDate(dateString: string) {
  try {
    return format(new Date(dateString), "MMM dd, yyyy")
  } catch {
    return dateString
  }
}

// Inline editable cells
function EditableContractNameCell({ row, onUpdate }: { row: any; onUpdate: (id: string, value: string | null) => Promise<void> }) {
  const [isEditing, setIsEditing] = useState(false)
  const currentValue = (row.original.contract_name ?? "") as string
  const [value, setValue] = useState(currentValue)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setValue(currentValue)
  }, [currentValue])

  const handleSave = async () => {
    if (value === (row.original.contract_name ?? "")) {
      setIsEditing(false)
      return
    }
    setIsSaving(true)
    try {
      await onUpdate(row.original.id, value || null)
      toast.success("Contract name updated")
      setIsEditing(false)
    } catch (err) {
      toast.error("Failed to update", { description: err instanceof Error ? err.message : undefined })
      setValue(row.original.contract_name ?? "")
    } finally {
      setIsSaving(false)
    }
  }

  if (isEditing) {
    return (
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave()
          if (e.key === "Escape") {
            setValue(row.original.contract_name ?? "")
            setIsEditing(false)
          }
        }}
        autoFocus
        disabled={isSaving}
        className="h-8"
        placeholder="Contract name"
      />
    )
  }

  const displayValue = row.original.contract_name ?? "-"
  return (
    <div onClick={() => setIsEditing(true)} className="cursor-pointer hover:bg-muted/50 rounded px-2 py-1 -mx-2 -my-1 min-h-[2rem] flex items-center text-sm text-muted-foreground">
      {displayValue}
    </div>
  )
}

function EditableTotalCostCell({ row, onUpdate }: { row: any; onUpdate: (id: string, value: number | null) => Promise<void> }) {
  const [isEditing, setIsEditing] = useState(false)
  const currentValue = row.original.total_cost as number | null
  const [value, setValue] = useState(currentValue ? String(currentValue) : "")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setValue(currentValue ? String(currentValue) : "")
  }, [currentValue])

  const handleSave = async () => {
    const numValue = value ? parseFloat(value) : null
    if (numValue === currentValue) {
      setIsEditing(false)
      return
    }
    if (numValue !== null && (isNaN(numValue) || numValue < 0)) {
      toast.error("Invalid amount")
      setValue(currentValue ? String(currentValue) : "")
      setIsEditing(false)
      return
    }
    setIsSaving(true)
    try {
      await onUpdate(row.original.id, numValue)
      toast.success("Total cost updated")
      setIsEditing(false)
    } catch (err) {
      toast.error("Failed to update", { description: err instanceof Error ? err.message : undefined })
      setValue(currentValue ? String(currentValue) : "")
    } finally {
      setIsSaving(false)
    }
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <DollarSign className="h-3 w-3 text-muted-foreground" />
        <Input
          type="number"
          step="0.01"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave()
            if (e.key === "Escape") {
              setValue(currentValue ? String(currentValue) : "")
              setIsEditing(false)
            }
          }}
          autoFocus
          disabled={isSaving}
          className="h-8 w-24"
          placeholder="0.00"
        />
      </div>
    )
  }

  return (
    <div onClick={() => setIsEditing(true)} className="cursor-pointer hover:bg-muted/50 rounded px-2 py-1 -mx-2 -my-1 min-h-[2rem] flex items-center gap-1">
      <DollarSign className="h-3 w-3 text-muted-foreground" />
      <span>{formatCurrency(row.original.total_cost, row.original.currency)}</span>
    </div>
  )
}

function EditableCommissionCell({ row, onUpdate }: { row: any; onUpdate: (id: string, value: number | null) => Promise<void> }) {
  const [isEditing, setIsEditing] = useState(false)
  const currentValue = row.original.commission_rate as number | null
  const [value, setValue] = useState(currentValue ? String(currentValue) : "")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setValue(currentValue ? String(currentValue) : "")
  }, [currentValue])

  const handleSave = async () => {
    const numValue = value ? parseFloat(value) : null
    if (numValue === currentValue) {
      setIsEditing(false)
      return
    }
    if (numValue !== null && (isNaN(numValue) || numValue < 0 || numValue > 100)) {
      toast.error("Invalid rate (0-100)")
      setValue(currentValue ? String(currentValue) : "")
      setIsEditing(false)
      return
    }
    setIsSaving(true)
    try {
      await onUpdate(row.original.id, numValue)
      toast.success("Commission rate updated")
      setIsEditing(false)
    } catch (err) {
      toast.error("Failed to update", { description: err instanceof Error ? err.message : undefined })
      setValue(currentValue ? String(currentValue) : "")
    } finally {
      setIsSaving(false)
    }
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <Percent className="h-3 w-3 text-muted-foreground" />
        <Input
          type="number"
          step="0.01"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave()
            if (e.key === "Escape") {
              setValue(currentValue ? String(currentValue) : "")
              setIsEditing(false)
            }
          }}
          autoFocus
          disabled={isSaving}
          className="h-8 w-20"
          placeholder="0.00"
        />
      </div>
    )
  }

  const rate = row.original.commission_rate
  return (
    <div onClick={() => setIsEditing(true)} className="cursor-pointer hover:bg-muted/50 rounded px-2 py-1 -mx-2 -my-1 min-h-[2rem] flex items-center gap-1">
      {rate ? (
        <>
          <Percent className="h-3 w-3 text-muted-foreground" />
          <span>{rate}%</span>
        </>
      ) : (
        <span className="text-muted-foreground">-</span>
      )}
    </div>
  )
}

function EditableStatusCell({ row, onUpdate }: { row: any; onUpdate: (id: string, value: Contract["status"]) => Promise<void> }) {
  const [isSaving, setIsSaving] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const status = row.getValue("status") as Contract["status"]

  const handleStatusChange = async (newStatus: Contract["status"]) => {
    if (newStatus === status) {
      setIsOpen(false)
      return
    }
    setIsSaving(true)
    try {
      await onUpdate(row.original.id, newStatus)
      toast.success(`Status updated to ${newStatus}`)
      setIsOpen(false)
    } catch (err) {
      toast.error("Failed to update status", { description: err instanceof Error ? err.message : undefined })
    } finally {
      setIsSaving(false)
    }
  }

  const statusOptions: { value: Contract["status"]; label: string; variant: "success" | "warning" | "info" | "destructive" | "default" }[] = [
    { value: "draft", label: "Draft", variant: "default" },
    { value: "pending", label: "Pending", variant: "warning" },
    { value: "active", label: "Active", variant: "success" },
    { value: "expired", label: "Expired", variant: "info" },
    { value: "cancelled", label: "Cancelled", variant: "destructive" },
  ]

  const currentOption = statusOptions.find((opt) => opt.value === status)

  return (
    <div className="flex items-center gap-2">
      {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      <Select value={status} onValueChange={handleStatusChange} open={isOpen} onOpenChange={setIsOpen} disabled={isSaving}>
        <SelectTrigger className="!h-auto !p-0 !border-0 !shadow-none !bg-transparent !hover:bg-transparent !focus:ring-0 !focus:ring-offset-0 !w-auto !min-w-0 gap-1.5 [&>svg]:!size-3 [&>svg]:!opacity-50">
          <StatusBadge variant={statusVariantMap[status]} className="cursor-pointer hover:opacity-80 transition-opacity">
            {currentOption?.label || status}
          </StatusBadge>
        </SelectTrigger>
        <SelectContent>
          {statusOptions.map((option) => (
            <SelectItem key={option.value} value={option.value} className="cursor-pointer">
              <StatusBadge variant={option.variant}>
                {option.label}
              </StatusBadge>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function RowActions({ contract, onDelete }: { contract: Contract; onDelete?: (id: string) => void }) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this contract?")) return
    setIsDeleting(true)
    try {
      await deleteContract(contract.id)
      toast.success("Contract deleted")
      onDelete?.(contract.id)
    } catch (err) {
      toast.error("Failed to delete contract", { description: err instanceof Error ? err.message : undefined })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreVertical className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => router.push(`/contracts/${contract.id}`)}>
          <Eye className="mr-2 h-4 w-4" />
          View Details
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleDelete} disabled={isDeleting} className="text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function ContractsDataTable08({
  initialData,
  totalCount,
  page = 1,
  pageSize = 25,
  q = "",
}: {
  initialData: Contract[]
  totalCount: number
  page?: number
  pageSize?: number
  q?: string
}) {
  const router = useRouter()
  const [data, setData] = useState<Contract[]>(initialData)
  const [globalFilter, setGlobalFilter] = useState(q)

  // Sync data with props
  useEffect(() => {
    setData(initialData)
  }, [initialData])

  // Sync globalFilter with q prop
  useEffect(() => {
    setGlobalFilter(q)
  }, [q])

  const handleDelete = (id: string) => {
    setData((prev) => prev.filter((contract) => contract.id !== id))
    router.refresh()
  }

  // Update handler for inline edits
  const handleFieldUpdate = (field: string) => async (id: string, value: any) => {
    await updateContract(id, { [field]: value })
    // Optimistically update local data
    setData((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)))
    router.refresh()
  }

  const contractColumns: ColumnDef<Contract>[] = [
    {
      accessorKey: "contract_number",
      header: "Contract Number",
      cell: ({ row }) => {
        const contract = row.original
        return (
          <div>
            <div className="font-medium">{contract.contract_number}</div>
            <EditableContractNameCell row={row} onUpdate={handleFieldUpdate("contract_name")} />
          </div>
        )
      },
    },
    {
      accessorKey: "supplier",
      header: "Supplier",
      cell: ({ row }) => {
        const supplier = row.original.supplier
        return supplier ? (
          <div>
            <div className="font-medium">{supplier.name}</div>
            {supplier.code && <div className="text-sm text-muted-foreground">{supplier.code}</div>}
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        )
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <EditableStatusCell row={row} onUpdate={handleFieldUpdate("status")} />,
    },
    {
      accessorKey: "valid_from",
      header: "Valid Period",
      cell: ({ row }) => {
        const contract = row.original
        return (
          <div className="flex items-center gap-1 text-sm">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            <span>
              {formatDate(contract.valid_from)} - {formatDate(contract.valid_to)}
            </span>
          </div>
        )
      },
    },
    {
      accessorKey: "total_cost",
      header: "Total Cost",
      cell: ({ row }) => <EditableTotalCostCell row={row} onUpdate={handleFieldUpdate("total_cost")} />,
    },
    {
      accessorKey: "commission_rate",
      header: "Commission",
      cell: ({ row }) => <EditableCommissionCell row={row} onUpdate={handleFieldUpdate("commission_rate")} />,
    },
    {
      accessorKey: "event",
      header: "Event",
      cell: ({ row }) => {
        const event = row.original.event
        return event ? (
          <div>
            <div className="font-medium">{event.event_name}</div>
            {event.event_code && <div className="text-sm text-muted-foreground">{event.event_code}</div>}
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        )
      },
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => <RowActions contract={row.original} onDelete={handleDelete} />,
    },
  ]

  const handleBulkDelete = async (selectedRows: Contract[]) => {
    if (!confirm(`Are you sure you want to delete ${selectedRows.length} contract(s)?`)) return
    try {
      await bulkDeleteContracts(selectedRows.map((c) => c.id))
      toast.success(`${selectedRows.length} contract(s) deleted successfully`)
      router.refresh()
    } catch (err) {
      toast.error("Failed to delete contracts", {
        description: err instanceof Error ? err.message : undefined,
      })
    }
  }

  const handleBulkDuplicate = async (selectedRows: Contract[]) => {
    try {
      await bulkDuplicateContracts(selectedRows.map((c) => c.id))
      toast.success(`${selectedRows.length} contract(s) duplicated successfully`)
      router.refresh()
    } catch (err) {
      toast.error("Failed to duplicate contracts", {
        description: err instanceof Error ? err.message : undefined,
      })
    }
  }

  const handleBulkExport = (selectedRows: Contract[]) => {
    // Export is handled by DataTable08 internally, but we can customize if needed
    // For now, just pass through - DataTable08 will handle CSV export
  }

  const handleBulkStatusChange = async (selectedRows: Contract[], isActive: boolean) => {
    try {
      const status = isActive ? "active" : "expired"
      await bulkUpdateContractStatus(selectedRows.map((c) => c.id), status)
      toast.success(`${selectedRows.length} contract(s) ${isActive ? "activated" : "deactivated"} successfully`)
      router.refresh()
    } catch (err) {
      toast.error(`Failed to ${isActive ? "activate" : "deactivate"} contracts`, {
        description: err instanceof Error ? err.message : undefined,
      })
    }
  }

  return (
    <DataTable08
        data={data}
        columns={contractColumns}
        totalCount={totalCount}
        page={page}
        pageSize={pageSize}
        q={globalFilter}
        searchPlaceholder="Search contracts..."
        exportFilename="contracts.csv"
        enableRowSelection={true}
        enableSearch={true}
        enableExport={true}
        enableColumnVisibility={true}
        enableViewToggle={true}
      enablePagination={true}
      onBulkExport={handleBulkExport}
      onBulkDelete={handleBulkDelete}
      onBulkDuplicate={handleBulkDuplicate}
      onBulkStatusChange={handleBulkStatusChange}
      cardViewRenderer={(row) => {
        const contract = row.original as Contract
        return (
          <div className="rounded-lg border bg-card p-3 shadow-xs">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="font-medium">{contract.contract_number}</div>
                {contract.contract_name && <div className="text-sm text-muted-foreground">{contract.contract_name}</div>}
              </div>
              <StatusBadge variant={statusVariantMap[contract.status]}>{contract.status}</StatusBadge>
            </div>
            <div className="space-y-1 text-sm">
              {contract.supplier && (
                <div className="text-muted-foreground">Supplier: {contract.supplier.name}</div>
              )}
              <div className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>
                  {formatDate(contract.valid_from)} - {formatDate(contract.valid_to)}
                </span>
              </div>
              {contract.total_cost && (
                <div className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3 text-muted-foreground" />
                  <span>{formatCurrency(contract.total_cost, contract.currency)}</span>
                </div>
              )}
              {contract.commission_rate && (
                <div className="flex items-center gap-1">
                  <Percent className="h-3 w-3 text-muted-foreground" />
                  <span>{contract.commission_rate}%</span>
                </div>
              )}
              {contract.event && (
                <div className="text-muted-foreground">Event: {contract.event.event_name}</div>
              )}
            </div>
          </div>
        )
      }}
      emptyMessage="No contracts found."
    />
  )
}

