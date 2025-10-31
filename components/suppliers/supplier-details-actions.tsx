"use client"

import * as React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2 } from "lucide-react"
import { EditSupplierDialog } from "@/components/suppliers/edit-supplier-dialog"
import { DeleteSupplierDialog } from "@/components/suppliers/delete-supplier-dialog"
import { useRouter } from "next/navigation"
import type { Supplier } from "@/components/reuseable/data-table/data-table-08-suppliers"

type SupplierDetailsActionsProps = {
  supplier: Supplier | any
}

export function SupplierDetailsActions({ supplier }: SupplierDetailsActionsProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const router = useRouter()

  return (
    <>
      <div className="flex gap-2">
        <Button variant="outline" className="gap-2" onClick={() => setEditOpen(true)}>
          <Pencil className="h-4 w-4" /> Edit
        </Button>
        <Button
          variant="outline"
          className="gap-2 text-destructive hover:text-destructive"
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 className="h-4 w-4" /> Delete
        </Button>
      </div>
      <EditSupplierDialog open={editOpen} onOpenChange={setEditOpen} supplier={supplier as Supplier} />
      <DeleteSupplierDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        supplier={supplier as Supplier}
        onDeleted={() => {
          router.push("/suppliers")
          router.refresh()
        }}
      />
    </>
  )
}

