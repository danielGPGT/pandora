"use client"

import Image from "next/image"
import { CalendarDays, Clock, MapPin, Info } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import type { EventDetailsResult } from "@/lib/data/events"
// Use centralized utilities
import { formatEventDateRange, getEventCountdown } from "@/lib/utils/date-range"
import { formatCurrency } from "@/lib/utils/format"

type EventOverviewCardProps = {
  event: EventDetailsResult["event"]
  counts: EventDetailsResult["counts"]
}

const metricConfig: Array<{
  key: keyof EventDetailsResult["counts"]
  label: string
  format?: (value: number, counts: EventDetailsResult["counts"]) => string
}> = [
  {
    key: "productsTotal",
    label: "Linked products",
  },
  {
    key: "productsActive",
    label: "Active products",
  },
  {
    key: "contractsTotal",
    label: "Contracts",
  },
  {
    key: "contractsActive",
    label: "Active contracts",
  },
  {
    key: "upcomingServices",
    label: "Upcoming services",
  },
  {
    key: "totalRevenue",
    label: "Upcoming revenue",
    format: (value, counts) => {
      if (!value) return "0"
      if (counts.revenueCurrency) {
        return formatCurrency(value, counts.revenueCurrency, undefined, { maximumFractionDigits: 0 })
      }
      return value.toLocaleString()
    },
  },
]

// Formatting functions moved to lib/utils/date-range - see imports above

export function EventOverviewCard({ event, counts }: EventOverviewCardProps) {
  const dateRangeLabel = formatEventDateRange(event)
  const countdown = getEventCountdown(event)

  return (
    <Card className="overflow-hidden">
      {event.event_image_url ? (
        <div className="relative h-48 w-full">
          <Image
            src={event.event_image_url}
            alt={`${event.event_name} hero`}
            fill
            className="object-cover"
            sizes="(min-width: 1024px) 50vw, 100vw"
            priority
          />
        </div>
      ) : (
        <div className="flex h-32 items-center justify-center bg-muted/50">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Info className="h-5 w-5" />
            <span className="text-sm">No cover image</span>
          </div>
        </div>
      )}

      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          {event.event_code ? (
            <Badge variant="secondary" className="uppercase tracking-wide">
              {event.event_code}
            </Badge>
          ) : null}
          {event.event_type ? (
            <Badge variant="outline" className="capitalize">
              {event.event_type}
            </Badge>
          ) : null}
        </div>
        <CardTitle className="text-xl font-semibold leading-tight">Overview</CardTitle>
        {event.description ? (
          <p className="text-sm text-muted-foreground leading-6">{event.description}</p>
        ) : (
          <p className="text-sm text-muted-foreground italic">No description provided.</p>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Date range</p>
            <div className="mt-1 flex items-center gap-2 text-sm font-medium">
              <CalendarDays className="h-4 w-4 text-muted-foreground" aria-hidden />
              <span>{dateRangeLabel}</span>
            </div>
            {countdown ? (
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" aria-hidden />
                <span>{countdown}</span>
              </div>
            ) : null}
          </div>

          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Location</p>
            <div className="mt-1 flex items-start gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" aria-hidden />
              <span className="text-sm font-medium">
                {event.venue_name ? `${event.venue_name}` : "No venue specified"}
                <br />
                <span className="text-xs text-muted-foreground">
                  {[event.city, event.country].filter(Boolean).join(", ") || "Location TBD"}
                </span>
              </span>
            </div>
          </div>
        </div>

        <Separator />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {metricConfig.map(({ key, label, format: formatter }) => {
            const rawValue = counts[key]
            if (key === "totalRevenue" && !rawValue) {
              return (
                <MetricCard key={key} label={label} value="—" />
              )
            }

            const value = typeof rawValue === "number" ? rawValue : 0
            const displayValue = formatter ? formatter(value, counts) : value.toLocaleString()

            return <MetricCard key={key} label={label} value={displayValue} />
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-muted/40 p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-semibold">{typeof value === "number" ? value.toLocaleString() : value}</p>
    </div>
  )
}

