# Base Price vs Target Cost Explained

## 🎯 Quick Summary

- **Base Price** = What you **SELL** to the customer (selling price)
- **Target Cost** = What you **PAY** to the supplier (your cost)

The difference between these two is your **profit margin**.

---

## 📊 Detailed Explanation

### Base Price
**What it is:** The selling price charged to your customers

**Example:**
- Hotel room base price: $150 per night
- Tour base price: $200 per person
- Transfer base price: $50 per booking

**When it's used:**
- This is what customers see and pay
- Before any markup is applied (if markup is used)
- The starting point for all pricing calculations

### Target Cost
**What it is:** The amount you pay your supplier/partner for the product

**Example:**
- Hotel room target cost: $100 per night (what you pay the hotel)
- Tour target cost: $150 per person (what you pay the tour operator)
- Transfer target cost: $35 per booking (what you pay the transfer company)

**Why it's called "target":**
- It's your target/expected cost
- Actual cost might vary slightly due to:
  - Currency fluctuations
  - Supplier rate changes
  - Volume discounts
- Helps with profitability planning

---

## 💰 Profit Margin Calculation

### Formula
```
Profit Margin = Base Price - Target Cost
Margin Percentage = (Profit Margin / Base Price) × 100
```

### Example 1: Hotel Room
- **Base Price:** $150/night
- **Target Cost:** $100/night
- **Profit Margin:** $150 - $100 = **$50 per night**
- **Margin %:** ($50 / $150) × 100 = **33.3% profit**

### Example 2: Tour
- **Base Price:** $200/person
- **Target Cost:** $150/person
- **Profit Margin:** $200 - $150 = **$50 per person**
- **Margin %:** ($50 / $200) × 100 = **25% profit**

### Example 3: No Target Cost Set
- **Base Price:** $100/night
- **Target Cost:** Not set (null)
- **Situation:** You might not know the exact cost yet, or cost varies, or you want flexibility

---

## 🔄 How Markup Fits In

**Markup** is an additional amount added on top of the base price, typically used for:
- Channel fees (if selling through third-party platforms)
- Service charges
- Additional profit layers

### Example with Markup:
1. **Base Price:** $150/night
2. **Target Cost:** $100/night
3. **Markup:** 10% percentage markup
4. **Final Selling Price:** $150 × 1.10 = **$165/night**
5. **Total Profit:** $165 - $100 = **$65 per night**

---

## 📋 Common Scenarios

### Scenario 1: Standard Tour Operator Flow
```
Supplier Rate Card: $100/night
Your Target Cost: $100/night (you pay supplier this)
Your Base Price: $150/night (you charge customer this)
Your Profit: $50/night (33% margin)
```

### Scenario 2: Variable Supplier Costs
```
Base Price: $200/person (fixed selling price)
Target Cost: Not set (costs vary by season/supplier)
Markup: 15% (applied to cover variable costs)
Final Price: $200 × 1.15 = $230/person
```
**Why no target cost?** Supplier rates change frequently, so you price based on market rate instead.

### Scenario 3: Wholesale vs Retail
```
Wholesale (Target Cost): $80/night (what you pay)
Your Base Price: $120/night (your markup price)
Retail Price: $150/night (what customer pays)
Profit: $150 - $80 = $70/night
```

---

## 🎯 When to Use Each Field

### Always Set: Base Price
- **Required** - You must know what you're charging customers
- This is your selling price

### Optional but Recommended: Target Cost
- **Set it when:** You know your supplier costs
- **Leave empty when:**
  - Costs are highly variable
  - You're pricing based on market rates
  - You don't have supplier contracts yet
  - Costs are calculated dynamically

### Benefits of Setting Target Cost:
1. **Profitability tracking** - See margins at a glance
2. **Pricing decisions** - Know if rates are profitable
3. **Reporting** - Financial reports show profit per rate
4. **Budgeting** - Plan revenue and costs accurately

---

## 📊 Real-World Example: Hotel Booking

### Setup:
- **Product:** 4-Star Hotel Room
- **Option:** Standard Double Room
- **Rate:** Standard Nightly Rate

### Rate Configuration:
```
Rate Name: "Standard Summer Rate"
Base Price: $200/night
Target Cost: $140/night (what you pay the hotel)
Markup Type: None (or set a markup for channel fees)
Currency: USD
Valid From: June 1, 2024
Valid To: August 31, 2024
```

### Business Calculation:
- **Customer pays:** $200/night
- **You pay hotel:** $140/night
- **Your profit:** $60/night
- **Profit margin:** 30%

### With Markup (if selling through booking platform):
```
Base Price: $200/night
Target Cost: $140/night
Markup: 10% (platform fee)
Final Price: $220/night
Your profit: $220 - $140 = $80/night (after markup)
```

---

## 🤔 FAQ

### Q: Do I need to set target cost?
**A:** Not required, but highly recommended for:
- Profitability tracking
- Financial reporting
- Making informed pricing decisions

### Q: What if my costs change?
**A:** Update the target cost in the rate, or create a new rate with updated costs for a new date range.

### Q: Can base price and target cost be the same?
**A:** Yes, but that means zero profit (or you're breaking even). Usually you want base price > target cost.

### Q: What if I don't know the supplier cost yet?
**A:** Leave target cost empty (null). You can add it later when you have the information.

### Q: Does target cost affect what customers pay?
**A:** No. Only **base price** (and markup if set) determines what customers pay. Target cost is for internal tracking only.

---

## 💡 Best Practices

1. **Always set base price** - This is your selling price
2. **Set target cost when possible** - Enables profit tracking
3. **Update costs regularly** - Supplier rates change
4. **Use date ranges** - Different costs for different seasons
5. **Review profitability** - Regular reports should show margin analysis

---

## 📈 Dashboard/Reporting Usage

With both fields set, your system can automatically calculate:

- **Total Revenue:** Sum of all base prices × bookings
- **Total Costs:** Sum of all target costs × bookings
- **Gross Profit:** Revenue - Costs
- **Profit Margin %:** (Gross Profit / Revenue) × 100
- **Profit per Rate:** Base Price - Target Cost
- **Most Profitable Rates:** Sort by profit margin

This gives you powerful business intelligence for pricing decisions!

