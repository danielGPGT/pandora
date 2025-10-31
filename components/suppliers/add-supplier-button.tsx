"use client"

import * as React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { AddSupplierDialog } from "@/components/suppliers/add-supplier-dialog"

export function AddSupplierButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button className="gap-2" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> New supplier
      </Button>
      <AddSupplierDialog open={open} onOpenChange={setOpen} />
    </>
  )
}


