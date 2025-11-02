# Suppliers & Contracts Pages Analysis

## 🔍 Current State Analysis

### ✅ Strengths

1. **Good Structure**: Pages follow Next.js App Router patterns correctly
2. **Proper Data Fetching**: Using server components with async/await
3. **Error Handling**: Basic error handling with `notFound()`
4. **Component Organization**: Components are well-organized by domain
5. **TypeScript Usage**: Good use of types overall

### ⚠️ Issues Found

#### 1. Duplicate Formatting Functions
**Problem**: `formatDate` and `formatCurrency` are defined inline in multiple files:
- `app/(protected)/contracts/[id]/page.tsx` - Lines 24-44
- `components/contracts/contracts-data-table.tsx`
- `components/contracts/contracts-table.tsx`
- `components/reusable/data-table/data-table-08-contracts.tsx`

**Solution**: Use centralized utilities from `lib/utils/format.ts` and `lib/utils/date.ts`

#### 2. Inline Component Definitions
**Problem**: Components defined inside pages:
- `InfoRow` (suppliers/[id]/page.tsx, contracts/[id]/page.tsx)
- `SummaryTile` (contracts/[id]/page.tsx)
- `EmptyState` (contracts/[id]/page.tsx)
- `RelationItem` (contracts/[id]/page.tsx)
- `TermsBlock` (contracts/[id]/page.tsx)

**Solution**: Extract to `components/reusable/` or `components/protected/`

#### 3. Duplicate Summary Stats Logic
**Problem**: Summary stats queries are duplicated in both pages:
```typescript
// Same pattern in suppliers/page.tsx and contracts/page.tsx
const [activeRes, inactiveRes, newRes] = await Promise.all([...])
```

**Solution**: Extract to reusable data fetching functions

#### 4. Error Handling
**Problem**: Using basic try-catch without standardized error handling
```typescript
try {
  supplier = await getSupplierWithContracts(id)
} catch (error) {
  notFound() // Loses error context
}
```

**Solution**: Use error classes from `lib/errors`

#### 5. Type Safety
**Problem**: Use of `any` types:
- `supplier.contracts as any[]`
- `contract.contract_files.map((file: any, idx: number)`

**Solution**: Define proper types or use `unknown` with type guards

#### 6. Helper Functions
**Problem**: Helper functions like `valueOrDash` are defined inline
**Solution**: Move to `lib/utils/` if reusable

## 📋 Recommended Improvements

### Priority 1: High Impact, Low Effort

1. **Replace duplicate formatting functions**
   - Update all pages/components to use `lib/utils/format.ts` and `lib/utils/date.ts`
   - Remove inline definitions

2. **Extract reusable components**
   - `InfoRow`, `SummaryTile`, `EmptyState`, `RelationItem`
   - Move to `components/reusable/` or `components/protected/`

3. **Improve type safety**
   - Replace `any` with proper types or `unknown`
   - Add type guards where needed

### Priority 2: Medium Impact, Medium Effort

4. **Extract summary stats logic**
   - Create `lib/data/summary-stats.ts` or similar
   - Reusable function for fetching summary stats

5. **Standardize error handling**
   - Use `NotFoundError` from `lib/errors`
   - Better error logging

6. **Extract helper utilities**
   - Move `valueOrDash` to `lib/utils/`
   - Create `formatValue` utility

### Priority 3: Nice to Have

7. **Loading states**
   - Add Suspense boundaries for better UX

8. **Component composition**
   - Consider compound components pattern for complex cards

9. **Testing**
   - Add unit tests for formatting functions
   - Add integration tests for pages

## 🎯 Implementation Plan

See separate implementation files for each improvement.

