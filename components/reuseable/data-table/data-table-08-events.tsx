"use client"

import { useCallback, useMemo, useState } from "react"
import { type ColumnDef } from "@tanstack/react-table"
import { format } from "date-fns"
import { CalendarDays, MapPin, Ticket, MoreVertical, Eye, Pencil, Copy, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { DataTable08 } from "@/components/reuseable/data-table/data-table-08"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EventDialog } from "@/components/events/event-dialog"
import {
  deleteEvent,
  duplicateEvent,
  bulkDeleteEvents,
  bulkDuplicateEvents,
} from "@/lib/actions/events"

export type EventRecord = {
  id: string
  organization_id: string | null
  event_name: string
  event_code: string | null
  event_type: string | null
  venue_name: string | null
  city: string | null
  country: string | null
  event_date_from: string
  event_date_to: string
  event_status: string | null
  description: string | null
  event_image_url: string | null
  created_at: string
  updated_at: string
}

function formatDateRange(from: string, to: string) {
  try {
    const formattedFrom = format(new Date(from), "MMM dd, yyyy")
    const formattedTo = format(new Date(to), "MMM dd, yyyy")
    if (formattedFrom === formattedTo) return formattedFrom
    return `${formattedFrom} — ${formattedTo}`
  } catch {
    return `${from} – ${to}`
  }
}

function getStatusVariant(status: string | null | undefined) {
  if (!status) return "secondary" as const
  switch (status.toLowerCase()) {
    case "scheduled":
      return "info" as const
    case "active":
    case "confirmed":
      return "success" as const
    case "completed":
      return "default" as const
    case "cancelled":
    case "canceled":
      return "destructive" as const
    default:
      return "secondary" as const
  }
}

function isUpcoming(event: EventRecord) {
  const today = new Date()
  return new Date(event.event_date_from) > today
}

function isPast(event: EventRecord) {
  const today = new Date()
  return new Date(event.event_date_to) < today
}

function EventStatusBadge({ event }: { event: EventRecord }) {
  const status = event.event_status ?? "Scheduled"
  const variant = getStatusVariant(status)
  const pillLabel = isPast(event) ? "Past" : isUpcoming(event) ? "Upcoming" : "Ongoing"

  return (
    <div className="flex flex-col gap-1">
      <Badge variant={variant}>{status}</Badge>
      <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
        {pillLabel}
      </Badge>
    </div>
  )
}

