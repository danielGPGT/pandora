"use client"

import * as React from "react"
import { differenceInCalendarDays, format } from "date-fns"
import { CalendarDays, Building2, MapPin, Hash, Layers, ClipboardList } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { EventDetailsResult } from "@/lib/data/events"

type EventLogisticsCardProps = {
  event: EventDetailsResult["event"]
  counts: EventDetailsResult["counts"]
}

export function EventLogisticsCard({ event, counts }: EventLogisticsCardProps) {
  const durationDays = getDurationDays(event.event_date_from, event.event_date_to)

  const locationLine = [event.city, event.country].filter(Boolean).join(", ")

  const startDate = safeDate(event.event_date_from)
  const endDate = safeDate(event.event_date_to)
  const scheduleValue = startDate && endDate
    ? `${format(startDate, "MMM dd, yyyy")} → ${format(endDate, "MMM dd, yyyy")}`
    : "Schedule TBD"
  const scheduleHelper = startDate && endDate && durationDays ? `${durationDays} day${durationDays === 1 ? "" : "s"}` : undefined

  const stats = [
    {
      label: "Products",
      value: counts.productsTotal ? `${counts.productsActive}/${counts.productsTotal} active` : "No products",
      icon: Layers,
    },
    {
      label: "Contracts",
      value: counts.contractsTotal ? `${counts.contractsActive}/${counts.contractsTotal} active` : "No contracts",
      icon: ClipboardList,
    },
    {
      label: "Upcoming services",
      value: counts.upcomingServices ? counts.upcomingServices.toLocaleString() : "None scheduled",
      icon: CalendarDays,
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Logistics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <DetailRow icon={Building2} label="Venue" value={event.venue_name || "No venue specified"} />
          <DetailRow icon={MapPin} label="Location" value={locationLine || "Location TBD"} />
          <DetailRow icon={CalendarDays} label="Schedule" value={scheduleValue} helper={scheduleHelper} />
          <DetailRow icon={Hash} label="Event code" value={event.event_code || "Not assigned"} />
          <DetailRow icon={Layers} label="Type" value={event.event_type || "Uncategorised"} />
        </div>

        <div className="grid gap-3">
          {stats.map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2.5">
              <Badge variant="outline" className="h-7 w-7 shrink-0 items-center justify-center rounded-full p-0">
                <Icon className="h-3.5 w-3.5" aria-hidden />
              </Badge>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
                <p className="text-sm font-medium text-foreground">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function DetailRow({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: React.ElementType
  label: string
  value: string
  helper?: string
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
      <Badge variant="outline" className="h-7 w-7 shrink-0 items-center justify-center rounded-full p-0">
        <Icon className="h-3.5 w-3.5" aria-hidden />
      </Badge>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
        {helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
      </div>
    </div>
  )
}

function getDurationDays(from: string, to: string) {
  const start = new Date(from)
  const end = new Date(to)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null
  const diff = differenceInCalendarDays(end, start) + 1
  return diff > 0 ? diff : 0
}

function safeDate(input: string | null) {
  if (!input) return null
  const date = new Date(input)
  return Number.isNaN(date.getTime()) ? null : date
}

