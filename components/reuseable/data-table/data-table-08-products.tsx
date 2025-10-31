"use client"

import { useEffect, useState } from "react"
import { type ColumnDef } from "@tanstack/react-table"
import { format } from "date-fns"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/ui/status-badge"
import { DataTable08 } from "@/components/reuseable/data-table/data-table-08"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Calendar,
  CalendarDays,
  Copy,
  Eye,
  Loader2,
  MoreVertical,
  Pencil,
  Tag,
  Trash2,
} from "lucide-react"
import {
  updateProduct,
  duplicateProduct,
  deleteProduct,
  bulkDeleteProducts,
  bulkDuplicateProducts,
  bulkUpdateProductStatus,
} from "@/lib/actions/products"

export type Product = {
  id: string
  organization_id: string
  product_type_id: string
  name: string
  code: string
  description: string | null
  event_id: string | null
  is_active: boolean | null
  created_at: string
  updated_at: string
  product_type?: {
    id: string
    type_name: string
    type_code: string | null
  } | null
  event?: {
    id: string
    event_name: string
    event_code: string | null
    event_date_from: string | null
    event_date_to: string | null
  } | null
}

function formatDate(value: string) {
  try {
    return format(new Date(value), "MMM dd, yyyy")
  } catch {
    return value
  }
}

function formatEventDisplay(event?: Product["event"]) {
  if (!event) return null
  const nameParts = [event.event_name]
  if (event.event_code) {
    nameParts.push(`(${event.event_code})`)
  }
  const rangeParts: string[] = []
  if (event.event_date_from) {
    rangeParts.push(formatDate(event.event_date_from))
  }
  if (event.event_date_to && event.event_date_to !== event.event_date_from) {
    rangeParts.push(formatDate(event.event_date_to))
  }
  return {
    name: nameParts.join(" "),
    dates: rangeParts.length ? rangeParts.join(" — ") : null,
  }
}

function ProductStatusBadge({ isActive }: { isActive: boolean | null | undefined }) {
  if (isActive === null || isActive === undefined) {
    return <StatusBadge variant="info">Unknown</StatusBadge>
  }
  return <StatusBadge variant={isActive ? "success" : "warning"}>{isActive ? "Active" : "Inactive"}</StatusBadge>
}

function RowActions({
  product,
  onDelete,
  onDuplicate,
}: {
  product: Product
  onDelete: (id: string) => Promise<void>
  onDuplicate: (id: string) => Promise<void>
}) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDuplicating, setIsDuplicating] = useState(false)

  const handleDuplicate = async () => {
    setIsDuplicating(true)
    try {
      await onDuplicate(product.id)
      toast.success("Product duplicated")
      router.refresh()
    } catch (err) {
      toast.error("Failed to duplicate product", { description: err instanceof Error ? err.message : undefined })
    } finally {
      setIsDuplicating(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Delete this product?")) return
    setIsDeleting(true)
    try {
      await onDelete(product.id)
      toast.success("Product deleted")
      router.refresh()
    } catch (err) {
      toast.error("Failed to delete product", { description: err instanceof Error ? err.message : undefined })
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
        <DropdownMenuItem onClick={() => router.push(`/products/${product.id}`)}>
          <Eye className="mr-2 h-4 w-4" />
          View Details
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push(`/products/${product.id}/edit`)}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDuplicate} disabled={isDuplicating}>
          <Copy className="mr-2 h-4 w-4" />
          Duplicate
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

function EditableTextCell({
  row,
  value,
  onUpdate,
  placeholder = "-",
}: {
  row: any
  value: string
  onUpdate: (id: string, value: string) => Promise<void>
  placeholder?: string
}) {
  const [current, setCurrent] = useState(value)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setCurrent(value)
  }, [value])

  const handleSave = async () => {
    const trimmed = current.trim()
    if (trimmed === value) {
      setIsEditing(false)
      return
    }
    setIsSaving(true)
    try {
      await onUpdate(row.original.id, trimmed)
      setIsEditing(false)
    } catch {
      setCurrent(value)
    } finally {
      setIsSaving(false)
    }
  }

  if (isEditing) {
    return (
      <Input
        value={current}
        onChange={(event) => setCurrent(event.target.value)}
        onBlur={handleSave}
        onKeyDown={(event) => {
          if (event.key === "Enter") handleSave()
          if (event.key === "Escape") {
            setCurrent(value)
            setIsEditing(false)
          }
        }}
        autoFocus
        disabled={isSaving}
        className="h-8"
        placeholder={placeholder}
      />
    )
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className="cursor-pointer hover:bg-muted/50 rounded px-2 py-1 -mx-2 -my-1 min-h-8 flex items-center"
    >
      {value || <span className="text-muted-foreground">{placeholder}</span>}
    </div>
  )
}

