"use client"

import { useEffect, useId, useState, type CSSProperties } from "react"
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers"
import { arrayMove, horizontalListSortingStrategy, SortableContext, useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { type ColumnDef, flexRender, getCoreRowModel, getFilteredRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/ui/status-badge"
import { Separator } from "@/components/ui/separator"
import { Columns3, Download, Search, Rows, ListFilter, GripVertical, MoreVertical, Pencil, ToggleLeft, ToggleRight, Trash2, Eye, Loader2, Copy, X, Power } from "lucide-react"
import { DropdownMenu as DM, DropdownMenuTrigger as DMT, DropdownMenuContent as DMC, DropdownMenuItem as DMI, DropdownMenuSeparator as DMS } from "@/components/ui/dropdown-menu"
import { useRouter, useSearchParams } from "next/navigation"
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { updateSupplier, duplicateSupplier, bulkDeleteSuppliers, bulkUpdateSupplierStatus, bulkDuplicateSuppliers } from "@/lib/actions/suppliers"
import { toast } from "sonner"
import { EditSupplierDialog } from "@/components/suppliers/edit-supplier-dialog"
import { DeleteSupplierDialog } from "@/components/suppliers/delete-supplier-dialog"

export type Supplier = {
  id: string
  organization_id: string
  name: string
  code: string
  supplier_type: string | null
  email: string | null
  phone: string | null
  country: string | null
  is_active: boolean | null
  created_at: string
}

function exportToCsv<T>(rows: T[], filename = "suppliers.csv") {
  if (!rows?.length) return
  const headers = Object.keys(rows[0] as object)
  const escape = (val: unknown) => {
    if (val == null) return ""
    const s = String(val)
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => escape((r as any)[h])).join(","))].join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

// Inline editable cells
function EditableNameCell({ row, onUpdate }: { row: any; onUpdate: (id: string, value: string) => Promise<void> }) {
  const [isEditing, setIsEditing] = useState(false)
  const currentValue = row.getValue("name") as string
  const [value, setValue] = useState(currentValue)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setValue(currentValue)
  }, [currentValue])

  const handleSave = async () => {
    if (value === row.getValue("name")) {
      setIsEditing(false)
      return
    }
    setIsSaving(true)
    try {
      await onUpdate(row.original.id, value)
      toast.success("Name updated")
      setIsEditing(false)
    } catch (err) {
      toast.error("Failed to update", { description: err instanceof Error ? err.message : undefined })
      setValue(row.getValue("name"))
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
            setValue(row.getValue("name"))
            setIsEditing(false)
          }
        }}
        autoFocus
        disabled={isSaving}
        className="h-8"
      />
    )
  }

  return (
    <div onClick={() => setIsEditing(true)} className="cursor-pointer hover:bg-muted/50 rounded px-2 py-1 -mx-2 -my-1 min-h-[2rem] flex items-center">
      {value || "-"}
    </div>
  )
}

function EditableEmailCell({ row, onUpdate }: { row: any; onUpdate: (id: string, value: string | null) => Promise<void> }) {
  const [isEditing, setIsEditing] = useState(false)
  const currentValue = (row.getValue("email") ?? "") as string
  const [value, setValue] = useState(currentValue)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setValue(currentValue)
  }, [currentValue])

  const handleSave = async () => {
    if (value === (row.getValue("email") ?? "")) {
      setIsEditing(false)
      return
    }
    setIsSaving(true)
    try {
      await onUpdate(row.original.id, value || null)
      toast.success("Email updated")
      setIsEditing(false)
    } catch (err) {
      toast.error("Failed to update", { description: err instanceof Error ? err.message : undefined })
      setValue(row.getValue("email") ?? "")
    } finally {
      setIsSaving(false)
    }
  }

  if (isEditing) {
    return (
      <Input
        type="email"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave()
          if (e.key === "Escape") {
            setValue(row.getValue("email") ?? "")
            setIsEditing(false)
          }
        }}
        autoFocus
        disabled={isSaving}
        className="h-8"
        placeholder="email@example.com"
      />
    )
  }

  const displayValue = row.getValue("email") ?? "-"
  return (
    <div onClick={() => setIsEditing(true)} className="cursor-pointer hover:bg-muted/50 rounded px-2 py-1 -mx-2 -my-1 min-h-[2rem] flex items-center">
      {displayValue}
    </div>
  )
}

