import { z } from "zod"

export const supplierSchema = z.object({
  name: z.string().min(3).max(255),
  code: z.string().min(2).max(50).regex(/^[A-Z0-9_-]+$/, "Code must be uppercase alphanumeric"),
  supplier_type: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  contact_info: z
    .array(
      z.object({
        name: z.string(),
        email: z.string().email().optional().or(z.literal("")),
        phone: z.string().optional(),
        position: z.string().optional(),
      })
    )
    .optional(),
  address_line1: z.string().optional(),
  city: z.string().optional(),
  country: z.string().length(2).optional(),
  default_currency: z.string().length(3).default("USD"),
  is_active: z.boolean().default(true),
  notes: z.string().optional(),
})

export type SupplierFormData = z.infer<typeof supplierSchema>