type RowActionsProps = {
  event: EventRecord
  onDuplicate: (id: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

function RowActions({ event, onDuplicate, onDelete }: RowActionsProps) {
  const router = useRouter()
  const [menuAction, setMenuAction] = useState<"duplicate" | "delete" | null>(null)
  const [editOpen, setEditOpen] = useState(false)

  const handleNavigate = (href: string) => {
    router.push(href)
  }

  const handleDuplicate = async () => {
    setMenuAction("duplicate")
    try {
      await onDuplicate(event.id)
    } finally {
      setMenuAction(null)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Delete event "${event.event_name}"?`)) return
    setMenuAction("delete")
    try {
      await onDelete(event.id)
    } finally {
      setMenuAction(null)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleNavigate(`/events/${event.id}`)}>
            <Eye className="mr-2 h-4 w-4" /> View details
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" /> Edit event
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDuplicate} disabled={menuAction !== null}>
            <Copy className="mr-2 h-4 w-4" /> Duplicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleDelete}
            disabled={menuAction !== null}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <EventDialog mode="edit" open={editOpen} onOpenChange={setEditOpen} event={event} />
    </>
  )
}

export function EventsDataTable08({
  initialData,
  totalCount,
  page,
  pageSize,
  q,
}: {
  initialData: EventRecord[]
  totalCount: number
  page: number
  pageSize: number
  q: string
}) {
  const router = useRouter()

  const handleDuplicate = useCallback(
    async (id: string) => {
      try {
        await duplicateEvent(id)
        toast.success("Event duplicated")
        router.refresh()
      } catch (err) {
        toast.error("Failed to duplicate event", {
          description: err instanceof Error ? err.message : undefined,
        })
      }
    },
    [router]
  )

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteEvent(id)
        toast.success("Event deleted")
        router.refresh()
      } catch (err) {
        toast.error("Failed to delete event", {
          description: err instanceof Error ? err.message : undefined,
        })
      }
    },
    [router]
  )

  const handleBulkDelete = useCallback(
    async (selected: EventRecord[]) => {
      if (!selected.length) return
      try {
        await bulkDeleteEvents(selected.map((row) => row.id))
        toast.success(`Deleted ${selected.length} event${selected.length > 1 ? "s" : ""}`)
        router.refresh()
      } catch (err) {
        toast.error("Failed to delete events", {
          description: err instanceof Error ? err.message : undefined,
        })
      }
    },
    [router]
  )

  const handleBulkDuplicate = useCallback(
    async (selected: EventRecord[]) => {
      if (!selected.length) return
      try {
        await bulkDuplicateEvents(selected.map((row) => row.id))
        toast.success(`Duplicated ${selected.length} event${selected.length > 1 ? "s" : ""}`)
        router.refresh()
      } catch (err) {
        toast.error("Failed to duplicate events", {
          description: err instanceof Error ? err.message : undefined,
        })
      }
    },
    [router]
  )

  const columns = useMemo<ColumnDef<EventRecord>[]>(
    () => [
      {
        accessorKey: "event_name",
        header: "Event",
        cell: ({ row }) => {
          const event = row.original
          return (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Ticket className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                <span className="font-medium text-sm">{event.event_name}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {event.event_code ? <Badge variant="outline">{event.event_code}</Badge> : null}
                {event.event_type ? <span>{event.event_type}</span> : null}
              </div>
            </div>
          )
        },
      },
      {
        accessorKey: "event_date_from",
        header: "Dates",
        cell: ({ row }) => (
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              <span>{formatDateRange(row.original.event_date_from, row.original.event_date_to)}</span>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "city",
        header: "Location",
        cell: ({ row }) => {
          const event = row.original
          const locationParts = [event.venue_name, event.city, event.country].filter(Boolean)
          return (
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 h-3.5 w-3.5" aria-hidden />
              <span>{locationParts.length ? locationParts.join(", ") : "—"}</span>
            </div>
          )
        },
      },
      {
        accessorKey: "event_status",
        header: "Status",
        cell: ({ row }) => <EventStatusBadge event={row.original} />,
      },
      {
        accessorKey: "updated_at",
        header: "Updated",
        cell: ({ row }) => {
          try {
            return <span className="text-sm text-muted-foreground">{format(new Date(row.original.updated_at), "MMM dd, yyyy")}</span>
          } catch {
            return <span className="text-sm text-muted-foreground">{row.original.updated_at}</span>
          }
        },
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <RowActions event={row.original} onDuplicate={handleDuplicate} onDelete={handleDelete} />
        ),
      },
    ],
    [handleDelete, handleDuplicate]
  )

  const cardView = (row: { original: EventRecord }) => {
    const event = row.original
    const location = [event.venue_name, event.city, event.country].filter(Boolean).join(", ")
    return (
      <div className="rounded-lg border bg-card p-3 shadow-xs space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <div className="text-base font-medium">{event.event_name}</div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {event.event_code ? <Badge variant="outline">{event.event_code}</Badge> : null}
              {event.event_type ? <span>{event.event_type}</span> : null}
            </div>
          </div>
          <EventStatusBadge event={event} />
        </div>
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-3 w-3" aria-hidden />
            <span>{formatDateRange(event.event_date_from, event.event_date_to)}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-3 w-3" aria-hidden />
            <span>{location || "No location"}</span>
          </div>
        </div>
        {event.description ? (
          <p className="line-clamp-3 text-sm text-muted-foreground">{event.description}</p>
        ) : (
          <p className="text-sm text-muted-foreground italic">No description</p>
        )}
      </div>
    )
  }

  return (
    <DataTable08<EventRecord>
      data={initialData}
      columns={columns}
      totalCount={totalCount}
      page={page}
      pageSize={pageSize}
      q={q}
      searchPlaceholder="Search events..."
      enableExport={true}
      enableColumnVisibility={true}
      enableRowSelection={true}
      cardViewRenderer={cardView}
      storageKey="events-table"
      emptyMessage="No events found."
      onBulkDelete={handleBulkDelete}
      onBulkDuplicate={handleBulkDuplicate}
    />
  )
}


