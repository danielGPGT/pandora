"use client"

import { useEffect, useMemo, useTransition } from "react"
import { FormProvider, useForm, type SubmitHandler, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { createProductOption, updateProductOption, type ProductOptionInput } from "@/lib/actions/product-options"
import { useRouter } from "next/navigation"
import type { ProductDetailsResult } from "@/lib/data/products"
import { ProductOptionAttributeEditor } from "@/components/products/product-option-attribute-editor"

const formSchema = z.object({
  option_name: z.string().min(1, "Option name is required"),
  option_code: z.string().min(1, "Option code is required"),
  description: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
  attributes: z.any().optional(),
})

type FormValues = z.infer<typeof formSchema>

type ProductOptionDialogProps = {
  mode: "create" | "edit"
  open: boolean
  onOpenChange: (open: boolean) => void
  productId: string
  option?: ProductDetailsResult["options"][number]
  productTypeKey?: string
}

export function ProductOptionDialog({ mode, open, onOpenChange, productId, option, productTypeKey }: ProductOptionDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const defaultValues = useMemo<FormValues>(
    () => ({
      option_name: option?.option_name ?? "",
      option_code: option?.option_code ?? "",
      description: option?.description ?? "",
      is_active: option?.is_active ?? true,
      attributes: option?.attributes ?? {},
    }),
    [option]
  )

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as Resolver<FormValues>,
    defaultValues,
  })

  useEffect(() => {
    if (open) {
      form.reset(defaultValues)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultValues, open])

  const title = mode === "create" ? "New option" : "Edit option"
  const description =
    mode === "create"
      ? "Define a sellable variant for this product."
      : "Update the details for this product option."

  const onSubmit: SubmitHandler<FormValues> = (values) => {
    startTransition(async () => {
      try {
        const payload: ProductOptionInput = {
          option_name: values.option_name.trim(),
          option_code: values.option_code.trim().toUpperCase(),
          description: values.description?.trim() || null,
          is_active: values.is_active,
          attributes: values.attributes ?? {},
        }

        if (mode === "create") {
          await createProductOption(productId, payload)
          toast.success("Option created")
        } else if (option) {
          await updateProductOption(option.id, payload)
          toast.success("Option updated")
        }

        router.refresh()
        onOpenChange(false)
      } catch (error) {
        toast.error("Failed to save option", {
          description: error instanceof Error ? error.message : undefined,
        })
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <FormProvider {...form}>
          <form id="product-option-form" className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-3">
              <div className="grid gap-2">
                <Label htmlFor="option_name">Option name</Label>
                <Input id="option_name" placeholder="Deluxe Room" {...form.register("option_name")} />
                {form.formState.errors.option_name ? (
                  <p className="text-xs text-destructive">{form.formState.errors.option_name.message}</p>
                ) : null}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="option_code">Option code</Label>
                <Input id="option_code" placeholder="DLX-ROOM" {...form.register("option_code")} />
                {form.formState.errors.option_code ? (
                  <p className="text-xs text-destructive">{form.formState.errors.option_code.message}</p>
                ) : null}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" rows={3} placeholder="Summary or inclusions" {...form.register("description")} />
              </div>

              <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Active</Label>
                  <p className="text-xs text-muted-foreground">Inactive options stay hidden from selling flows.</p>
                </div>
                <Switch checked={form.watch("is_active") ?? true} onCheckedChange={(checked) => form.setValue("is_active", checked)} />
              </div>
            </div>

            <ProductOptionAttributeEditor productTypeKey={productTypeKey} />
          </form>
        </FormProvider>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" form="product-option-form" disabled={isPending}>
            {isPending ? "Saving..." : mode === "create" ? "Create option" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

