import * as React from "react"
import { notFound } from "next/navigation"
import { Info } from "lucide-react"

import { DetailsPageLayout } from "@/components/protected/details-page-layout"
import { StatusBadge } from "@/components/ui/status-badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ActivityTimeline } from "@/components/audit/activity-timeline"
import { EventOverviewCard } from "@/components/events/event-overview-card"
import { EventLogisticsCard } from "@/components/events/event-logistics-card"
import { EventProductsCard } from "@/components/events/event-products-card"
import { EventContractsCard } from "@/components/events/event-contracts-card"
import { EventBookingsCard } from "@/components/events/event-bookings-card"
import { EditEventButton } from "@/components/events/edit-event-button"
import { DuplicateEventButton } from "@/components/events/duplicate-event-button"
import { getEventDetails, type EventDetailsResult } from "@/lib/data/events"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type EventDetailsPageProps = {
  params: Promise<{ id: string }>
}

export default async function EventDetailsPage({ params }: EventDetailsPageProps) {
  const { id } = await params
  const details = await getEventDetails(id)

  if (!details) {
    notFound()
  }

  const { event, counts, products, contracts, bookings, auditLog, loadErrors } = details

  const statusVariant = getStatusVariant(event.event_status)
  const statusLabel = formatStatusLabel(event.event_status)

  const errorMessages = buildErrorMessages(loadErrors)
  const hasErrors = errorMessages.length > 0

  return (
    <DetailsPageLayout
      title={event.event_name}
      subtitle="Event overview, linked inventory, and recent activity."
      backHref="/events"
      badge={<StatusBadge variant={statusVariant}>{statusLabel}</StatusBadge>}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <DuplicateEventButton eventId={event.id} eventName={event.event_name} />
          <EditEventButton event={event} />
        </div>
      }
    >
      <div className="space-y-6">
        {hasErrors ? (
          <Alert className="border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            <Info className="h-4 w-4" aria-hidden />
            <AlertTitle>Some panels failed to load</AlertTitle>
            <AlertDescription>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {errorMessages.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        ) : null}

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
              <EventOverviewCard event={event} counts={counts} />
              <EventLogisticsCard event={event} counts={counts} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <EventProductsCard products={products} counts={counts} eventId={event.id} />
              <EventContractsCard contracts={contracts} counts={counts} eventId={event.id} />
            </div>

            <EventBookingsCard bookings={bookings} />
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Audit & Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <ActivityTimeline
                  logs={auditLog}
                  emptyMessage="No activity recorded for this event yet."
                  showEntityType={false}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DetailsPageLayout>
  )
}

function getStatusVariant(status: string | null): React.ComponentProps<typeof StatusBadge>["variant"] {
  const key = (status ?? "").toLowerCase()
  switch (key) {
    case "active":
    case "live":
    case "confirmed":
      return "success"
    case "scheduled":
      return "info"
    case "completed":
      return "default"
    case "cancelled":
    case "canceled":
      return "destructive"
    default:
      return "warning"
  }
}

function formatStatusLabel(status: string | null) {
  if (!status) return "Uncategorised"
  return status.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase())
}

function buildErrorMessages(loadErrors: EventDetailsResult["loadErrors"]) {
  const messages: string[] = []

  if (loadErrors.products) {
    messages.push("We couldn't load linked products.")
  }

  if (loadErrors.contracts) {
    messages.push("We couldn't load associated contracts.")
  }

  if (loadErrors.bookings) {
    messages.push("Upcoming booking information may be incomplete.")
  }

  if (loadErrors.auditLog) {
    messages.push("Recent activity timeline is unavailable.")
  }

  if (loadErrors.counts) {
    messages.push("Summary metrics may be out of date.")
  }

  return messages
}

