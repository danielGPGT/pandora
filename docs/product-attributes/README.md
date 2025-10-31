# Product Attribute Design

This document captures the working plan for modelling product attributes across the inventory module. It should evolve alongside the implementation of the product form and related Supabase schema changes.

## Goals

- Keep a single `products` table as the authoritative record (one row per hotel/event/etc.).
- Provide structured fields where it makes sense, without exploding the schema prematurely.
- Allow each product type to surface its specific metadata in the UI.
- Stay compatible with existing `product_options` rows.

## Current Tables

| Table | Purpose | Notes |
|-------|---------|-------|
| `product_types` | Defines the category (accommodation, transfer, event, …) | Static seed data. |
| `products` | Core record (name, code, type, org, generic fields) | Has `attributes` JSON for flexible metadata. |
| `product_options` | Variants/pricing slots for a product | Linked via `product_id`. |

## Proposed Attribute Strategy

1. **Base Fields** – Shared across all types (name, code, status, description, venue, tags, media, etc.). These stay as columns on `products`.
2. **Attributes JSON** – Continue to store type-specific values in `products.attributes`. We’ll formalise the shape using schemas per product type so UI/editor can validate and render meaningful controls.
3. **Promotion Path** – If a field proves universal/important (e.g. `star_rating` for accommodation), consider promoting it to a dedicated column or side table later on.

## Attribute Schema Drafts

Below is a first pass at the attribute keys we expect to collect for each product type. All keys live under `products.attributes` for now.

### Accommodation

- `star_rating` (number)
- `check_in_time` / `check_out_time` (string, HH:mm)
- `amenities` (array of strings)
- `highlights` (array of strings)
- `room_templates` *(optional helper array used when seeding product options; structure: { name, max_occupancy, bed_type, default_board, view, amenities })*

### Transfer

- `vehicle_type` (string)
- `capacity` (number)
- `pickup_points` / `dropoff_points` (array of strings or objects)
- `transfer_type` (string; e.g. "airport", "city_shuttle", "private_driver")
- `route_templates` *(optional helper array to seed product options; e.g. [{ name, distance_km, duration_minutes, default_vehicle }])*

### Event

- `ticket_type` (string; e.g. "general_admission", "vip", "hospitality")
- `delivery_days` (number of days before the event tickets are delivered)
- `features` (array of strings; e.g. `videowall`, `covered_seat`, `numbered_seat`)
- `notes` (optional string for additional ticket instructions)

### Meal

- `cuisine` (string)
- `meal_time` (string; e.g. "lunch", "dinner", "brunch")
- `service_style` (string; e.g. "buffet", "plated", "tasting")
- `dietary_notes` (array of strings; e.g. `["vegan", "gluten_free"]`)
- `beverages_included` (boolean)
- `inclusions` (array of strings; e.g. `welcome_cocktail`, `dessert`)
- `min_party_size` / `max_party_size` (numbers, optional)

### Experience

- `duration_minutes` (number)
- `difficulty` (enum; easy/medium/hard/expert)
- `highlights` (array of strings)
- `equipment_included` (array of strings)
- `equipment_required` (array of strings)
- `languages` (array of strings)
- `min_age` / `max_age` (numbers, optional)
- `min_party_size` / `max_party_size` (numbers, optional)
- `meeting_point` (string)
- `prerequisites` (array of strings; e.g. certifications)

### Equipment

- `equipment_type` (string)
- `brand`
- `model`
- `size` / `dimensions`
- `rental_terms`
- `safety_notes`
- `included_accessories`

### Service

- `service_type` (string; e.g. "guide", "cleaning", "concierge")
- `service_area` (string)
- `lead_time_hours` (number)
- `coverage_hours` (string)
- `included_items` (array of strings)
- `exclusions` (array of strings)
- `provider_credentials` (array of strings)

### Insurance

- `policy_type` (string; e.g. "travel_basic", "travel_premium")
- `coverage_limit` (number)
- `deductible` (number)
- `coverage_scope` (array of strings; e.g. `medical`, `luggage`, `cancellation`)
- `exclusions` (array of strings)
- `provider_terms_url` (string)

### Extra (catch-all)

- Rely on generic attributes editor; no fixed schema yet.
- Suggested keys when relevant:
  - `extra_type` (string; e.g. "gift", "addon", "merchandise")
  - `description`
  - `inclusions`
  - `delivery_method`

## Form Layout Concepts

- **Summary Section** – name, code, product type, status, description, tags.
- **Location / Venue** – venue fields, address, geo JSON (if desired).
- **Type-Specific Panel** – render inputs based on selected product type using the schema above.
- **Media & Attachments** – image uploads, documents.
- **Advanced Attributes** – JSON editor fallback for power users (mirrors raw `attributes`).

## Open Questions

- Do we need pricing fields on the product itself, or only on `product_options`?
- Should some product types (e.g. accommodation) have their own child tables sooner for reporting/performance?
- How will search/filtering interact with attributes stored as JSON (Supabase GIN indexes, computed columns, etc.)?
- Do we require localisation (multiple languages) for descriptions/highlights?

## Next Steps

1. Validate the attribute lists with stakeholders.
2. Decide the initial set of required vs optional fields per product type.
3. Implement the dynamic form (React schema -> Supabase payload) using this document as a reference.
4. Iterate and promote frequently-used keys into structured columns/tables as needed.

---

_Update this README as schemas or UI specs evolve._

