import { GeneralPageLayout } from "@/components/protected/general-page-layout"
import { SummaryCard } from "@/components/ui/summary-card"
import { EventsDataTable08, type EventRecord } from "@/components/reuseable/data-table/data-table-08-events"
import { CalendarDays, CalendarClock, History, Flag } from "lucide-react"
import { eventsQuerySchema, getEventsPage, getEventsSummary } from "@/lib/data/events"
import { AddEventButton } from "@/components/events/add-event-button"

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string; q?: string; sort?: string; dir?: string; status?: string }>
}) {
  const params = await searchParams
  const parsed = eventsQuerySchema.parse(params)
  const [{ rows, total }, summary] = await Promise.all([getEventsPage(parsed), getEventsSummary()])

  return (
    <GeneralPageLayout
      title="Events"
      subtitle="Manage events, venues, and timelines for your products."
      actions={<AddEventButton />}
    >
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <SummaryCard
          title="Total events"
          value={total ?? 0}
          subtitle="All events across your organization."
          icon={<CalendarDays className="h-5 w-5" />}
          variant="info"
        />
        <SummaryCard
          title="Upcoming"
          value={summary.upcoming}
          subtitle="Events starting after today."
          icon={<Flag className="h-5 w-5" />}
          variant="success"
        />
        <SummaryCard
          title="In progress"
          value={summary.ongoing}
          subtitle="Events currently running."
          icon={<CalendarClock className="h-5 w-5" />}
          variant="warning"
        />
        <SummaryCard
          title="Completed"
          value={summary.past}
          subtitle="Events that have finished."
          icon={<History className="h-5 w-5" />}
          variant="default"
        />
      </div>

      <EventsDataTable08
        initialData={(rows ?? []) as EventRecord[]}
        totalCount={total ?? 0}
        page={parsed.page}
        pageSize={parsed.pageSize}
        q={parsed.q ?? ""}
      />
    </GeneralPageLayout>
  )
}