function EditablePhoneCell({ row, onUpdate }: { row: any; onUpdate: (id: string, value: string | null) => Promise<void> }) {
  const [isEditing, setIsEditing] = useState(false)
  const currentValue = (row.getValue("phone") ?? "") as string
  const [value, setValue] = useState(currentValue)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setValue(currentValue)
  }, [currentValue])

  const handleSave = async () => {
    if (value === (row.getValue("phone") ?? "")) {
      setIsEditing(false)
      return
    }
    setIsSaving(true)
    try {
      await onUpdate(row.original.id, value || null)
      toast.success("Phone updated")
      setIsEditing(false)
    } catch (err) {
      toast.error("Failed to update", { description: err instanceof Error ? err.message : undefined })
      setValue(row.getValue("phone") ?? "")
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
            setValue(row.getValue("phone") ?? "")
            setIsEditing(false)
          }
        }}
        autoFocus
        disabled={isSaving}
        className="h-8"
        placeholder="+1 (555) 123-4567"
      />
    )
  }

  const displayValue = row.getValue("phone") ?? "-"
  return (
    <div onClick={() => setIsEditing(true)} className="cursor-pointer hover:bg-muted/50 rounded px-2 py-1 -mx-2 -my-1 min-h-[2rem] flex items-center">
      {displayValue}
    </div>
  )
}

function EditableStatusCell({ row, onUpdate }: { row: any; onUpdate: (id: string, value: boolean) => Promise<void> }) {
  const [isSaving, setIsSaving] = useState(false)
  const isActive = row.getValue("is_active") ?? false

  const handleToggle = async (checked: boolean) => {
    if (checked === isActive) return
    setIsSaving(true)
    try {
      await onUpdate(row.original.id, checked)
      toast.success(`Supplier ${checked ? "activated" : "deactivated"}`)
    } catch (err) {
      toast.error("Failed to update", { description: err instanceof Error ? err.message : undefined })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      <Switch checked={isActive} onCheckedChange={handleToggle} disabled={isSaving} />
      <StatusBadge variant={isActive ? "success" : "warning"}>{isActive ? "Active" : "Inactive"}</StatusBadge>
    </div>
  )
}

const supplierColumns = (onFieldUpdate: (field: string) => (id: string, value: any) => Promise<void>): ColumnDef<Supplier>[] => [
  { accessorKey: "name", header: "Name", cell: ({ row }) => <EditableNameCell row={row} onUpdate={onFieldUpdate("name")} /> },
  { accessorKey: "code", header: "Code" },
  { accessorKey: "supplier_type", header: "Type", cell: ({ row }) => row.getValue("supplier_type") ?? "-" },
  { accessorKey: "email", header: "Email", cell: ({ row }) => <EditableEmailCell row={row} onUpdate={onFieldUpdate("email")} /> },
  { accessorKey: "phone", header: "Phone", cell: ({ row }) => <EditablePhoneCell row={row} onUpdate={onFieldUpdate("phone")} /> },
  { accessorKey: "country", header: "Country", cell: ({ row }) => row.getValue("country") ?? "-" },
  { accessorKey: "is_active", header: "Status", cell: ({ row }) => <EditableStatusCell row={row} onUpdate={onFieldUpdate("is_active")} /> },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    enableSorting: false,
    enableHiding: false,
    cell: ({ row }) => <RowActions supplier={row.original as Supplier} />,
  },
]

type ViewMode = "table" | "cards"

