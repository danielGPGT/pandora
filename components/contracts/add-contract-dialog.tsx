"use client"

import * as React from "react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { AppDialog } from "@/components/ui/app-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createContract } from "@/lib/actions/contracts"
import { contractSchema, type ContractFormData } from "@/lib/contracts/schema"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useRouter } from "next/navigation"

type AddContractDialogProps = { open: boolean; onOpenChange: (open: boolean) => void }

export function AddContractDialog({ open, onOpenChange }: AddContractDialogProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<ContractFormData>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      contract_number: "",
      contract_name: "",
      contract_type: "on_request",
      supplier_id: undefined,
      event_id: undefined,
      valid_from: "",
      valid_to: "",
      currency: "USD",
      total_cost: undefined,
      commission_rate: undefined,
      payment_terms: "",
      cancellation_policy: "",
      terms_and_conditions: "",
      notes: "",
      status: "draft",
    },
  })

  const onSubmit = async (data: ContractFormData) => {
    setIsSubmitting(true)
    try {
      await createContract(data)
      toast.success("Contract created successfully")
      form.reset()
      onOpenChange(false)
      router.refresh()
    } catch (error) {
      toast.error("Failed to create contract", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AppDialog open={open} onOpenChange={onOpenChange} size="lg">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Add Contract</h2>
          <p className="text-sm text-muted-foreground">Create a new contract in your organization</p>
        </div>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto px-1">
          {/* Basic Information */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm">Basic Information</h3>
            
            <div className="space-y-2">
              <Label htmlFor="contract_number">Contract Number *</Label>
              <Input
                id="contract_number"
                {...form.register("contract_number")}
                placeholder="e.g., CNT-2025-001"
              />
              {form.formState.errors.contract_number && (
                <p className="text-sm text-destructive">{form.formState.errors.contract_number.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contract_name">Contract Name</Label>
              <Input
                id="contract_name"
                {...form.register("contract_name")}
                placeholder="e.g., Hotel Booking Agreement"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contract_type">Contract Type</Label>
                <Select
                  value={form.watch("contract_type") || "on_request"}
                  onValueChange={(value) => form.setValue("contract_type", value)}
                >
                  <SelectTrigger id="contract_type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="on_request">On Request</SelectItem>
                    <SelectItem value="allocation">Allocation</SelectItem>
                    <SelectItem value="free_sale">Free Sale</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={form.watch("status") || "draft"}
                  onValueChange={(value) => form.setValue("status", value as ContractFormData["status"])}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Validity Period */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm">Validity Period</h3>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="valid_from">Valid From *</Label>
                <Input
                  id="valid_from"
                  type="date"
                  {...form.register("valid_from")}
                />
                {form.formState.errors.valid_from && (
                  <p className="text-sm text-destructive">{form.formState.errors.valid_from.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="valid_to">Valid To *</Label>
                <Input
                  id="valid_to"
                  type="date"
                  {...form.register("valid_to")}
                />
                {form.formState.errors.valid_to && (
                  <p className="text-sm text-destructive">{form.formState.errors.valid_to.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Financial Information */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm">Financial Information</h3>
            
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Input
                  id="currency"
                  {...form.register("currency")}
                  placeholder="USD"
                  maxLength={3}
                  className="uppercase"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="total_cost">Total Cost</Label>
                <Input
                  id="total_cost"
                  type="number"
                  step="0.01"
                  {...form.register("total_cost", { valueAsNumber: true })}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="commission_rate">Commission Rate (%)</Label>
                <Input
                  id="commission_rate"
                  type="number"
                  step="0.01"
                  {...form.register("commission_rate", { valueAsNumber: true })}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Terms & Conditions */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm">Terms & Conditions</h3>
            
            <div className="space-y-2">
              <Label htmlFor="payment_terms">Payment Terms</Label>
              <Textarea
                id="payment_terms"
                {...form.register("payment_terms")}
                placeholder="Payment terms and conditions..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cancellation_policy">Cancellation Policy</Label>
              <Textarea
                id="cancellation_policy"
                {...form.register("cancellation_policy")}
                placeholder="Cancellation policy details..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="terms_and_conditions">Terms & Conditions</Label>
              <Textarea
                id="terms_and_conditions"
                {...form.register("terms_and_conditions")}
                placeholder="Additional terms and conditions..."
                rows={3}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...form.register("notes")}
              placeholder="Additional notes..."
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Contract
          </Button>
        </div>
      </form>
    </AppDialog>
  )
}

