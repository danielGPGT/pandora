# How Base Price, Markup, and Target Cost Work Together

## 🎯 The Three Components

1. **Base Price** = Your base selling price
2. **Markup** = Additional fee added on top (optional)
3. **Target Cost** = What you pay the supplier

---

## 💰 Price Calculation Flow

### Scenario 1: Simple Pricing (No Markup)
```
Base Price: $150/night
Target Cost: $100/night
Markup: None

Final Price to Customer: $150/night
Your Profit: $150 - $100 = $50/night (33% margin)
```

### Scenario 2: With Percentage Markup
```
Base Price: $150/night
Target Cost: $100/night
Markup: 10% (percentage)

Calculation:
Markup Amount = $150 × 10% = $15
Final Price to Customer = $150 + $15 = $165/night

Your Profit: $165 - $100 = $65/night (39% margin)
```

### Scenario 3: With Fixed Markup
```
Base Price: $150/night
Target Cost: $100/night
Markup: $20 (fixed amount)

Final Price to Customer = $150 + $20 = $170/night

Your Profit: $170 - $100 = $70/night (41% margin)
```

---

## 📊 Visual Flow Diagram

```
┌─────────────────────────────────────────────┐
│         SUPPLIER (Hotel/Tour Operator)      │
│                                             │
│         Target Cost: $100/night             │
│              ↓                              │
└─────────────────────────────────────────────┘
                    │
                    │ You pay this
                    ▼
┌─────────────────────────────────────────────┐
│            YOUR SYSTEM                      │
│                                             │
│  Base Price: $150/night  ───────┐           │
│                                  │           │
│  Markup: 10% ($15)      ────────┼─────┐     │
│                                  │     │     │
└──────────────────────────────────┼─────┼─────┘
                                    │     │
                                    ▼     ▼
                        ┌───────────────────────────┐
                        │  Final Selling Price:    │
                        │  $150 + $15 = $165/night │
                        └───────────────────────────┘
                                    │
                                    │ Customer pays this
                                    ▼
                        ┌───────────────────────────┐
                        │      YOUR PROFIT:         │
                        │  $165 - $100 = $65/night │
                        │  (39% profit margin)     │
                        └───────────────────────────┘
```

---

## 🔄 The Complete Formula

### Step-by-Step Calculation

1. **Start with Base Price** (what you set)
   ```
   Base Price = $150
   ```

2. **Apply Markup** (if set)
   - Percentage: `Markup Amount = Base Price × (Markup % / 100)`
   - Fixed: `Markup Amount = Fixed Amount`
   ```
   Markup = 10% → $150 × 0.10 = $15
   OR
   Markup = $20 (fixed)
   ```

3. **Calculate Final Selling Price**
   ```
   Final Price = Base Price + Markup Amount
   Final Price = $150 + $15 = $165
   ```

4. **Calculate Profit** (if target cost is set)
   ```
   Profit = Final Price - Target Cost
   Profit = $165 - $100 = $65
   
   Profit Margin % = (Profit / Final Price) × 100
   Profit Margin % = ($65 / $165) × 100 = 39.4%
   ```

---

## 💡 Real-World Use Cases

### Use Case 1: Direct Sales (No Markup)
**Scenario:** Selling directly to customers on your website

```
Base Price: $200/person
Target Cost: $150/person
Markup: None

Customer pays: $200/person
Your profit: $50/person (25% margin)
```

**Why no markup?** You're selling directly, so no channel fees.

---

### Use Case 2: Third-Party Booking Platform
**Scenario:** Selling through Booking.com, Expedia, etc.

```
Base Price: $200/night
Target Cost: $140/night
Markup: 15% (platform commission)

Calculation:
Markup = $200 × 15% = $30
Final Price = $200 + $30 = $230/night

Customer pays: $230/night
Platform keeps: $30 (commission)
You receive: $200
Your profit: $200 - $140 = $60/night (30% margin on $200)
```

**Why markup?** To cover platform commission while maintaining your base price profit.

---

### Use Case 3: Service Fee
**Scenario:** Adding a service/booking fee

```
Base Price: $100/tour
Target Cost: $70/tour
Markup: $10 (fixed service fee)

Final Price = $100 + $10 = $110/tour

Customer pays: $110/tour
Your profit: $110 - $70 = $40/tour (36% margin)
```

**Why fixed markup?** Flat service fee regardless of tour price.

---

### Use Case 4: Channel-Specific Pricing
**Scenario:** Different markups for different channels

**Channel A (Direct Website):**
```
Base Price: $150/night
Target Cost: $100/night
Markup: None
Final Price: $150/night
Profit: $50/night
```

**Channel B (OTA - Online Travel Agency):**
```
Base Price: $150/night
Target Cost: $100/night
Markup: 20% (OTA commission)
Final Price: $150 + $30 = $180/night
Your profit: $150 - $100 = $50/night (OTA keeps $30)
```

