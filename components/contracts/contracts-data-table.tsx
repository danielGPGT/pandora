"use client"

import { type ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreVertical, Pencil, Trash2, Eye, Calendar, DollarSign, Percent } from "lucide-react"
import { format } from "date-fns"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { deleteContract } from "@/lib/actions/contracts"
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

function RowActions({ contract, onDelete }: { contract: Contract; onDelete: (id: string) => void }) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this contract?")) return
    setIsDeleting(true)
    try {
      await deleteContract(contract.id)
      toast.success("Contract deleted")
      onDelete(contract.id)
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

export function ContractsDataTable({
  contracts,
  onDelete,
  totalCount,
  page = 1,
  pageSize = 25,
  q = "",
  enablePagination = false,
}: {
  contracts: Contract[]
  onDelete?: (id: string) => void
  totalCount?: number
  page?: number
  pageSize?: number
  q?: string
  enablePagination?: boolean
}) {
  const contractColumns: ColumnDef<Contract>[] = [
    {
      accessorKey: "contract_number",
      header: "Contract Number",
      cell: ({ row }) => {
        const contract = row.original
        return (
          <div>
            <div className="font-medium">{contract.contract_number}</div>
            {contract.contract_name && <div className="text-sm text-muted-foreground">{contract.contract_name}</div>}
          </div>
        )
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as Contract["status"]
        return <StatusBadge variant={statusVariantMap[status]}>{status}</StatusBadge>
      },
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
      cell: ({ row }) => {
        const contract = row.original
        return (
          <div className="flex items-center gap-1">
            <DollarSign className="h-3 w-3 text-muted-foreground" />
            <span>{formatCurrency(contract.total_cost, contract.currency)}</span>
          </div>
        )
      },
    },
    {
      accessorKey: "commission_rate",
      header: "Commission",
      cell: ({ row }) => {
        const rate = row.getValue("commission_rate") as number | null
        return rate ? (
          <div className="flex items-center gap-1">
            <Percent className="h-3 w-3 text-muted-foreground" />
            <span>{rate}%</span>
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        )
      },
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
      cell: ({ row }) => <RowActions contract={row.original} onDelete={onDelete || (() => {})} />,
    },
  ]

  return (
    <DataTable08
      data={contracts}
      columns={contractColumns}
      totalCount={totalCount ?? contracts.length}
      page={page}
      pageSize={pageSize}
      q={q}
      searchPlaceholder="Search contracts..."
      exportFilename="contracts.csv"
      enableRowSelection={false}
      enableSearch={true}
      enableExport={true}
      enableColumnVisibility={true}
      enableViewToggle={true}
      enablePagination={enablePagination && totalCount !== undefined}
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
                <div className="text-muted-foreground">
                  Event: {contract.event.event_name}
                </div>
              )}
            </div>
          </div>
        )
      }}
      emptyMessage="No contracts found."
    />
  )
}
