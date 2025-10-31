"use client"

import { useState } from "react"
import { Pencil } from "lucide-react"

import { Button } from "@/components/ui/button"
import { EventDialog } from "@/components/events/event-dialog"
import type { EventDetailsResult } from "@/lib/data/events"

type EditEventButtonProps = {
  event: EventDetailsResult["event"]
}

export function EditEventButton({ event }: EditEventButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant="outline" className="gap-2" onClick={() => setOpen(true)}>
        <Pencil className="h-4 w-4" /> Edit event
      </Button>
      <EventDialog
        mode="edit"
        open={open}
        onOpenChange={setOpen}
        event={{
          id: event.id,
          event_name: event.event_name,
          event_code: event.event_code,
          event_type: event.event_type,
          venue_name: event.venue_name,
          city: event.city,
          country: event.country,
          event_date_from: event.event_date_from,
          event_date_to: event.event_date_to,
          event_status: event.event_status,
          description: event.description,
          event_image_url: event.event_image_url,
        }}
      />
    </>
  )
}

