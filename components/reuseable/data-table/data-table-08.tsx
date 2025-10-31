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
import { Separator } from "@/components/ui/separator"
import { Columns3, Download, Search, Rows, ListFilter, GripVertical, Trash2, Copy, X, Power } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

type ViewMode = "table" | "cards"

export interface DataTable08Props<TData> {
  data: TData[]
  columns: ColumnDef<TData>[]
  totalCount?: number
  page?: number
  pageSize?: number
  q?: string
  searchPlaceholder?: string
  exportFilename?: string
  onDataChange?: (data: TData[]) => void
  enableRowSelection?: boolean
  enableSearch?: boolean
  enableExport?: boolean
  enableColumnVisibility?: boolean
  enableViewToggle?: boolean
  enablePagination?: boolean
  cardViewRenderer?: (row: any) => React.ReactNode
  emptyMessage?: string
  onBulkExport?: (selectedRows: TData[]) => void
  onBulkDelete?: (selectedRows: TData[]) => Promise<void>
  onBulkStatusChange?: (selectedRows: TData[], status: boolean) => Promise<void>
  onBulkDuplicate?: (selectedRows: TData[]) => Promise<void>
}

function exportToCsv<T>(rows: T[], filename = "data.csv") {
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

const DraggableTableHeader = ({ header }: { header: any }) => {
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({ id: header.column.id })
  const style: CSSProperties = {
    opacity: isDragging ? 0.8 : 1,
    position: "relative",
    transform: CSS.Translate.toString(transform),
    transition,
    whiteSpace: "nowrap",
    width: header.column.getSize(),
    zIndex: isDragging ? 1 : 0,
  }
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

export function DataTable08<TData extends Record<string, any>>({
  data: initialData,
  columns,
  totalCount = initialData.length,
  page = 1,
  pageSize = 25,
  q = "",
  searchPlaceholder = "Search...",
  exportFilename = "data.csv",
  onDataChange,
  enableRowSelection = true,
  enableSearch = true,
  enableExport = true,
  enableColumnVisibility = true,
  enableViewToggle = true,
  enablePagination = true,
  cardViewRenderer,
  emptyMessage = "No results found.",
  onBulkExport,
  onBulkDelete,
  onBulkStatusChange,
  onBulkDuplicate,
}: DataTable08Props<TData>) {
  const [data, setData] = useState<TData[]>(initialData)
  const [globalFilter, setGlobalFilter] = useState(q)

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

  // Notify parent of data changes
  useEffect(() => {
    if (onDataChange) {
      onDataChange(data)
    }
  }, [data, onDataChange])

  const [columnOrder, setColumnOrder] = useState<string[]>(
    columns
      .filter((c) => (c as any).id !== "actions")
      .map((c) => {
        const anyCol = c as any
        return String(anyCol.id ?? anyCol.accessorKey ?? "")
      })
      .filter(Boolean)
  )
  const [view, setView] = useState<ViewMode>("table")
  const dndId = useId()
  const router = useRouter()
  const searchParams = useSearchParams()

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter, columnOrder },
    onGlobalFilterChange: setGlobalFilter,
    onColumnOrderChange: setColumnOrder,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableRowSelection,
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
    if (!enableSearch || !enablePagination) return
    const t = setTimeout(() => {
      pushParams({ q: globalFilter, page: 1, pageSize })
    }, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalFilter, enableSearch, enablePagination])

  const actionsColumn = columns.find((c) => (c as any).id === "actions")
  const selectedRows = table.getFilteredSelectedRowModel().rows
  const selectedCount = selectedRows.length
  const [isProcessing, setIsProcessing] = useState(false)

  const handleBulkExport = () => {
    if (onBulkExport) {
      onBulkExport(selectedRows.map((r) => r.original))
    } else {
      exportToCsv(selectedRows.map((r) => r.original), exportFilename)
    }
    table.resetRowSelection()
  }

  const handleBulkDelete = async () => {
    if (!onBulkDelete) return
    if (!confirm(`Are you sure you want to delete ${selectedCount} item(s)?`)) return
    setIsProcessing(true)
    try {
      await onBulkDelete(selectedRows.map((r) => r.original))
      table.resetRowSelection()
    } catch (err) {
      console.error("Bulk delete error:", err)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBulkStatusChange = async (status: boolean) => {
    if (!onBulkStatusChange) return
    setIsProcessing(true)
    try {
      await onBulkStatusChange(selectedRows.map((r) => r.original), status)
      table.resetRowSelection()
    } catch (err) {
      console.error("Bulk status change error:", err)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBulkDuplicate = async () => {
    if (!onBulkDuplicate) return
    setIsProcessing(true)
    try {
      await onBulkDuplicate(selectedRows.map((r) => r.original))
      table.resetRowSelection()
    } catch (err) {
      console.error("Bulk duplicate error:", err)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="w-full">
      {/* Bulk Actions Bar */}
      {enableRowSelection && selectedCount > 0 && (
        <div className="mb-3 flex items-center justify-between rounded-lg border bg-muted/50 p-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{selectedCount} selected</Badge>
            <Button variant="ghost" size="sm" onClick={() => table.resetRowSelection()} className="h-8">
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {(onBulkExport || enableExport) && (
              <Button variant="outline" size="sm" onClick={handleBulkExport} className="h-8" disabled={isProcessing}>
                <Download className="h-4 w-4 mr-1" />
                Export Selected
              </Button>
            )}
            {onBulkDuplicate && (
              <Button variant="outline" size="sm" onClick={handleBulkDuplicate} className="h-8" disabled={isProcessing}>
                <Copy className="h-4 w-4 mr-1" />
                Duplicate
              </Button>
            )}
            {onBulkStatusChange && (
              <>
                <Button variant="outline" size="sm" onClick={() => handleBulkStatusChange(true)} className="h-8" disabled={isProcessing}>
                  <Power className="h-4 w-4 mr-1" />
                  Activate
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleBulkStatusChange(false)} className="h-8" disabled={isProcessing}>
                  <Power className="h-4 w-4 mr-1" />
                  Deactivate
                </Button>
              </>
            )}
            {onBulkDelete && (
              <Button variant="destructive" size="sm" onClick={handleBulkDelete} className="h-8" disabled={isProcessing}>
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {enableSearch && (
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
              <Input
                aria-label="Search"
                placeholder={searchPlaceholder}
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-8"
              />
            </div>
          )}

          {enableColumnVisibility && (
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
          )}

          {enableExport && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => exportToCsv(table.getFilteredRowModel().rows.map((r) => r.original), exportFilename)}
              aria-label="Export CSV"
            >
              <Download className="h-4 w-4" /> Export
            </Button>
          )}

          {enableViewToggle && <Separator orientation="vertical" className="hidden sm:block h-6" />}

          {enableViewToggle && cardViewRenderer && (
            <div className="hidden sm:flex items-center gap-1" role="group" aria-label="View switcher">
              <Button
                type="button"
                variant={view === "table" ? "default" : "outline"}
                size="sm"
                className="gap-2"
                aria-pressed={view === "table"}
                onClick={() => setView("table")}
              >
                <Rows className="h-4 w-4" /> Table
              </Button>
              <Button
                type="button"
                variant={view === "cards" ? "default" : "outline"}
                size="sm"
                className="gap-2"
                aria-pressed={view === "cards"}
                onClick={() => setView("cards")}
              >
                <ListFilter className="h-4 w-4" /> Cards
              </Button>
            </div>
          )}
        </div>

        {enablePagination && (
          <div className="text-sm text-muted-foreground">
            <Badge variant="outline">{totalCount} results</Badge>
          </div>
        )}
      </div>

      {/* Table View */}
      {view === "table" || !cardViewRenderer ? (
        <div className="rounded-md border overflow-hidden bg-background/50 backdrop-blur-xl">
          <DndContext id={dndId} collisionDetection={closestCenter} modifiers={[restrictToHorizontalAxis]} onDragEnd={handleDragEnd} sensors={sensors}>
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id} className="bg-muted/50 [&>th]:border-t-0">
                    {enableRowSelection && (
                      <TableHead className="w-8">
                        <Checkbox
                          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
                          onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
                          aria-label="Select all"
                        />
                      </TableHead>
                    )}
                    <SortableContext items={columnOrder} strategy={horizontalListSortingStrategy}>
                      {hg.headers
                        .filter((h) => (h as any).column.id !== "actions")
                        .map((h) => (
                          <DraggableTableHeader key={h.id} header={h as any} />
                        ))}
                    </SortableContext>
                    {actionsColumn &&
                      hg.headers
                        .filter((h) => (h as any).column.id === "actions")
                        .map((h) => (
                          <TableHead key={h.id} className="w-10 text-right">
                            {flexRender(h.column.columnDef.header, h.getContext())}
                          </TableHead>
                        ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} data-state={row.getIsSelected() && "selected"} className="hover:bg-muted/40">
                      {enableRowSelection && (
                        <TableCell className="w-8">
                          <Checkbox checked={row.getIsSelected()} onCheckedChange={(v) => row.toggleSelected(!!v)} aria-label={`Select row ${row.id}`} />
                        </TableCell>
                      )}
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length + (enableRowSelection ? 1 : 0)} className="h-24 text-center">
                      {emptyMessage}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </DndContext>
        </div>
      ) : (
        /* Card View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => <div key={row.id}>{cardViewRenderer(row)}</div>)
          ) : (
            <div className="col-span-full text-center py-8 text-sm text-muted-foreground">{emptyMessage}</div>
          )}
        </div>
      )}

      {/* Pagination */}
      {enablePagination && totalPages > 1 && (
        <div className="mt-4 flex items-center gap-3 text-sm">
          <div className="hidden sm:flex items-center text-muted-foreground w-full gap-3">
            Showing {Math.min((page - 1) * pageSize + 1, totalCount)}–{Math.min(page * pageSize, totalCount)} of {totalCount}
            <div className="flex items-center gap-2">
              <span className="hidden md:inline">Rows per page</span>
              <Select value={String(pageSize)} onValueChange={(val) => pushParams({ page: 1, pageSize: Number(val), q: globalFilter })}>
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
                    <PaginationLink isActive={p === page} onClick={() => pushParams({ page: p, pageSize, q: globalFilter })}>
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
