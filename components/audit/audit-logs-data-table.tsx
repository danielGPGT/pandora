"use client"

import { useState, useMemo, useEffect } from "react"
import { type ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/ui/status-badge"
import { DataTable08 } from "@/components/reuseable/data-table/data-table-08"
import { formatDistanceToNow, format } from "date-fns"
import { Plus, Pencil, Trash2, Copy, Power, User, Clock, ExternalLink, Filter, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { type AuditLogEntry } from "./activity-timeline"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { DateRangePicker } from "@/components/protected/DateRangePicker"
import { type DateRange } from "react-day-picker"

const actionIcons: Record<string, React.ReactNode> = {
  create: <Plus className="h-3 w-3" />,
  update: <Pencil className="h-3 w-3" />,
  delete: <Trash2 className="h-3 w-3" />,
  duplicate: <Copy className="h-3 w-3" />,
  bulk_delete: <Trash2 className="h-3 w-3" />,
  bulk_update: <Power className="h-3 w-3" />,
  bulk_duplicate: <Copy className="h-3 w-3" />,
}

const actionColors: Record<string, "success" | "info" | "destructive" | "warning" | "default"> = {
  create: "success",
  update: "info",
  delete: "destructive",
  duplicate: "default",
  bulk_delete: "destructive",
  bulk_update: "warning",
  bulk_duplicate: "default",
}

function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    create: "Created",
    update: "Updated",
    delete: "Deleted",
    duplicate: "Duplicated",
    bulk_delete: "Bulk Deleted",
    bulk_update: "Bulk Updated",
    bulk_duplicate: "Bulk Duplicated",
  }
  return labels[action] || action
}

function getChangedFields(oldValues: Record<string, any> | null, newValues: Record<string, any> | null): string[] {
  if (!oldValues || !newValues) return []
  const fields: string[] = []
  for (const key in newValues) {
    if (oldValues[key] !== newValues[key] && key !== "updated_at") {
      fields.push(key)
    }
  }
  return fields
}

