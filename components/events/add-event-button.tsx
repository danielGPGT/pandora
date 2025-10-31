"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { EventDialog } from "@/components/events/event-dialog"

export function AddEventButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button className="gap-2" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> New event
      </Button>
      <EventDialog mode="create" open={open} onOpenChange={setOpen} />
    </>
  )
}


