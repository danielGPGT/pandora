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
// Use centralized utilities
import { getEventStatusVariant, formatStatusLabel } from "@/lib/utils/status"
import { buildLoadErrorMessages, EVENT_ERROR_MESSAGES } from "@/lib/utils/errors"
import { logger } from "@/lib/middleware/logging"

type EventDetailsPageProps = {
  params: Promise<{ id: string }>
}

export default async function EventDetailsPage({ params }: EventDetailsPageProps) {
  const { id } = await params
  
  let details: EventDetailsResult | null = null
  try {
    details = await getEventDetails(id)
  } catch (error) {
    logger.error('Failed to fetch event details', error, { eventId: id })
    notFound()
  }

  if (!details) {
    logger.warn('Event not found', { eventId: id })
    notFound()
  }

  const { event, counts, products, contracts, bookings, auditLog, loadErrors } = details

  const statusVariant = getEventStatusVariant(event.event_status)
  const statusLabel = formatStatusLabel(event.event_status)

  const errorMessages = buildLoadErrorMessages(loadErrors, EVENT_ERROR_MESSAGES)
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

// Helper functions moved to lib/utils - see imports above

