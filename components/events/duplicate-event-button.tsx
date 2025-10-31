"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Copy } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { duplicateEvent } from "@/lib/actions/events"

type DuplicateEventButtonProps = {
  eventId: string
  eventName: string
}

export function DuplicateEventButton({ eventId, eventName }: DuplicateEventButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleDuplicate = () => {
    startTransition(async () => {
      try {
        await duplicateEvent(eventId)
        toast.success(`Duplicated ${eventName}`)
        router.refresh()
      } catch (error) {
        toast.error("Failed to duplicate event", {
          description: error instanceof Error ? error.message : undefined,
        })
      }
    })
  }

  return (
    <Button variant="outline" className="gap-2" onClick={handleDuplicate} disabled={isPending}>
      <Copy className="h-4 w-4" />
      {isPending ? "Duplicating..." : "Duplicate"}
    </Button>
  )
}

