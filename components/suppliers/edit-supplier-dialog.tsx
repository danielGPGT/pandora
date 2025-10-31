"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { AppDialog } from "@/components/ui/app-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { updateSupplier } from "@/lib/actions/suppliers"
import { supplierSchema, type SupplierFormData } from "@/lib/suppliers/schema"
import { generateSupplierCode } from "@/lib/suppliers/utils"
import { toast } from "sonner"
import { Loader2, Wand2 } from "lucide-react"
import type { Supplier } from "@/components/reuseable/data-table/data-table-08-suppliers"

type EditSupplierDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  supplier: Supplier | null
}

export function EditSupplierDialog({ open, onOpenChange, supplier }: EditSupplierDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: "",
      code: "",
      supplier_type: "",
      email: "",
      phone: "",
      address_line1: "",
      city: "",
      country: "",
      default_currency: "USD",
      is_active: true,
      notes: "",
    },
  })

  // Reset form when supplier changes
  useEffect(() => {
    if (supplier && open) {
      form.reset({
        name: supplier.name || "",
        code: supplier.code || "",
        supplier_type: supplier.supplier_type || "",
        email: supplier.email || "",
        phone: supplier.phone || "",
        address_line1: (supplier as any).address_line1 || "",
        city: (supplier as any).city || "",
        country: supplier.country || "",
        default_currency: (supplier as any).default_currency || "USD",
        is_active: supplier.is_active ?? true,
        notes: (supplier as any).notes || "",
      })
    }
  }, [supplier, open, form])

  const handleAutoCode = () => {
    const name = form.getValues("name")
    if (!name) return toast.error("Enter a name first")
    form.setValue("code", generateSupplierCode(name))
  }

  const onSubmit = async (data: SupplierFormData) => {
    if (!supplier) return

    setIsSubmitting(true)
    try {
      const name = (data.name ?? "").trim()
      let code = (data.code ?? "").trim()
      if (!code && name) {
        code = generateSupplierCode(name)
      }
      const payload: SupplierFormData = {
        ...data,
        name,
        code: code.toUpperCase(),
        default_currency: (data.default_currency || "USD").toUpperCase(),
        country: (data.country || "").toUpperCase().slice(0, 2) as any,
      }

      await updateSupplier(supplier.id, payload)
      toast.success("Supplier updated", { description: name })
      form.reset()
      onOpenChange(false)
    } catch (err) {
      toast.error("Failed to update supplier", { description: err instanceof Error ? err.message : undefined })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!supplier) return null

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Supplier"
      description={`Update supplier: ${supplier.name}`}
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="edit-supplier-form" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Changes
          </Button>
        </div>
      }
    >
      <form id="edit-supplier-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <h3 className="font-medium">Basic Information</h3>
          <div className="space-y-1.5">
            <Label className="block" htmlFor="edit-name">
              Supplier Name *
            </Label>
            <Input id="edit-name" {...form.register("name")} placeholder="e.g., Hilton Hotels" />
            {form.formState.errors.name && <p className="text-xs text-destructive mt-1">{form.formState.errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="block" htmlFor="edit-code">
              Supplier Code *
            </Label>
            <div className="flex gap-2">
              <Input id="edit-code" {...form.register("code")} placeholder="e.g., HILTON-H" className="flex-1" />
              <Button type="button" variant="outline" size="icon" onClick={handleAutoCode} title="Auto-generate code">
                <Wand2 className="h-4 w-4" />
              </Button>
            </div>
            {form.formState.errors.code && <p className="text-xs text-destructive mt-1">{form.formState.errors.code.message}</p>}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="block" htmlFor="edit-supplier_type">
                Type
              </Label>
              <Input id="edit-supplier_type" {...form.register("supplier_type")} placeholder="e.g., Hotel, Transport" />
            </div>
            <div className="space-y-1.5">
              <Label className="block" htmlFor="edit-default_currency">
                Default Currency *
              </Label>
              <Input id="edit-default_currency" {...form.register("default_currency")} placeholder="USD" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label className="block" htmlFor="edit-is_active">
              Active Status
            </Label>
            <Switch id="edit-is_active" checked={form.watch("is_active")} onCheckedChange={(c) => form.setValue("is_active", c)} />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-medium">Contact Details</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="block" htmlFor="edit-email">
                Email
              </Label>
              <Input id="edit-email" type="email" {...form.register("email")} placeholder="contact@supplier.com" />
              {form.formState.errors.email && <p className="text-xs text-destructive mt-1">{form.formState.errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="block" htmlFor="edit-phone">
                Phone
              </Label>
              <Input id="edit-phone" {...form.register("phone")} placeholder="+1 (555) 123-4567" />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-medium">Address</h3>
          <div className="space-y-1.5">
            <Label className="block" htmlFor="edit-address_line1">
              Address Line 1
            </Label>
            <Input id="edit-address_line1" {...form.register("address_line1")} placeholder="123 Main Street" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="block" htmlFor="edit-city">
                City
              </Label>
              <Input id="edit-city" {...form.register("city")} placeholder="New York" />
            </div>
            <div className="space-y-1.5">
              <Label className="block" htmlFor="edit-country">
                Country Code
              </Label>
              <Input id="edit-country" {...form.register("country")} placeholder="US" maxLength={2} />
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="block" htmlFor="edit-notes">
            Notes
          </Label>
          <Textarea id="edit-notes" {...form.register("notes")} rows={4} placeholder="Additional notes about this supplier..." />
        </div>
      </form>
    </AppDialog>
  )
}