**Note:** You might create separate rates for each channel with different markups!

---

## 🤔 Common Questions

### Q: Does markup increase my profit?
**A:** **No, markup does NOT increase your profit from base price.**

- Markup is added to the customer's final price
- Your revenue from base price stays the same
- Markup typically goes to cover fees (platform, channel, service)

**Example:**
```
Base Price: $150
Target Cost: $100
Markup: 10% ($15)

Without markup:
- Customer pays: $150
- Your profit: $150 - $100 = $50

With markup:
- Customer pays: $165
- You still receive: $150 (base price)
- Platform/service keeps: $15 (markup)
- Your profit: $150 - $100 = $50 (same!)
```

**So why use markup?** To pass fees to customers while maintaining your base price profit margin.

---

### Q: Should I include markup in base price or separate?
**A:** **Separate is better** because:

1. **Flexibility:** Same base price, different markups per channel
2. **Transparency:** See your core profit vs. fees separately
3. **Reporting:** Track base price revenue vs. markup separately

**Example:**
```
Option A (Markup included in base):
Base Price: $165 (includes $15 markup)
Target Cost: $100
Profit: $65

Problem: If you sell direct (no markup), you'd charge $165
But you really only need $150 to make $50 profit!
```

```
Option B (Markup separate):
Base Price: $150
Markup: $15 (when sold through platform)
Target Cost: $100
Profit: $50

Better: Direct sales = $150, Platform sales = $165
Both maintain your $50 base profit!
```

---

### Q: When should I use percentage vs. fixed markup?
**A:** 

**Percentage Markup** - Use when:
- Fee is a percentage (e.g., 15% commission)
- Fee scales with price
- Platform takes a cut

**Fixed Markup** - Use when:
- Service fee is flat (e.g., $10 booking fee)
- Processing fee (e.g., $5 per transaction)
- Fixed administrative charge

---

### Q: How do I calculate profitability?
**A:** Use Target Cost for true profitability tracking:

```
Option 1: Track Base Price Profitability
Base Price: $150
Target Cost: $100
Base Profit: $50 (33% margin)

Option 2: Track Final Price Profitability (if markup goes to you)
Final Price: $165 (with $15 markup)
Target Cost: $100
Final Profit: $65 (39% margin)
```

**Current System:** Tracks base price profitability (recommended)

---

## 📋 Best Practices

### 1. Set Base Price Based on Target Cost + Desired Profit
```
Target Cost: $100
Desired Profit: $50 (33% margin)
Base Price: $150
```

### 2. Use Markup for Fees, Not Additional Profit
```
❌ Bad: Base Price $100, Markup 50% → "To make more profit"
✅ Good: Base Price $100, Markup 15% → "To cover platform commission"
```

### 3. Track Both Separately
- Base Price = Your core business price
- Markup = Channel/fee adjustment
- Target Cost = True cost tracking

### 4. Different Rates for Different Channels
```
Rate 1: "Direct Sales"
- Base Price: $150
- Markup: None
- Target Cost: $100

Rate 2: "OTA Channel"
- Base Price: $150
- Markup: 15%
- Target Cost: $100
```

This way you maintain consistent base pricing across channels!

---

## 🎯 Summary

| Field | Purpose | Example | Affects Customer Price? |
|-------|---------|---------|-------------------------|
| **Base Price** | Your core selling price | $150/night | ✅ Yes |
| **Markup** | Additional fee (channel, service) | 10% or $15 | ✅ Yes (added to base) |
| **Target Cost** | Your supplier cost | $100/night | ❌ No (internal tracking) |

**Final Customer Price = Base Price + Markup**
**Your Profit = Base Price - Target Cost** (markup typically covers fees, not additional profit)

---

## 💼 Business Example: Complete Flow

**You operate a tour company selling day trips:**

### Product: "City Walking Tour"
### Option: "Standard Tour"
### Rate: "Summer 2024 Rate"

**Setup:**
```
Base Price: $120/person (what you want to earn)
Target Cost: $80/person (what you pay guide + overhead)
Markup: 10% (Booking.com commission)
```

**When sold through Booking.com:**
```
Customer sees: $120 + ($120 × 10%) = $132/person
Customer pays: $132/person

Breakdown:
- Booking.com keeps: $12 (10% commission)
- You receive: $120 (base price)
- You pay supplier: $80 (target cost)
- Your profit: $120 - $80 = $40/person (33% margin)
```

**When sold through your website (direct):**
```
Customer sees: $120/person (no markup applied)
Customer pays: $120/person

Breakdown:
- You receive: $120 (base price)
- You pay supplier: $80 (target cost)
- Your profit: $120 - $80 = $40/person (same profit!)
```

**Result:** Consistent $40 profit regardless of sales channel!

