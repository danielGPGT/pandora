"use client"

import * as React from "react"
import { useState } from "react"
import { AppDialog } from "@/components/ui/app-dialog"
import { Button } from "@/components/ui/button"
import { deleteSupplier } from "@/lib/actions/suppliers"
import { toast } from "sonner"
import { Loader2, AlertTriangle } from "lucide-react"
import { useRouter } from "next/navigation"
import type { Supplier } from "@/components/reuseable/data-table/data-table-08-suppliers"

type DeleteSupplierDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  supplier: Supplier | null
  onDeleted?: () => void
}

export function DeleteSupplierDialog({ open, onOpenChange, supplier, onDeleted }: DeleteSupplierDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    if (!supplier) return

    setIsDeleting(true)
    try {
      await deleteSupplier(supplier.id)
      toast.success("Supplier deleted", { description: supplier.name })
      onOpenChange(false)
      onDeleted?.()
      router.refresh()
    } catch (err) {
      toast.error("Failed to delete supplier", {
        description: err instanceof Error ? err.message : "This supplier may have existing contracts",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  if (!supplier) return null

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete Supplier"
      description={`Are you sure you want to delete "${supplier.name}"?`}
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Delete Supplier
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex gap-3 p-4 bg-destructive-subtle border border-destructive-border rounded-lg">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium">This action cannot be undone.</p>
            <p className="text-xs text-muted-foreground">
              This will permanently delete the supplier and all associated data. If this supplier has contracts, you must delete those first.
            </p>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          <p>
            <strong>Supplier:</strong> {supplier.name}
          </p>
          <p>
            <strong>Code:</strong> {supplier.code}
          </p>
        </div>
      </div>
    </AppDialog>
  )
}