export function AuditLogsDataTable({
  initialData,
  totalCount,
  page = 1,
  pageSize = 50,
  q = "",
  entityType = "",
  action = "",
  changedBy = "",
  startDate = "",
  endDate = "",
}: {
  initialData: AuditLogEntry[]
  totalCount: number
  page?: number
  pageSize?: number
  q?: string
  entityType?: string
  action?: string
  changedBy?: string
  startDate?: string
  endDate?: string
}) {
  const router = useRouter()
  const [filters, setFilters] = useState({
    entityType,
    action,
    changedBy,
    startDate,
    endDate,
  })

  // Sync filters with URL params when they change
  useEffect(() => {
    setFilters({
      entityType,
      action,
      changedBy,
      startDate,
      endDate,
    })
  }, [entityType, action, changedBy, startDate, endDate])

  // Convert date strings to DateRange
  const dateRange: DateRange | undefined = useMemo(() => {
    if (startDate && endDate) {
      // Parse ISO date strings and reset to date-only (remove time component for display)
      const from = new Date(startDate)
      const to = new Date(endDate)
      // Reset time to midnight for clean date comparison in picker
      from.setHours(0, 0, 0, 0)
      to.setHours(0, 0, 0, 0)
      return {
        from,
        to,
      }
    } else if (startDate) {
      const from = new Date(startDate)
      from.setHours(0, 0, 0, 0)
      return {
        from,
        to: undefined,
      }
    }
    return undefined
  }, [startDate, endDate])

  // Check if any filters are active
  const hasActiveFilters = entityType || action || startDate || endDate || changedBy

  const handleDateRangeChange = (range: DateRange | undefined) => {
    // Format dates as ISO strings with time component for proper filtering
    let newStartDate = ""
    let newEndDate = ""
    
    if (range?.from) {
      const start = new Date(range.from)
      start.setHours(0, 0, 0, 0) // Start of day
      newStartDate = start.toISOString()
    }
    
    if (range?.to) {
      const end = new Date(range.to)
      end.setHours(23, 59, 59, 999) // End of day to include the full day
      newEndDate = end.toISOString()
    }
    
    setFilters((prev) => ({ ...prev, startDate: newStartDate, endDate: newEndDate }))
    pushParams({
      start_date: newStartDate,
      end_date: newEndDate,
      page: 1,
    })
  }

  const columns: ColumnDef<AuditLogEntry>[] = [
    {
      accessorKey: "changed_at",
      header: "Timestamp",
      cell: ({ row }) => {
        const timestamp = row.getValue("changed_at") as string
        return (
          <div className="flex items-center gap-1 text-sm">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <div>
              <div className="font-medium">{formatDistanceToNow(new Date(timestamp), { addSuffix: true })}</div>
              <div className="text-xs text-muted-foreground">{format(new Date(timestamp), "MMM dd, yyyy HH:mm")}</div>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "changed_by_user",
      header: "User",
      cell: ({ row }) => {
        const user = row.original.changed_by_user
        const userName = user
          ? `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email || "Unknown User"
          : "System"
        return (
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
              <User className="h-3 w-3" />
            </div>
            <span className="text-sm">{userName}</span>
          </div>
        )
      },
    },
    {
      accessorKey: "action",
      header: "Action",
      cell: ({ row }) => {
        const actionValue = row.getValue("action") as string
        return (
          <StatusBadge variant={actionColors[actionValue] || "default"} className="gap-1">
            {actionIcons[actionValue]}
            {getActionLabel(actionValue)}
          </StatusBadge>
        )
      },
    },
    {
      accessorKey: "entity_type",
      header: "Entity Type",
      cell: ({ row }) => {
        return (
          <Badge variant="outline" className="capitalize">
            {row.getValue("entity_type") as string}
          </Badge>
        )
      },
    },
    {
      id: "entity",
      header: "Entity",
      cell: ({ row }) => {
        const log = row.original
        const entityName = log.new_values?.name || log.old_values?.name || log.new_values?.contract_number || log.old_values?.contract_number || "N/A"
        const entityType = log.entity_type
        const entityId = log.entity_id

        return (
          <div className="flex items-center gap-2">
            <span className="text-sm">{entityName}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => {
                if (entityType === "supplier") {
                  router.push(`/suppliers/${entityId}`)
                } else if (entityType === "contract") {
                  router.push(`/contracts/${entityId}`)
                }
              }}
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        )
      },
    },
    {
      id: "changes",
      header: "Changes",
      cell: ({ row }) => {
        const log = row.original
        const changedFields = getChangedFields(log.old_values, log.new_values)
        
        if (log.action === "create") {
          return <span className="text-sm text-muted-foreground">Created</span>
        }
        if (log.action === "delete") {
          return <span className="text-sm text-muted-foreground">Deleted</span>
        }
        if (changedFields.length === 0) {
          return <span className="text-sm text-muted-foreground">-</span>
        }
        return (
          <div className="text-sm">
            {changedFields.slice(0, 3).map((field) => (
              <Badge key={field} variant="secondary" className="mr-1 text-xs">
                {field.replace(/_/g, " ")}
              </Badge>
            ))}
            {changedFields.length > 3 && (
              <span className="text-xs text-muted-foreground">+{changedFields.length - 3}</span>
            )}
          </div>
        )
      },
    },
  ]

  const pushParams = (newParams: Record<string, string | number>) => {
    const current = new URLSearchParams(window.location.search)
    Object.entries(newParams).forEach(([k, v]) => {
      if (v === "" || v === 0) {
        current.delete(k)
      } else {
        current.set(k, String(v))
      }
    })
    router.push(`?${current.toString()}`)
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-medium text-sm">Filters</h3>
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-2">
                Active
              </Badge>
            )}
          </div>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilters({ entityType: "", action: "", changedBy: "", startDate: "", endDate: "" })
                pushParams({ entity_type: "", action: "", changed_by: "", start_date: "", end_date: "", page: 1 })
              }}
              className="h-8 gap-1.5"
            >
              <X className="h-3.5 w-3.5" />
              Clear all
            </Button>
          )}
        </div>
        <div className="p-4">
          <div className="flex items-center justify-start gap-4">
            <div className="space-y-2">
              <Label htmlFor="entity-type" className="text-xs font-medium">Entity Type</Label>
              <Select
                value={filters.entityType || undefined}
                onValueChange={(value) => {
                  setFilters((prev) => ({ ...prev, entityType: value }))
                  pushParams({ entity_type: value, page: 1 })
                }}
              >
                <SelectTrigger id="entity-type" className="h-9">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="supplier">Supplier</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="action" className="text-xs font-medium">Action</Label>
              <Select
                value={filters.action || undefined}
                onValueChange={(value) => {
                  setFilters((prev) => ({ ...prev, action: value }))
                  pushParams({ action: value, page: 1 })
                }}
              >
                <SelectTrigger id="action" className="h-9">
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="create">Create</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                  <SelectItem value="duplicate">Duplicate</SelectItem>
                  <SelectItem value="bulk_delete">Bulk Delete</SelectItem>
                  <SelectItem value="bulk_update">Bulk Update</SelectItem>
                  <SelectItem value="bulk_duplicate">Bulk Duplicate</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2 lg:col-span-2">
              <DateRangePicker
                label="Date Range"
                placeholder="Select date range"
                value={dateRange}
                onChange={handleDateRangeChange}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <DataTable08
        data={initialData}
        columns={columns}
        totalCount={totalCount}
        page={page}
        pageSize={pageSize}
        q={q}
        searchPlaceholder="Search audit logs..."
        exportFilename="audit-logs.csv"
        enableRowSelection={false}
        enableSearch={true}
        enableExport={true}
        enableColumnVisibility={true}
        enableViewToggle={false}
        enablePagination={true}
        storageKey="audit-logs-table"
        emptyMessage="No audit logs found."
      />
    </div>
  )
}

