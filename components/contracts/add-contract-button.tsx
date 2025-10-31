"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { AddContractDialog } from "./add-contract-dialog"

export function AddContractButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Add Contract
      </Button>
      <AddContractDialog open={open} onOpenChange={setOpen} />
    </>
  )
}

