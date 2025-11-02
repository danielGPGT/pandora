# Recommended Approach: Occupancy-Based Pricing Model

## 🎯 Decision: Implement Native Occupancy-Based Pricing

After analyzing all approaches, **the occupancy-based pricing model is the best solution** for hotels.

---

## ✅ Why Occupancy-Based Model is Best

### 1. **User-Friendly** 🎨
- ✅ Matches hotel industry terminology exactly ("Single Occupancy Rate", "Double Occupancy Rate")
- ✅ Intuitive for hotel operators - they think this way naturally
- ✅ Clear UI fields with familiar labels
- ✅ No need to create/manage multiple rates for the same room

### 2. **Robust** 🛡️
- ✅ Single source of truth per rate
- ✅ Built-in validation (e.g., single ≥ double)
- ✅ Clear calculation logic for booking engine
- ✅ Handles edge cases (extra person charges)
- ✅ Type-safe TypeScript interfaces

### 3. **Efficient** ⚡
- ✅ One rate instead of 2-3 separate rates
- ✅ Easier to update (change pricing in one place)
- ✅ Simpler queries (one rate ID vs multiple)
- ✅ Less database records
- ✅ Faster rate lookup during booking

### 4. **Flexible** 🔄
- ✅ Works for simple hotels (single/double only)
- ✅ Works for complex hotels (with triple, extra person)
- ✅ Can combine with other models (seasonal + occupancy)
- ✅ Extensible for future needs

### 5. **Calculation-Friendly** 🧮
- ✅ Clear, unambiguous pricing logic
- ✅ Easy to implement in booking engine:
  ```typescript
  if (occupancy === 1) return single_occupancy_price
  if (occupancy === 2) return double_occupancy_price
  if (occupancy === 3 && triple_occupancy_price) return triple_occupancy_price
  if (occupancy > base_occupancy) {
    return double_occupancy_price + (extra_person_charge * (occupancy - base_occupancy))
  }
  ```

---

## 📋 Proposed Structure

### TypeScript Interface
```typescript
export interface OccupancyBasedPricingDetails {
  single_occupancy_price: number        // Rate for 1 person (required)
  double_occupancy_price: number        // Rate for 2 people (required)
  triple_occupancy_price?: number       // Optional rate for 3 people
  quadruple_occupancy_price?: number    // Optional rate for 4 people (for suites)
  extra_person_charge?: number          // Per person charge after base occupancy
  base_occupancy: 1 | 2                // Base occupancy for extra person calc (default: 2)
  
  // Advanced options (optional)
  child_rate?: number                   // Per child rate (if different from adult)
  infant_rate?: number                  // Per infant rate (typically 0 or free)
}
```

### Rate Configuration Example
```json
{
  "rate_basis": "per_night",
  "pricing_model": "occupancy_based",
  "base_price": 150,  // Fallback/default (matches double_occupancy)
  "target_cost": 100, // What you pay supplier
  "pricing_details": {
    "single_occupancy_price": 180,
    "double_occupancy_price": 150,
    "triple_occupancy_price": 220,
    "extra_person_charge": 40,
    "base_occupancy": 2
  }
}
```

### Calculation Logic
```typescript
function calculateOccupancyPrice(
  occupancy: number,
  details: OccupancyBasedPricingDetails
): number {
  const { 
    single_occupancy_price,
    double_occupancy_price,
    triple_occupancy_price,
    quadruple_occupancy_price,
    extra_person_charge,
    base_occupancy 
  } = details

  // Exact occupancy match
  if (occupancy === 1) return single_occupancy_price
  if (occupancy === 2) return double_occupancy_price
  if (occupancy === 3 && triple_occupancy_price) return triple_occupancy_price
  if (occupancy === 4 && quadruple_occupancy_price) return quadruple_occupancy_price

  // Extra person calculation
  if (occupancy > base_occupancy && extra_person_charge) {
    const basePrice = base_occupancy === 1 
      ? single_occupancy_price 
      : double_occupancy_price
    const extraPeople = occupancy - base_occupancy
    return basePrice + (extra_person_charge * extraPeople)
  }

  // Fallback to base price
  return base_occupancy === 1 ? single_occupancy_price : double_occupancy_price
}
```

---

## 🎨 UI/UX Design

### Form Fields (Following Occupancy Pattern)
```
┌─────────────────────────────────────────────┐
│ Occupancy Pricing Configuration             │
├─────────────────────────────────────────────┤
│                                             │
│ Single Occupancy Rate                       │
│ ┌─────────────────────────────────────────┐ │
│ │ $180.00 per night                       │ │
│ └─────────────────────────────────────────┘ │
│ Rate for 1 person                           │
│                                             │
│ Double Occupancy Rate                       │
│ ┌─────────────────────────────────────────┐ │
│ │ $150.00 per night                       │ │
│ └─────────────────────────────────────────┘ │
│ Rate for 2 people (standard)                │
│                                             │
│ Triple Occupancy Rate (Optional)            │
│ ┌─────────────────────────────────────────┐ │
│ │ $220.00 per night                       │ │
│ └─────────────────────────────────────────┘ │
│ Leave empty to use: Double + Extra Person   │
│                                             │
│ Extra Person Charge (Optional)              │
│ ┌─────────────────────────────────────────┐ │
│ │ $40.00 per person                       │ │
│ └─────────────────────────────────────────┘ │
│ Applied per person after base occupancy     │
│                                             │
│ Base Occupancy                              │
│ ○ 1 person  ● 2 people                      │
│ Used for extra person calculation           │
└─────────────────────────────────────────────┘
```

