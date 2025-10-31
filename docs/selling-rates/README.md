# Selling Rates

The `selling_rates` table stores all sell-side pricing for products and their options. Rates are universal across inventory types, and we distinguish specific behaviours (extra nights, weekend uplifts, pass types, etc.) by combining the new `pricing_model` column with structured data in the existing `pricing_details` JSON field.

## Schema highlights

- `product_id` / `product_option_id` – link the rate to a product or a specific option.
- `pricing_model` *(new)* – short descriptor that classifies the pricing logic. Defaults to `"standard"`.
- `valid_from` / `valid_to` – enforce the active window (`CHECK(valid_to >= valid_from)` guards the range).
- `base_price`, `currency`, `markup_type`, `markup_amount`, `target_cost` – core numeric pricing inputs.
- `pricing_details` – JSON payload for model-specific knobs (length-of-stay bands, day masks, tier grids, etc.).
- `is_active`, `created_at`, `updated_at` – lifecycle control and auditing.

```sql
create table public.selling_rates (
  id uuid not null default gen_random_uuid (),
  organization_id uuid not null,
  product_id uuid not null,
  product_option_id uuid null,
  rate_name character varying(255) null,
  rate_basis character varying(50) not null,
  pricing_model character varying(50) not null default 'standard',
  valid_from date not null,
  valid_to date not null,
  base_price numeric(10, 2) not null,
  currency character varying(3) null default 'USD',
  markup_type character varying(20) null,
  markup_amount numeric(10, 2) null,
  pricing_details jsonb null,
  is_active boolean null default true,
  created_at timestamptz null default CURRENT_TIMESTAMP,
  updated_at timestamptz null default CURRENT_TIMESTAMP,
  target_cost numeric(10, 2) null,
  constraint selling_rates_pkey primary key (id),
  constraint selling_rates_product_option_id_fkey foreign key (product_option_id) references product_options(id),
  constraint check_selling_rate_dates check (valid_to >= valid_from)
);
```

## Working with `pricing_model`

Use short, predictable values so client code and analytics can branch cleanly. Recommended starting set:

| `pricing_model`      | Description                                                                                   | Example `pricing_details`                              |
|----------------------|-----------------------------------------------------------------------------------------------|--------------------------------------------------------|
| `standard`           | Default rate for the option; no special qualifiers                                            | `{}`                                                   |
| `extra_night`        | Applies to stays beyond the standard length                                                   | `{ "min_nights": 5 }`                                 |
| `weekend`            | Weekend uplift for accommodation or extras                                                    | `{ "valid_day_mask": { "friday": true, "saturday": true } }` |
| `per_person`         | Per-person pricing for experiences / services                                                 | `{ "pricing_tiers": [{ "min_pax": 1, "price": 120 }] }`      |
| `tiered`             | Tiered rate based on quantity or stay length                                                  | `{ "tiers": [{ "max": 3, "price": 100 }, { "price": 90 }] }` |
| `pass_type`          | Distinguishes ticket types (single day, multi day, VIP, etc.)                                 | `{ "access_level": ["vip_lounge"] }`                 |

You can extend the list as new scenarios emerge; just keep downstream consumers aware of the vocabulary.

## Best practices

- **One table for all inventory** – keep pricing central so financial reporting and channel distribution stay simple.
- **Multiple rows per option** – model extra-night, weekend, or promotional pricing as additional rows with distinct `pricing_model` values and date ranges.
- **Structured JSON** – stash complex logic (length-of-stay caps, people bands, blackout dates) under `pricing_details` using the same naming conventions defined in `docs/product-option-attributes`.
- **Server actions** – when you create/update rates, always validate payloads (Zod) and log via `createAuditLog`.
- **UI cues** – surface `pricing_model` in rate lists and forms so users understand which scenario a row controls.

With this pattern, we maintain a universal selling-rate model while still supporting inventory-specific pricing strategies such as accommodation extra nights, event pass variants, or experience tiers.

