"use client"

import * as React from "react"
import { type ColumnDef, flexRender, getCoreRowModel, getFilteredRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, Download } from "lucide-react"

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

const columns: ColumnDef<Supplier>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "code", header: "Code" },
  { accessorKey: "supplier_type", header: "Type", cell: ({ row }) => row.getValue("supplier_type") ?? "-" },
  { accessorKey: "email", header: "Email", cell: ({ row }) => row.getValue("email") ?? "-" },
  { accessorKey: "phone", header: "Phone", cell: ({ row }) => row.getValue("phone") ?? "-" },
  { accessorKey: "country", header: "Country", cell: ({ row }) => row.getValue("country") ?? "-" },
  { accessorKey: "is_active", header: "Status", cell: ({ row }) => (row.getValue("is_active") ? <Badge>Active</Badge> : <Badge variant="secondary">Inactive</Badge>) },
]

export function SuppliersTable({ data }: { data: Supplier[] }) {
  const [globalFilter, setGlobalFilter] = React.useState("")

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
          <Input
            placeholder="Search suppliers..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-8"
            aria-label="Search suppliers"
          />
        </div>
        <Button variant="outline" className="gap-2" onClick={() => exportToCsv(table.getFilteredRowModel().rows.map((r) => r.original))}>
          <Download className="h-4 w-4" /> Export
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => (
                  <TableHead key={h.id}>{h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}</TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No suppliers found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}


