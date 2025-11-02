"use client"

import { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { AlertTriangle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

type DeleteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void> | void
  title?: string
  description?: string
  itemName?: string | string[] // For single item or array of item names
  variant?: "default" | "bulk"
  confirmLabel?: string
  cancelLabel?: string
  warningMessage?: string
  details?: React.ReactNode
  onDeleted?: () => void
  successMessage?: string
  errorMessage?: string
  // Restore functionality (for soft deletes)
  showRestore?: boolean
  onRestore?: () => Promise<void> | void
  restoreLabel?: string
  isDeleted?: boolean // If true, show restore instead of delete
}

export function DeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  itemName,
  variant = "default",
  confirmLabel,
  cancelLabel = "Cancel",
  warningMessage,
  details,
  onDeleted,
  successMessage,
  errorMessage,
  showRestore = false,
  onRestore,
  restoreLabel,
  isDeleted = false,
}: DeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)

  const handleConfirm = async () => {
    if (isDeleted && onRestore) {
      setIsRestoring(true)
      try {
        await onRestore()
        onDeleted?.()
        onOpenChange(false)
      } catch (error) {
        console.error("Restore error:", error)
      } finally {
        setIsRestoring(false)
      }
    } else {
      setIsDeleting(true)
      try {
        await onConfirm()
        onDeleted?.()
        onOpenChange(false)
      } catch (error) {
        // Error handling is typically done in onConfirm, but we can show a generic message
        console.error("Delete error:", error)
      } finally {
        setIsDeleting(false)
      }
    }
  }

  // Generate title (restore mode if isDeleted)
  const dialogTitle = isDeleted
    ? title ?? (itemName ? `Restore "${Array.isArray(itemName) ? itemName[0] : itemName}"?` : "Restore item?")
    : title ??
      (variant === "bulk"
        ? `Delete ${Array.isArray(itemName) ? itemName.length : 0} item${Array.isArray(itemName) && itemName.length !== 1 ? "s" : ""}?`
        : itemName
        ? `Delete "${Array.isArray(itemName) ? itemName[0] : itemName}"?`
        : "Delete item?")

  // Generate description
  const dialogDescription = isDeleted
    ? description ?? "Are you sure you want to restore this item? It will become active again."
    : description ??
      (variant === "bulk"
        ? `Are you sure you want to delete ${Array.isArray(itemName) ? itemName.length : 0} item${Array.isArray(itemName) && itemName.length !== 1 ? "s" : ""}? This action cannot be undone.`
        : "Are you sure you want to delete this item? This action cannot be undone.")

  // Default warning message (not shown for restore)
  const defaultWarningMessage = isDeleted
    ? "This item will be restored and become active again."
    : warningMessage ?? "This action cannot be undone. All associated data will be permanently removed."

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{dialogTitle}</AlertDialogTitle>
          <AlertDialogDescription>{dialogDescription}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning Box */}
          <div className="flex gap-3 p-4 bg-destructive/10 dark:bg-destructive/20 border border-destructive/20 dark:border-destructive/40 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-destructive dark:text-destructive">{defaultWarningMessage}</p>
            </div>
          </div>

          {/* Details */}
          {details ? <div className="text-sm text-muted-foreground">{details}</div> : null}

          {/* Bulk delete: show list of items */}
          {variant === "bulk" && Array.isArray(itemName) && itemName.length > 0 && itemName.length <= 10 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Items to delete:</p>
              <ul className="text-sm text-muted-foreground space-y-1 max-h-32 overflow-y-auto pl-4 list-disc">
                {itemName.map((name, index) => (
                  <li key={index}>{name}</li>
                ))}
              </ul>
            </div>
          ) : variant === "bulk" && Array.isArray(itemName) && itemName.length > 10 ? (
            <div className="text-sm text-muted-foreground">
              <p className="font-medium">Items to delete:</p>
              <p>{itemName.length} items selected</p>
            </div>
          ) : null}

          {/* Single item details */}
          {variant === "default" && itemName && !Array.isArray(itemName) ? (
            <div className="text-sm text-muted-foreground space-y-1">
              <p>
                <strong>Item:</strong> {itemName}
              </p>
            </div>
          ) : null}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting || isRestoring}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isDeleting || isRestoring}
            className={cn(
              isDeleted
                ? "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500"
                : "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus:ring-destructive"
            )}
          >
            {(isDeleting || isRestoring) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isDeleted
              ? restoreLabel ?? "Restore"
              : confirmLabel ?? (variant === "bulk" ? "Delete all" : "Delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

