# Selling Rates & Hotel Occupancy Pricing - Detailed Analysis

## 🎯 Current Capabilities

### ✅ What the System Currently Handles

#### 1. **Product Options Have Occupancy Attributes**
```jsonc
{
  "occupancy": {
    "min": 1,      // Minimum 1 person
    "standard": 2, // Standard 2 people (double occupancy)
    "max": 3       // Maximum 3 people
  }
}
```

This defines the **room capacity**, not the pricing structure.

#### 2. **Selling Rates - Room-Based Pricing (Per Night)**
**Best for:** Standard hotel room pricing where the room rate is fixed regardless of occupancy (up to capacity).

**Example Setup:**
```
Rate Basis: Per Night
Pricing Model: Standard
Base Price: $150/night
Target Cost: $100/night

✅ Works for: Room rate for 2 people (double occupancy standard)
✅ Works for: Same rate applies whether 1 or 2 people stay
❌ Doesn't handle: Different rate for single vs double occupancy
❌ Doesn't handle: Extra person charges automatically
```

**Use Case:**
- European hotels: Room rate is the same whether 1 or 2 people
- Simple pricing: One price per room per night

#### 3. **Selling Rates - Per Person Pricing with Tiers**
**Best for:** Tour/activity pricing or hotels with per-person charges.

**Example Setup:**
```
Rate Basis: Per Person
Pricing Model: Per Person
Base Price: $75/person
Pricing Details: {
  pricing_tiers: [
    { min_pax: 1, max_pax: 2, price: 75 },
    { min_pax: 3, max_pax: undefined, price: 60 }
  ]
}

✅ Works for: Different pricing based on group size
✅ Works for: Group discounts
❌ Not ideal for: Traditional hotel single/double occupancy model
```

**Use Case:**
- Tours: Different per-person rates for different group sizes
- Activities: Group discounts

---

## 🏨 Hotel Occupancy Scenarios - What Hotels Need

### Scenario 1: Standard Hotel (Single vs Double Occupancy)

**Common Pattern:**
```
Room: Deluxe Double (max 2 people)

Rate 1: Single Occupancy
- 1 person = $180/night
- Higher per person because they're using the whole room

Rate 2: Double Occupancy  
- 2 people = $150/night (base rate)
- Standard rate for 2 people

Rate 3: Extra Person (if room allows 3+)
- 3rd person = +$40/person/night
```

**Current System:** ❌ Not directly supported with a clear single/double model

### Scenario 2: Per Room Rate (European Style)

**Common Pattern:**
```
Room: Standard Double (max 2 people)

Rate: Room Rate
- 1 person = $150/night (same rate)
- 2 people = $150/night (same rate)
```

**Current System:** ✅ Fully supported with `rate_basis: "per_night"`

### Scenario 3: Per Person with Base Occupancy

**Common Pattern:**
```
Room: Deluxe Suite (max 4 people)

Rate: Per Person
- Base price for 2 people included: $200/night
- 3rd person: +$50/night
- 4th person: +$50/night
```

**Current System:** ⚠️ Partially supported with per-person tiers, but not intuitive

---

## 💡 Current Workarounds (How to Do It Now)

### Workaround 1: Multiple Rates for Different Occupancy Levels

**Create separate rates for each occupancy scenario:**

```
Rate 1: "Single Occupancy Rate"
- Rate Basis: Per Night
- Base Price: $180/night
- Valid for: Occupancy = 1 person

Rate 2: "Double Occupancy Rate"  
- Rate Basis: Per Night
- Base Price: $150/night
- Valid for: Occupancy = 2 people

Rate 3: "Extra Person Charge"
- Rate Basis: Per Person
- Base Price: $40/person
- Valid for: Occupancy = 3+ people
```

**Pros:**
- ✅ Clear separation
- ✅ Different valid date ranges possible
- ✅ Different markup/profit margins per scenario

**Cons:**
- ❌ Multiple rates to manage
- ❌ No automatic calculation
- ❌ Manual selection needed during booking

### Workaround 2: Per Person with Tiers

**Use the per-person pricing model:**

```
Rate Basis: Per Person
Pricing Model: Per Person
Base Price: $75/person (not used, tiers override)

Pricing Details: {
  pricing_tiers: [
    { min_pax: 1, max_pax: 1, price: 180 },  // Single occupancy
    { min_pax: 2, max_pax: 2, price: 75 },   // Double occupancy (per person)
    { min_pax: 3, max_pax: undefined, price: 40 } // Extra person
  ]
}
```

**Pros:**
- ✅ Single rate to manage
- ✅ Automatic tier selection
- ✅ Flexible for any occupancy level

**Cons:**
- ❌ Not intuitive (double occupancy shows as $75/person = $150 total)
- ❌ Rate basis says "per person" but room pricing is typically "per night"
- ❌ Base price field becomes confusing

### Workaround 3: Tiered Pricing with "People" Quantity Type

**Use tiered pricing model:**

```
Rate Basis: Per Night
Pricing Model: Tiered
Base Price: $150/night

Pricing Details: {
  quantity_type: "people",
  tiers: [
    { min_quantity: 1, max_quantity: 1, price: 180, description: "Single occupancy" },
    { min_quantity: 2, max_quantity: 2, price: 150, description: "Double occupancy" },
    { min_quantity: 3, max_quantity: undefined, price: 190, description: "Triple occupancy" }
  ]
}
```

**Pros:**
- ✅ Rate basis is "per night" (correct for hotels)
- ✅ Single rate
- ✅ Clear descriptions