### Validation Rules
```typescript
// Auto-normalization (like occupancy pattern)
useEffect(() => {
  const { single, double, triple, extra } = pricingDetails
  
  // Ensure single >= double (single is premium)
  if (single < double) {
    setValue('pricing_details.single_occupancy_price', double)
  }
  
  // Ensure double <= triple (if triple set)
  if (triple && triple < double) {
    setValue('pricing_details.triple_occupancy_price', double)
  }
  
  // Ensure extra_person_charge is reasonable
  if (extra && extra < 0) {
    setValue('pricing_details.extra_person_charge', 0)
  }
}, [pricingDetails, setValue])
```

---

## 📊 Real-World Examples

### Example 1: Budget Hotel (Simple)
```json
{
  "rate_basis": "per_night",
  "pricing_model": "occupancy_based",
  "base_price": 80,
  "pricing_details": {
    "single_occupancy_price": 100,
    "double_occupancy_price": 80,
    "base_occupancy": 2
  }
}
```
**Result:**
- 1 person: $100/night
- 2 people: $80/night
- 3+ people: Not applicable (max 2)

### Example 2: Mid-Range Hotel (Standard)
```json
{
  "rate_basis": "per_night",
  "pricing_model": "occupancy_based",
  "base_price": 150,
  "target_cost": 100,
  "pricing_details": {
    "single_occupancy_price": 180,
    "double_occupancy_price": 150,
    "triple_occupancy_price": 220,
    "extra_person_charge": 40,
    "base_occupancy": 2
  }
}
```
**Result:**
- 1 person: $180/night
- 2 people: $150/night
- 3 people: $220/night (or $190 if using extra person: $150 + $40)
- 4 people: $260/night ($150 + $40×2) if room allows

### Example 3: Luxury Suite (Complex)
```json
{
  "rate_basis": "per_night",
  "pricing_model": "occupancy_based",
  "base_price": 500,
  "target_cost": 350,
  "pricing_details": {
    "single_occupancy_price": 600,
    "double_occupancy_price": 500,
    "triple_occupancy_price": 650,
    "quadruple_occupancy_price": 800,
    "extra_person_charge": 75,
    "base_occupancy": 2,
    "child_rate": 25,
    "infant_rate": 0
  }
}
```

---

## 🔄 Comparison with Alternatives

### vs. Multiple Rates Approach
| Factor | Multiple Rates | Occupancy-Based |
|--------|---------------|-----------------|
| **Setup** | 2-3 rates to create | 1 rate |
| **Updates** | Update each rate separately | Update once |
| **Rate Lookup** | Query multiple rates | Query single rate |
| **Clarity** | Good (separate rates) | Excellent (all in one place) |
| **Flexibility** | High (different dates) | High (can combine with seasonal) |
| **User Experience** | Medium | Excellent |

**Verdict:** Occupancy-based wins on efficiency and UX

### vs. Per-Person Tiers
| Factor | Per-Person Tiers | Occupancy-Based |
|--------|-----------------|-----------------|
| **Terminology** | "Per person" (confusing for hotels) | "Occupancy" (industry standard) |
| **Calculation** | Multiply by occupancy | Direct lookup |
| **Clarity** | Medium (shows per person) | Excellent (shows per night) |
| **Flexibility** | High | High |

**Verdict:** Occupancy-based wins on clarity and terminology

### vs. Tiered Pricing
| Factor | Tiered | Occupancy-Based |
|--------|--------|-----------------|
| **Purpose** | General quantity discounts | Hotel-specific occupancy |
| **UI** | Generic quantity fields | Specific occupancy fields |
| **Clarity** | Medium | Excellent |

**Verdict:** Occupancy-based wins on purpose-fit

---

## 🚀 Implementation Plan

### Phase 1: Core Implementation
1. ✅ Add `OCCUPANCY_BASED` to `PRICING_MODEL` enum
2. ✅ Create `OccupancyBasedPricingDetails` interface
3. ✅ Build UI component (following `AccommodationOptionFields` pattern)
4. ✅ Add validation and auto-normalization
5. ✅ Add to `PricingDetailsEditor`

### Phase 2: Enhancements
1. Add calculation helper functions
2. Add rate lookup utilities
3. Add booking engine integration helpers

### Phase 3: Advanced Features (Future)
1. Child/infant pricing
2. Age-based pricing
3. Meal plan add-ons

---

## 🎯 Final Recommendation

**Implement the Occupancy-Based Pricing Model**

**Why:**
- ✅ Most user-friendly for hotel operators
- ✅ Most efficient (one rate vs multiple)
- ✅ Most robust (built-in validation, clear logic)
- ✅ Industry-standard terminology
- ✅ Future-proof (extensible)

**When to Use:**
- ✅ Hotels with single/double occupancy pricing
- ✅ Any accommodation product
- ✅ When clarity and simplicity matter

**When NOT to Use:**
- ❌ Tours/activities (use per-person tiers instead)
- ❌ Very simple pricing (use standard per_night if same rate for all)
- ❌ Custom/one-off pricing scenarios

---

## 💡 Best of Both Worlds

**Hybrid Approach (Recommended):**

Keep **both** approaches available:

1. **Occupancy-Based Model** - For hotels (recommended)
   - Use when: You want simple, clear occupancy pricing
   
2. **Multiple Rates** - For flexibility (still available)
   - Use when: You need different date ranges per occupancy
   - Use when: You need different markups per occupancy level

**This gives users choice:**
- Simple hotels → Use occupancy-based (one rate)
- Complex hotels → Use multiple rates (more control)

Both work side-by-side! 🎯