function EditableStatusCell({ row, onUpdate }: { row: any; onUpdate: (id: string, value: boolean) => Promise<void> }) {
  const isActive = (row.original.is_active ?? false) as boolean
  const [pending, setPending] = useState(false)

  const handleToggle = async (checked: boolean) => {
    if (checked === isActive) return
    setPending(true)
    try {
      await onUpdate(row.original.id, checked)
    } catch {
      /* errors handled upstream */
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      <Switch checked={isActive} onCheckedChange={handleToggle} disabled={pending} />
      <ProductStatusBadge isActive={isActive} />
    </div>
  )
}

export function ProductsDataTable08({
  initialData,
  totalCount,
  page,
  pageSize,
  q,
}: {
  initialData: Product[]
  totalCount: number
  page: number
  pageSize: number
  q: string
}) {
  const router = useRouter()
  const [data, setData] = useState<Product[]>(initialData)

  useEffect(() => {
    setData(initialData)
  }, [initialData])

  const handleFieldUpdate = (field: "name" | "code") => async (id: string, value: string) => {
    const payload: Record<string, any> = {}
    payload[field] = value
    try {
      const updated = await updateProduct(id, payload)
      setData((prev) => prev.map((product) => (product.id === id ? { ...product, ...updated } : product)))
      toast.success("Product updated")
      router.refresh()
    } catch (err) {
      toast.error("Failed to update product", { description: err instanceof Error ? err.message : undefined })
      throw err
    }
  }

  const handleStatusUpdate = async (id: string, value: boolean) => {
    try {
      const updated = await updateProduct(id, { is_active: value })
      setData((prev) => prev.map((product) => (product.id === id ? { ...product, ...updated } : product)))
      toast.success(`Product ${value ? "activated" : "deactivated"}`)
      router.refresh()
    } catch (err) {
      toast.error("Failed to update status", { description: err instanceof Error ? err.message : undefined })
      throw err
    }
  }

  const handleDelete = async (id: string) => {
    await deleteProduct(id)
    setData((prev) => prev.filter((product) => product.id !== id))
  }

  const handleDuplicate = async (id: string) => {
    await duplicateProduct(id)
  }

  const handleBulkDelete = async (selected: Product[]) => {
    await bulkDeleteProducts(selected.map((item) => item.id))
    toast.success(`${selected.length} product(s) deleted`)
    router.refresh()
  }

  const handleBulkDuplicate = async (selected: Product[]) => {
    await bulkDuplicateProducts(selected.map((item) => item.id))
    toast.success(`${selected.length} product(s) duplicated`)
    router.refresh()
  }

  const handleBulkStatusChange = async (selected: Product[], status: boolean) => {
    await bulkUpdateProductStatus(selected.map((item) => item.id), status)
    toast.success(`Marked ${selected.length} product(s) as ${status ? "active" : "inactive"}`)
    router.refresh()
  }

  const columns: ColumnDef<Product>[] = [
    {
      accessorKey: "name",
      header: "Product",
      cell: ({ row }) => (
        <EditableTextCell
          row={row}
          value={(row.original.name ?? "") as string}
          onUpdate={handleFieldUpdate("name")}
          placeholder="Product name"
        />
      ),
    },
    {
      accessorKey: "code",
      header: "Code",
      cell: ({ row }) => (
        <EditableTextCell
          row={row}
          value={(row.original.code ?? "") as string}
          onUpdate={handleFieldUpdate("code")}
          placeholder="Product code"
        />
      ),
    },
    {
      accessorKey: "product_type",
      header: "Type",
      cell: ({ row }) => {
        const type = row.original.product_type
        if (!type) return <span className="text-muted-foreground">-</span>
        return (
          <div className="space-y-1">
            <div className="font-medium">{type.type_name}</div>

          </div>
        )
      },
    },
    {
      id: "event",
      accessorFn: (row) => row.event?.event_name ?? "",
      header: "Event",
      cell: ({ row }) => {
        const info = formatEventDisplay(row.original.event)
        if (!info) return <span className="text-muted-foreground">No event</span>
        return (
          <div className="space-y-1 text-sm">
            <div className="font-medium leading-none">{info.name}</div>
            {info.dates ? <div className="text-xs text-muted-foreground">{info.dates}</div> : null}
          </div>
        )
      },
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => <EditableStatusCell row={row} onUpdate={handleStatusUpdate} />,
    },
    {
      accessorKey: "updated_at",
      header: "Updated",
      cell: ({ row }) => (
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>{formatDate(row.original.updated_at)}</span>
        </div>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <RowActions
          product={row.original as Product}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
        />
      ),
    },
  ]

  return (
    <DataTable08
      data={data}
      columns={columns}
      totalCount={totalCount}
      page={page}
      pageSize={pageSize}
      q={q}
      searchPlaceholder="Search products..."
      exportFilename="products.csv"
      enableRowSelection={true}
      enableSearch={true}
      enableExport={true}
      enableColumnVisibility={true}
      enableViewToggle={true}
      enablePagination={true}
      storageKey="products-table"
      onBulkDelete={handleBulkDelete}
      onBulkDuplicate={handleBulkDuplicate}
      onBulkStatusChange={handleBulkStatusChange}
      cardViewRenderer={(row) => {
        const product = row.original as Product
        const eventInfo = formatEventDisplay(product.event)
        return (
          <div className="rounded-lg border bg-card p-3 shadow-xs space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <div className="font-medium text-base">{product.name}</div>
                <Badge variant="secondary" className="uppercase tracking-wide text-xs">
                  {product.code}
                </Badge>
              </div>
              <ProductStatusBadge isActive={product.is_active} />
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Tag className="h-3 w-3" />
                <span>{product.product_type?.type_name || "No type"}</span>
              </div>
              {eventInfo ? (
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-3 w-3" />
                  <div className="flex flex-col">
                    <span>{eventInfo.name}</span>
                    {eventInfo.dates ? <span className="text-xs">{eventInfo.dates}</span> : null}
                  </div>
                </div>
              ) : null}
              <div className="flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                <span>Updated {formatDate(product.updated_at)}</span>
              </div>
            </div>
          </div>
        )
      }}
      emptyMessage="No products found."
    />
  )
}