// LocalStorage utilities for column state persistence
const STORAGE_KEY = "suppliers-table"

function getStoredColumnOrder(): string[] | null {
  if (typeof window === "undefined") return null
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY}:columnOrder`)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

function saveColumnOrder(order: string[]) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(`${STORAGE_KEY}:columnOrder`, JSON.stringify(order))
  } catch (err) {
    console.warn("Failed to save column order:", err)
  }
}

function getStoredColumnVisibility(): Record<string, boolean> | null {
  if (typeof window === "undefined") return null
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY}:columnVisibility`)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

function saveColumnVisibility(visibility: Record<string, boolean>) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(`${STORAGE_KEY}:columnVisibility`, JSON.stringify(visibility))
  } catch (err) {
    console.warn("Failed to save column visibility:", err)
  }
}

function getStoredViewMode(): ViewMode | null {
  if (typeof window === "undefined") return null
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY}:viewMode`)
    return (stored as ViewMode) || null
  } catch {
    return null
  }
}

function saveViewMode(mode: ViewMode) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(`${STORAGE_KEY}:viewMode`, mode)
  } catch (err) {
    console.warn("Failed to save view mode:", err)
  }
}

export function SuppliersDataTable08({ initialData, totalCount, page, pageSize, q }: { initialData: Supplier[]; totalCount: number; page: number; pageSize: number; q: string }) {
  const [data, setData] = useState<Supplier[]>(initialData)
  const [globalFilter, setGlobalFilter] = useState(q ?? "")

  // Sync data when initialData prop changes (e.g., after CRUD operations)
  useEffect(() => {
    setData(initialData)
  }, [initialData])

  // Sync globalFilter with q prop when it changes externally
  useEffect(() => {
    if (q !== globalFilter) {
      setGlobalFilter(q)
    }
  }, [q])

  // Update handler for inline edits
  const handleFieldUpdate = (field: string) => async (id: string, value: any) => {
    await updateSupplier(id, { [field]: value })
    // Optimistically update local data
    setData((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)))
    router.refresh()
  }

  const columns = supplierColumns(handleFieldUpdate)
  
  // Initialize column order from localStorage or defaults
  const defaultColumnOrder = columns
    .filter((c) => (c as any).id !== "actions")
    .map((c) => {
      const anyCol = c as any
      return String(anyCol.id ?? anyCol.accessorKey)
    })

  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    const stored = getStoredColumnOrder()
    if (stored && stored.length > 0) {
      // Validate stored order against current columns
      const validOrder = stored.filter((id) => defaultColumnOrder.includes(id))
      const missing = defaultColumnOrder.filter((id) => !stored.includes(id))
      return [...validOrder, ...missing]
    }
    return defaultColumnOrder
  })

  // Initialize column visibility from localStorage
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
    return getStoredColumnVisibility() || {}
  })

  // Initialize view mode from localStorage
  const [view, setView] = useState<ViewMode>(() => {
    return getStoredViewMode() || "table"
  })

  const dndId = useId()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Save column order to localStorage when it changes
  useEffect(() => {
    if (columnOrder.length > 0) {
      saveColumnOrder(columnOrder)
    }
  }, [columnOrder])

  // Save column visibility to localStorage when it changes
  useEffect(() => {
    saveColumnVisibility(columnVisibility)
  }, [columnVisibility])

  // Save view mode to localStorage when it changes
  useEffect(() => {
    saveViewMode(view)
  }, [view])

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter, columnOrder, columnVisibility },
    onGlobalFilterChange: setGlobalFilter,
    onColumnOrderChange: setColumnOrder,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableRowSelection: true,
  })

  const sensors = useSensors(useSensor(MouseSensor, {}), useSensor(TouchSensor, {}), useSensor(KeyboardSensor, {}))

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (active && over && active.id !== over.id) {
      setColumnOrder((order) => {
        const oldIndex = order.indexOf(active.id as string)
        const newIndex = order.indexOf(over.id as string)
        return arrayMove(order, oldIndex, newIndex)
      })
    }
  }

  // URL helpers
  function pushParams(next: Record<string, string | number>) {
    const sp = new URLSearchParams(searchParams?.toString())
    Object.entries(next).forEach(([k, v]) => sp.set(k, String(v)))
    router.push(`?${sp.toString()}`)
  }

  const totalPages = Math.max(1, Math.ceil((totalCount || 0) / pageSize))

  // debounce search to URL
  useEffect(() => {
    const t = setTimeout(() => {
      pushParams({ q: globalFilter, page: 1, pageSize })
    }, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalFilter])

  // Bulk actions
  const selectedRows = table.getFilteredSelectedRowModel().rows
  const selectedCount = selectedRows.length
  const [isProcessing, setIsProcessing] = useState(false)

  const handleBulkExport = () => {
    exportToCsv(selectedRows.map((r) => r.original), "suppliers.csv")
    table.resetRowSelection()
  }

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedCount} supplier(s)?`)) return
    setIsProcessing(true)
    try {
      await bulkDeleteSuppliers(selectedRows.map((r) => r.original.id))
      toast.success(`${selectedCount} supplier(s) deleted successfully`)
      table.resetRowSelection()
      router.refresh()
    } catch (err) {
      toast.error("Failed to delete suppliers", {
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBulkStatusChange = async (isActive: boolean) => {
    setIsProcessing(true)
    try {
      await bulkUpdateSupplierStatus(selectedRows.map((r) => r.original.id), isActive)
      toast.success(`${selectedCount} supplier(s) ${isActive ? "activated" : "deactivated"} successfully`)
      table.resetRowSelection()
      router.refresh()
    } catch (err) {
      toast.error("Failed to update suppliers", {
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBulkDuplicate = async () => {
    setIsProcessing(true)
    try {
      await bulkDuplicateSuppliers(selectedRows.map((r) => r.original.id))
      toast.success(`${selectedCount} supplier(s) duplicated successfully`)
      table.resetRowSelection()
      router.refresh()
    } catch (err) {
      toast.error("Failed to duplicate suppliers", {
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="w-full">
      {/* Bulk Actions Bar */}
      {selectedCount > 0 && (
        <div className="mb-3 flex items-center justify-between rounded-lg border bg-muted/50 p-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{selectedCount} selected</Badge>
            <Button variant="ghost" size="sm" onClick={() => table.resetRowSelection()} className="h-8">
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleBulkExport} className="h-8" disabled={isProcessing}>
              <Download className="h-4 w-4 mr-1" />
              Export Selected
            </Button>
            <Button variant="outline" size="sm" onClick={handleBulkDuplicate} className="h-8" disabled={isProcessing}>
              <Copy className="h-4 w-4 mr-1" />
              Duplicate
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleBulkStatusChange(true)} className="h-8" disabled={isProcessing}>
              <Power className="h-4 w-4 mr-1" />
              Activate
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleBulkStatusChange(false)} className="h-8" disabled={isProcessing}>
              <Power className="h-4 w-4 mr-1" />
              Deactivate
            </Button>
            <Button variant="destructive" size="sm" onClick={handleBulkDelete} className="h-8" disabled={isProcessing}>
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64 ">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
             <Input
              aria-label="Search"
              placeholder="Search suppliers..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
               className="pl-8"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2" aria-label="Columns">
                <Columns3 className="h-4 w-4" /> Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {table.getAllLeafColumns().map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  className="capitalize"
                  checked={column.getIsVisible()}
                  onCheckedChange={(v) => column.toggleVisibility(!!v)}
                >
                  {column.id}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            className="gap-2"
            onClick={() => exportToCsv(table.getFilteredRowModel().rows.map((r) => r.original))}
            aria-label="Export CSV"
          >
            <Download className="h-4 w-4" /> Export
          </Button>

          <Separator orientation="vertical" className="hidden sm:block h-6" />

          <div className="hidden sm:flex items-center gap-1" role="group" aria-label="View switcher">
            <Button type="button" variant={view === "table" ? "default" : "outline"} size="sm" className="gap-2" aria-pressed={view === "table"} onClick={() => setView("table")}>
              <Rows className="h-4 w-4" /> Table
            </Button>
            <Button type="button" variant={view === "cards" ? "default" : "outline"} size="sm" className="gap-2" aria-pressed={view === "cards"} onClick={() => setView("cards")}>
              <ListFilter className="h-4 w-4" /> Cards
            </Button>
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          <Badge variant="outline">{totalCount} results</Badge>
        </div>
      </div>

      {view === "table" ? (
        <div className="rounded-md border overflow-hidden bg-background/50 backdrop-blur-xl">
          <DndContext id={dndId} collisionDetection={closestCenter} modifiers={[restrictToHorizontalAxis]} onDragEnd={handleDragEnd} sensors={sensors}>
            <Table className="bg-card/80 backdrop-blur-xl">
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id} className="bg-muted/50 [&>th]:border-t-0">
                    <TableHead className="w-8">
                      <Checkbox checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")} onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)} aria-label="Select all" />
                    </TableHead>
                    <SortableContext items={columnOrder} strategy={horizontalListSortingStrategy}>
                      {hg.headers
                        .filter((h) => (h as any).column.id !== "actions")
                        .map((h) => (
                          <DraggableTableHeader key={h.id} header={h as any} />
                        ))}
                    </SortableContext>
                    {hg.headers
                      .filter((h) => (h as any).column.id === "actions")
                      .map((h) => (
                        <TableHead key={h.id} className="w-10 text-right">{flexRender(h.column.columnDef.header, h.getContext())}</TableHead>
                      ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} data-state={row.getIsSelected() && "selected"} className="hover:bg-muted/40">
                      <TableCell className="w-8">
                        <Checkbox checked={row.getIsSelected()} onCheckedChange={(v) => row.toggleSelected(!!v)} aria-label={`Select row ${row.id}`} />
                      </TableCell>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={supplierColumns.length} className="h-24 text-center">No suppliers found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </DndContext>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <div key={row.id} className="rounded-lg border bg-card p-3 shadow-xs">
                <div className="font-medium">{String(row.getValue("name"))}</div>
                <div className="text-sm text-muted-foreground">{String(row.getValue("code"))} • {String(row.getValue("supplier_type") ?? "-")}</div>
                <div className="mt-2 text-sm">{String(row.getValue("email") ?? "-")} • {String(row.getValue("phone") ?? "-")}</div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-8 text-sm text-muted-foreground">No suppliers found.</div>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center gap-3 text-sm">
          <div className="hidden sm:flex items-center text-muted-foreground w-full gap-3">
            Showing {Math.min((page - 1) * pageSize + 1, totalCount)}–
            {Math.min(page * pageSize, totalCount)} of {totalCount}
            <div className="flex items-center gap-2">
              <span className="hidden md:inline">Rows per page</span>
              <Select
                value={String(pageSize)}
                onValueChange={(val) => pushParams({ page: 1, pageSize: Number(val), q: globalFilter })}
              >
                <SelectTrigger className="h-8 w-[72px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Pagination className="!justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationLink
                  onClick={page > 1 ? () => pushParams({ page: 1, pageSize, q: globalFilter }) : undefined}
                  aria-disabled={page <= 1}
                  className={cn(page <= 1 && "pointer-events-none opacity-50")}
                >
                  First
                </PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => pushParams({ page: Math.max(1, page - 1), pageSize, q: globalFilter })}
                  aria-disabled={page <= 1}
                  className={cn(page <= 1 && "pointer-events-none opacity-50")}
                />
              </PaginationItem>
              {buildPageWindow(page, totalPages).map((p, idx) => (
                <PaginationItem key={idx}>
                  {typeof p === "number" ? (
                    <PaginationLink
                      isActive={p === page}
                      onClick={() => pushParams({ page: p, pageSize, q: globalFilter })}
                    >
                      {p}
                    </PaginationLink>
                  ) : (
                    <PaginationEllipsis />
                  )}
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  onClick={() => pushParams({ page: Math.min(totalPages, page + 1), pageSize, q: globalFilter })}
                  aria-disabled={page >= totalPages}
                  className={cn(page >= totalPages && "pointer-events-none opacity-50")}
                />
              </PaginationItem>
              <PaginationItem>
                <PaginationLink
                  onClick={page < totalPages ? () => pushParams({ page: totalPages, pageSize, q: globalFilter }) : undefined}
                  aria-disabled={page >= totalPages}
                  className={cn(page >= totalPages && "pointer-events-none opacity-50")}
                >
                  Last
                </PaginationLink>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  )
}

const DraggableTableHeader = ({ header }: { header: any }) => {
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({ id: header.column.id })
  const style: CSSProperties = { opacity: isDragging ? 0.8 : 1, position: "relative", transform: CSS.Translate.toString(transform), transition, whiteSpace: "nowrap", width: header.column.getSize(), zIndex: isDragging ? 1 : 0 }
  return (
    <TableHead ref={setNodeRef} className="before:bg-border relative h-10 before:absolute before:inset-y-0 before:left-0 before:w-px first:before:bg-transparent" style={style}>
      <div className="flex items-center justify-start gap-0.5">
        <Button size="icon" variant="ghost" className="-ml-2 size-7 shadow-none" {...attributes} {...listeners} aria-label="Drag to reorder">
          <GripVertical className="opacity-60" size={16} aria-hidden="true" />
        </Button>
        <span className="grow truncate">{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</span>
      </div>
    </TableHead>
  )
}

function RowActions({ supplier }: { supplier: Supplier }) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isDuplicating, setIsDuplicating] = useState(false)

  const handleDuplicate = async () => {
    setIsDuplicating(true)
    try {
      await duplicateSupplier(supplier.id)
      toast.success("Supplier duplicated successfully")
      router.refresh()
    } catch (err) {
      toast.error("Failed to duplicate supplier", {
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setIsDuplicating(false)
    }
  }

  return (
    <>
      <DM>
        <DMT asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 data-[state=open]:bg-muted">
            <MoreVertical className="h-4 w-4" aria-hidden />
            <span className="sr-only">Open actions</span>
          </Button>
        </DMT>
        <DMC align="end" className="w-44">
          <DMI className="gap-2" onClick={() => router.push(`/suppliers/${supplier.id}`)}>
            <Eye className="h-4 w-4" /> View Details
          </DMI>
          <DMS />
          <DMI className="gap-2" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" /> Edit
          </DMI>
          <DMI className="gap-2" onClick={handleDuplicate} disabled={isDuplicating}>
            {isDuplicating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />} Duplicate
          </DMI>
          <DMS />
          <DMI className="gap-2 text-destructive focus:text-destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4" /> Delete
          </DMI>
        </DMC>
      </DM>
      <EditSupplierDialog open={editOpen} onOpenChange={setEditOpen} supplier={supplier} />
      <DeleteSupplierDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        supplier={supplier}
        onDeleted={() => {
          router.refresh()
        }}
      />
    </>
  )
}

function buildPageWindow(current: number, total: number): (number | string)[] {
  const window: (number | string)[] = []
  const add = (n: number | string) => window.push(n)
  const range = (s: number, e: number) => {
    for (let i = s; i <= e; i++) add(i)
  }
  if (total <= 7) {
    range(1, total)
  } else {
    const left = Math.max(2, current - 1)
    const right = Math.min(total - 1, current + 1)
    add(1)
    if (left > 2) add("...")
    range(left, right)
    if (right < total - 1) add("...")
    add(total)
  }
  return window
}


