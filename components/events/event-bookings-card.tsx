"use client"

import Link from "next/link"
import { format } from "date-fns"
import { CalendarDays, Ticket, DollarSign } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/ui/status-badge"
import type { EventDetailsResult } from "@/lib/data/events"

type EventBookingsCardProps = {
  bookings: EventDetailsResult["bookings"]
}

const itemStatusVariant: Record<string, React.ComponentProps<typeof StatusBadge>["variant"]> = {
  confirmed: "success",
  provisional: "info",
  cancelled: "destructive",
}

export function EventBookingsCard({ bookings }: EventBookingsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Upcoming services</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {bookings.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/40 p-6 text-center text-sm text-muted-foreground">
            No upcoming bookings for this event.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {bookings.map((booking) => (
              <BookingCard key={booking.id} booking={booking} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function BookingCard({ booking }: { booking: EventDetailsResult["bookings"][number] }) {
  const serviceDate = booking.service_date_from
    ? format(new Date(booking.service_date_from), "MMM dd, yyyy")
    : "Date TBD"
  const serviceRange = booking.service_date_to && booking.service_date_to !== booking.service_date_from
    ? `${serviceDate} → ${format(new Date(booking.service_date_to), "MMM dd, yyyy")}`
    : serviceDate

  const bookingHref = booking.booking ? `/bookings/${booking.booking.id}` : undefined

  const amount = booking.total_price_base ?? booking.total_price ?? 0
  const amountLabel = amount
    ? formatCurrency(amount, booking.price_currency ?? undefined)
    : "No value"

  const statusKey = (booking.item_status ?? "").toLowerCase()
  const statusVariant = itemStatusVariant[statusKey] ?? "default"

  const content = (
    <div className="flex h-full flex-col rounded-lg border bg-card/60 p-3 transition group-hover:border-primary/40 group-hover:bg-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <Ticket className="h-4 w-4 text-muted-foreground" aria-hidden />
            <p className="truncate text-sm font-medium">
              {booking.product?.name ?? "Unnamed product"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {booking.booking?.booking_reference ? (
              <Badge variant="outline">{booking.booking.booking_reference}</Badge>
            ) : null}
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3 w-3" aria-hidden />
              {serviceRange}
            </span>
            {booking.quantity ? <span>Qty {booking.quantity}</span> : null}
          </div>
        </div>
        <StatusBadge variant={statusVariant}>{booking.item_status ?? "Scheduled"}</StatusBadge>
      </div>

      <div className="mt-3 flex items-center gap-2 text-sm font-medium text-foreground">
        <DollarSign className="h-4 w-4 text-muted-foreground" aria-hidden />
        <span>{amountLabel}</span>
      </div>

      {booking.booking?.lead_passenger_name ? (
        <p className="mt-2 truncate text-xs text-muted-foreground">
          Lead passenger: {booking.booking.lead_passenger_name}
        </p>
      ) : null}
    </div>
  )

  if (bookingHref) {
    return (
      <Link href={bookingHref} className="group block h-full">
        {content}
      </Link>
    )
  }

  return content
}

function formatCurrency(value: number, currency?: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 0,
    }).format(value)
  } catch (error) {
    return value.toLocaleString()
  }
}

