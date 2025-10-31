import { z } from "zod"

export const contractStatusEnum = z.enum(["draft", "pending", "active", "expired", "cancelled"])

export const contractSchema = z.object({
  contract_number: z.string().min(1).max(100),
  contract_name: z.string().max(255).optional(),
  contract_type: z.string().max(50).optional(),
  supplier_id: z.string().uuid().optional().nullable(),
  event_id: z.string().uuid().optional().nullable(),
  valid_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a valid date (YYYY-MM-DD)"),
  valid_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a valid date (YYYY-MM-DD)"),
  currency: z.string().length(3).default("USD"),
  total_cost: z.number().positive().optional().nullable(),
  commission_rate: z.number().min(0).max(100).optional().nullable(),
  payment_terms: z.string().optional().nullable(),
  cancellation_policy: z.string().optional().nullable(),
  terms_and_conditions: z.string().optional().nullable(),
  contract_files: z.array(z.any()).default([]),
  notes: z.string().optional().nullable(),
  status: contractStatusEnum.default("draft"),
}).refine((data) => {
  if (data.valid_from && data.valid_to) {
    return new Date(data.valid_to) >= new Date(data.valid_from)
  }
  return true
}, {
  message: "Valid to date must be after or equal to valid from date",
  path: ["valid_to"],
})

export type ContractFormData = z.infer<typeof contractSchema>