**Cons:**
- ❌ Not the primary use case for tiered pricing
- ❌ Extra person calculation requires separate tier entries (can't do "base + extra")

---

## 🎯 Recommended Solution: Add Occupancy-Based Pricing Model

### New Pricing Model: `occupancy_based`

**Purpose:** Explicitly designed for hotel room occupancy pricing

**Structure:**
```typescript
export interface OccupancyBasedPricingDetails {
  single_occupancy_price: number        // Rate for 1 person
  double_occupancy_price: number        // Rate for 2 people (standard)
  triple_occupancy_price?: number       // Optional rate for 3 people
  extra_person_charge?: number          // Per person charge after base occupancy
  base_occupancy: 1 | 2                // Which occupancy is the "base" for extra person calc
}
```

**Example Configuration:**
```json
{
  "rate_basis": "per_night",
  "pricing_model": "occupancy_based",
  "base_price": 150,  // Default/fallback (double occupancy)
  "pricing_details": {
    "single_occupancy_price": 180,
    "double_occupancy_price": 150,
    "triple_occupancy_price": 220,
    "extra_person_charge": 40,
    "base_occupancy": 2
  }
}
```

**How It Works:**
- 1 person books → `single_occupancy_price` ($180)
- 2 people book → `double_occupancy_price` ($150)
- 3 people book → Option A: `triple_occupancy_price` ($220) OR Option B: `double_occupancy_price` + `extra_person_charge` ($150 + $40 = $190)

**UI Benefits:**
- Clear labels: "Single Occupancy Rate", "Double Occupancy Rate"
- Intuitive for hotel operators
- Matches industry terminology

---

## 📊 Comparison: Current vs Proposed

### Current System (Workarounds)

| Occupancy | Current Method | Complexity | Clarity |
|-----------|---------------|------------|---------|
| Single | Separate rate OR Tiered pricing | Medium | Medium |
| Double | Separate rate OR Base price | Medium | High |
| Triple+ | Separate rate OR Tiers | High | Low |

### Proposed System (Occupancy-Based Model)

| Occupancy | Method | Complexity | Clarity |
|-----------|--------|------------|---------|
| Single | `single_occupancy_price` | Low | High |
| Double | `double_occupancy_price` | Low | High |
| Triple+ | `triple_occupancy_price` OR `base + extra` | Low | High |

---

## 🚀 Implementation Recommendations

### Phase 1: Document Current Workarounds ✅
- ✅ Create this analysis document
- ✅ Provide clear examples for hotel operators

### Phase 2: Enhance Per-Person Tiers (Quick Win)
- Add better UI labels for hotel occupancy use case
- Add helper text: "For hotels: Set single occupancy as tier 1, double as tier 2"
- Improve validation

### Phase 3: Add Occupancy-Based Model (Full Solution)
- Add `occupancy_based` to `PRICING_MODEL` enum
- Create `OccupancyBasedPricingDetails` interface
- Build UI component following occupancy pattern (like `AccommodationOptionFields`)
- Add to `PricingDetailsEditor`

---

## 💭 Real-World Examples

### Example 1: Budget Hotel (Simple)

**Current System - Best Approach: Per Night Rate**
```
Rate Basis: Per Night
Pricing Model: Standard
Base Price: $80/night

✅ Same rate whether 1 or 2 people stay
✅ Simple and clear
```

### Example 2: Mid-Range Hotel (Single/Double)

**Current System - Best Approach: Multiple Rates**
```
Rate 1: Single Occupancy
- Rate Basis: Per Night
- Base Price: $120/night

Rate 2: Double Occupancy
- Rate Basis: Per Night  
- Base Price: $100/night

✅ Clear separation
✅ Easy to update independently
```

**Future - Best Approach: Occupancy-Based Model**
```
Rate Basis: Per Night
Pricing Model: Occupancy Based
Single Occupancy: $120/night
Double Occupancy: $100/night

✅ Single rate to manage
✅ Industry-standard terminology
```

### Example 3: Luxury Hotel (Complex)

**Current System - Best Approach: Tiered with People**
```
Rate Basis: Per Night
Pricing Model: Tiered
Quantity Type: People
Tiers:
  - 1 person: $400/night
  - 2 people: $350/night
  - 3 people: $450/night
  - 4 people: $550/night

⚠️ Works but not ideal
```

**Future - Best Approach: Occupancy-Based Model**
```
Rate Basis: Per Night
Pricing Model: Occupancy Based
Single: $400/night
Double: $350/night
Triple: $450/night
Extra Person: $50/person

✅ More intuitive
✅ Clearer for hotel staff
```

---

## 📋 Summary

### What Works Now ✅
1. **Per Night rates** - Perfect for European-style room pricing
2. **Multiple rates** - Can create separate rates for each occupancy
3. **Per Person tiers** - Can model occupancy pricing with workarounds
4. **Tiered pricing** - Can use quantity_type: "people"

### What's Missing ⚠️
1. **Native occupancy-based pricing model** - No dedicated hotel occupancy structure
2. **Clear UI for occupancy** - Current UI doesn't explicitly show "single/double occupancy"
3. **Automatic calculation** - No built-in logic for "base occupancy + extra person"

### Recommendation 🎯

**Short Term:** Use multiple `per_night` rates for single/double occupancy. This is clear and works well.

**Medium Term:** Enhance per-person tier UI to be more hotel-friendly with better labels.

**Long Term:** Add `occupancy_based` pricing model for native hotel occupancy support.

---

## 🔄 Next Steps

Would you like me to:
1. **Implement the occupancy-based pricing model?** (Full solution)
2. **Enhance the current per-person tier UI?** (Quick improvement)
3. **Create a detailed hotel occupancy rate guide?** (Documentation)
4. **Something else?**

Let me know what makes most sense for your use case! 🚀

