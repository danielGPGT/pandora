# Product Option Attribute Reference

This guide documents the recommended JSON structure to store structured attributes for each **product option**. Options are the sellable variants (e.g. individual room types, ticket tiers, service levels) that hang off a parent product. These attributes sit under the `attributes` object for each option and help downstream services (rates, availability, bookings) understand what the option represents.

Use these schemas as a starting point. They are intentionally flexible: you can add custom fields as needed, but try to follow the naming and nesting conventions below so that the UI and reporting layers can grow consistently.

## Core Option Fields

Every option can safely include these shared attributes:

```jsonc
{
  "code": "DLX-ROOM",
  "display_name": "Deluxe Double Room",
  "description": "32 sqm king room with balcony",
  "is_default": true,
  "capacity": {
    "adults": 2,
    "children": 1,
    "infants": 0
  },
  "effective_dates": {
    "start": "2025-04-01",
    "end": "2025-10-31"
  }
}
```

## Accommodation Options (Rooms / Units)

```jsonc
{
  "room_type": "Deluxe King",
  "bed_config": [
    { "type": "king", "quantity": 1 }
  ],
  "occupancy": {
    "min": 1,
    "standard": 2,
    "max": 3
  },
  "board_basis": "breakfast",
  "view": "sea",
  "amenities": ["balcony", "rain_shower", "espresso_machine"],
  "images": [
    "https://cdn.example.com/rooms/standard-room-01.jpg",
    "https://cdn.example.com/rooms/standard-room-02.jpg"
  ]
}
```

## Transfer Options (Vehicles / Routes)

```jsonc
{
  "vehicle_type": "SUV",
  "service_mode": "private",
  "route": {
    "origin": "DXB",
    "destination": "Downtown Dubai"
  },
  "max_passengers": 4,
  "max_baggage": 4,
  "duration_minutes": 45,
  "meet_and_greet": true,
  "accessible_vehicle": false,
  "operating_hours": {
    "start": "06:00",
    "end": "23:00"
  }
}
```

## Event Options (Tickets / Passes)

```jsonc
{
  "ticket_tier": "General Admission",
  "access_level": ["main_stage", "food_village"],
  "valid_days": ["2025-06-01", "2025-06-02"],
  "valid_day_mask": {
    "friday": true,
    "saturday": true,
    "sunday": false
  },
  "seat_section": "Block B",
  "row": "12",
  "seat_range": "45-48",
  "age_restriction": "adult",
  "delivery_method": "e_ticket",
  "perks": ["complimentary_drink"],
  "barcode_format": "QR"
}
```

## Meal Options (Dining Variants)

```jsonc
{
  "meal_period": "dinner",
  "menu_theme": "Chef's tasting",
  "courses": 5,
  "dietary_tags": ["vegetarian", "gluten_free_on_request"],
  "beverages_included": true,
  "min_party_size": 2,
  "max_party_size": 6,
  "seating_area": "terrace"
}
```

## Experience Options (Activities / Sessions)

```jsonc
{
  "session_type": "Sunrise kayak",
  "duration_minutes": 120,
  "group_size_min": 2,
  "group_size_max": 10,
  "skill_level": "beginner",
  "equipment_included": ["kayak", "life_jacket"],
  "equipment_required": ["waterproof_shoes"],
  "meeting_point": "Marina Dock A",
  "languages": ["en", "es"],
  "weather_cutoff": {
    "wind_speed_kts": 18
  }
}
```

## Equipment Options (Hire Items)

```jsonc
{
  "equipment_type": "Ski set",
  "brand": "Atomic",
  "model": "Redster X9",
  "size": "170cm",
  "condition": "premium",
  "rental_duration": "daily",
  "included_accessories": ["poles", "helmet"],
  "insurance_required": true,
  "security_deposit": 200
}
```

## Service Options (Professional Services / Packages)

```jsonc
{
  "service_variant": "On-site technician",
  "coverage_hours": "08:00-20:00",
  "response_time_minutes": 60,
  "staff_ratio": "1:50",
  "geo_zone": "Dubai Mall",
  "equipment_provided": ["toolkit", "radio"],
  "sla_notes": "Includes preventative checks every 4 hours"
}
```

## Insurance Options

```jsonc
{
  "coverage_tier": "Gold",
  "sum_insured": 100000,
  "deductible": 250,
  "coverage_scope": ["medical", "trip_cancellation", "baggage"],
  "exclusions": ["extreme_sports"],
  "eligible_travellers": "18-70",
  "policy_term_days": 14
}
```

## Extra Options (Add-ons / Enhancements)

```jsonc
{
  "extra_variant": "Fast-track immigration",
  "fulfilment_window_minutes": 120,
  "delivery_method": "meet_and_greet",
  "price_includes": ["escort", "priority_lane"],
  "stacking_rules": {
    "incompatible_with": ["vip_meet_and_greet"],
    "requires": []
  }
}
```

---

### Notes

- Pricing, taxes, and availability should remain in their dedicated tables (selling rates, supplier rates, allocations). Only descriptive metadata lives in `attributes`.
- When adding new fields, prefer lower camelCase keys and nested objects for grouped data (e.g. `occupancy.adults`).
- Keep option-specific metadata lightweight—large documents should move to dedicated tables if they grow beyond a few kilobytes.

