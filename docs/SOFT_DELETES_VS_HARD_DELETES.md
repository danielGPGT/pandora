# Soft Deletes vs Hard Deletes for SaaS Products

## Executive Summary

**For tour operator SaaS: Recommend SOFT DELETES with hard delete retention policy**

Soft deletes provide data safety, audit compliance, and user confidence that are critical for business applications. Hard deletes should be reserved for:
- PII cleanup after GDPR retention periods
- Scheduled cleanup jobs for old soft-deleted data (e.g., >2 years)
- Administrative bulk cleanup operations

## Current State

Your application currently uses **hard deletes** - records are permanently removed from the database. You have:
- Foreign keys with `ON DELETE CASCADE` in some places
- `is_active` flags for deactivation (good for hiding, not deleting)
- No `deleted_at` timestamps
- Audit logs that track deletions (good!)

## Why Soft Deletes Matter for SaaS

### 1. **Accidental Deletion Recovery**
```
Scenario: User accidentally deletes a product with 50 selling rates
Hard Delete: 💥 All data lost, manual recovery required
Soft Delete: ✅ Restore from admin panel in 2 clicks
```

### 2. **Business Data Protection**
Tour operator data is critical:
- **Products & Rates**: Core catalog, pricing history
- **Contracts**: Legal agreements, commission structures
- **Bookings**: Revenue records (likely immutable, but related data matters)
- **Suppliers**: Relationship history

Hard deleting these creates business risk.

### 3. **Compliance & Auditing**
- **Financial audits**: Need historical data
- **Legal requirements**: Contract data retention policies
- **Regulatory compliance**: Some jurisdictions require keeping deleted records

### 4. **Relationship Integrity**
Your schema has cascading deletes:
```sql
products -> product_options -> selling_rates
contracts -> contract_files
```

**Problem**: Hard delete a product → all options and rates gone immediately  
**Solution**: Soft delete → relationships maintained, can restore or archive properly

### 5. **User Trust & UX**
- Users feel safer knowing data can be recovered
- Reduces support tickets ("I deleted it by mistake")
- Admin restore capabilities improve customer satisfaction

### 6. **Analytics & Insights**
- "Why did we delete 20 products last month?" 
- Analyze deletion patterns for business intelligence
- Understand what products/rates aren't working

## Recommended Implementation

### Database Schema Changes

Add to all main tables:

```sql
-- Migration: Add soft delete support
ALTER TABLE products ADD COLUMN deleted_at TIMESTAMPTZ NULL;
ALTER TABLE product_options ADD COLUMN deleted_at TIMESTAMPTZ NULL;
ALTER TABLE selling_rates ADD COLUMN deleted_at TIMESTAMPTZ NULL;
ALTER TABLE suppliers ADD COLUMN deleted_at TIMESTAMPTZ NULL;
ALTER TABLE contracts ADD COLUMN deleted_at TIMESTAMPTZ NULL;
ALTER TABLE events ADD COLUMN deleted_at TIMESTAMPTZ NULL;

-- Add indexes for performance (partial indexes exclude NULLs)
CREATE INDEX idx_products_deleted_at ON products(deleted_at) 
  WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_products_active_not_deleted ON products(organization_id, is_active) 
  WHERE deleted_at IS NULL;
-- Repeat for other tables...

-- Update foreign key constraints to prevent cascading hard deletes
-- (Keep soft delete cascading logic in application layer)
```

### Application Layer Changes

#### 1. **Query Helpers**

```typescript
// lib/utils/queries.ts
export function excludeDeleted<T extends { deleted_at: Date | null }>(
  query: PostgrestFilterBuilder<any, T>
) {
  return query.is('deleted_at', null)
}

export function includeDeleted<T extends { deleted_at: Date | null }>(
  query: PostgrestFilterBuilder<any, T>
) {
  return query
}

export function onlyDeleted<T extends { deleted_at: Date | null }>(
  query: PostgrestFilterBuilder<any, T>
) {
  return query.not('deleted_at', 'is', null)
}
```

#### 2. **Delete Actions Pattern**

```typescript
// lib/actions/products.ts
export async function deleteProduct(id: string) {
  const auth = await getCurrentUserOrg()
  if (!auth) throw new Error("Unauthorized")

  const supabase = await createClient()
  
  // Soft delete
  const { error } = await supabase
    .from("products")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", auth.organization_id)
    .is("deleted_at", null) // Prevent double-deletion

  if (error) throw new Error(error.message)

  // Log to audit trail
  await createAuditLog({
    organization_id: auth.organization_id,
    entity_type: "product",
    entity_id: id,
    action: "delete",
    changed_by: auth.userTableId,
  })

  revalidatePath(`/products/${id}`)
  revalidatePath("/products")
}

// Hard delete (admin only, after retention period)
export async function hardDeleteProduct(id: string) {
  // Check permissions, retention period, etc.
  // ... validation logic ...
  
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", id)
  
  // ...
}
```

#### 3. **Restore Functionality**

```typescript
export async function restoreProduct(id: string) {
  const auth = await getCurrentUserOrg()
  if (!auth) throw new Error("Unauthorized")

  const supabase = await createClient()
  const { error } = await supabase
    .from("products")
    .update({ deleted_at: null })
    .eq("id", id)
    .eq("organization_id", auth.organization_id)

  if (error) throw new Error(error.message)

  await createAuditLog({
    organization_id: auth.organization_id,
    entity_type: "product",
    entity_id: id,
    action: "restore",
    changed_by: auth.userTableId,
  })

  revalidatePath("/products")
}
```

### UI Changes

#### 1. **DeleteDialog Enhancement**

```tsx
// Add restore capability to DeleteDialog
<DeleteDialog
  // ... existing props ...
  showRestore={true} // New prop
  onRestore={handleRestore}
/>
```

#### 2. **Admin Deleted Items View**

```tsx
// app/(protected)/products/deleted/page.tsx
export default function DeletedProductsPage() {
  // Show soft-deleted products
  // "Restore" or "Permanently Delete" buttons
  // Filter by deletion date
}
```

#### 3. **Data Table Filter**

```tsx
// In product listings, exclude deleted by default
const { data } = await supabase
  .from("products")
  .select("*")
  .eq("organization_id", orgId)
  .is("deleted_at", null) // Exclude soft-deleted
  .eq("is_active", true)
```

### Cascading Soft Deletes

**Strategy**: When parent is soft-deleted, optionally soft-delete children:

```typescript
export async function deleteProduct(id: string) {
  // Soft delete product
  await supabase.from("products").update({ deleted_at: new Date() }).eq("id", id)
  
  // Optionally: Cascade to related data (configurable)
  const cascade = await getOrgSetting(auth.organization_id, "cascade_soft_deletes")
  
  if (cascade) {
    // Soft delete all options
    await supabase
      .from("product_options")
      .update({ deleted_at: new Date() })
      .eq("product_id", id)
      .is("deleted_at", null)
    
    // Soft delete all rates (via options or directly)
    // ...
  }
}
```

## Retention Policy & Cleanup

### Recommended Policy

1. **Soft delete**: Immediate - data marked deleted but recoverable
2. **Archive period**: 30-90 days - data still visible in admin "Deleted" view
3. **Hard delete**: After retention period (e.g., 2 years) - scheduled job

### Cleanup Job

```typescript
// lib/jobs/cleanup-old-deletions.ts
export async function cleanupOldSoftDeletes() {
  const retentionDays = 730 // 2 years
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

  // Find all soft-deleted items older than retention period
  const { data: oldDeletions } = await supabase
    .from("products")
    .select("id")
    .not("deleted_at", "is", null)
    .lt("deleted_at", cutoffDate.toISOString())

  // Hard delete (or archive to separate table first)
  for (const item of oldDeletions || []) {
    await hardDeleteProduct(item.id)
  }
}
```

## Migration Strategy

### Phase 1: Add Column (Non-Breaking)
```sql
-- Add deleted_at to all tables
ALTER TABLE products ADD COLUMN deleted_at TIMESTAMPTZ NULL;
-- ... repeat for all tables
```

### Phase 2: Update Application Logic
- Update all `DELETE` operations to soft delete
- Add `deleted_at IS NULL` filters to queries
- Add restore functionality
- Update UI to show deleted items (admin)

### Phase 3: Add Cleanup Job
- Scheduled job to hard delete old soft-deleted records
- Monitor and adjust retention period

### Phase 4: Documentation
- Document soft delete policy
- Train support team on restore procedures
- Update user-facing help docs

## Performance Considerations

1. **Indexes**: Use partial indexes (WHERE deleted_at IS NULL) for active records
2. **Query Performance**: Most queries filter deleted, so index on `deleted_at`
3. **Storage**: Soft deletes use more storage - plan for growth
4. **Cleanup**: Regular cleanup jobs prevent bloat

## When to Use Hard Deletes

Use hard deletes for:

1. **PII Cleanup**: After GDPR retention periods
2. **Test/Development Data**: Cleanup in dev environments
3. **Scheduled Cleanup**: Old soft-deleted data after retention
4. **User-Requested Permanent Deletion**: Explicit "delete forever" action
5. **Compliance Requirements**: Legal requirement to permanently remove

## Example: Products Table Query Pattern

```typescript
// Before (hard delete)
const { data } = await supabase
  .from("products")
  .select("*")
  .eq("organization_id", orgId)

// After (soft delete)
const { data } = await supabase
  .from("products")
  .select("*")
  .eq("organization_id", orgId)
  .is("deleted_at", null) // Only active records

// Get all including deleted (admin)
const { data: all } = await supabase
  .from("products")
  .select("*")
  .eq("organization_id", orgId)
  // No deleted_at filter

// Get only deleted
const { data: deleted } = await supabase
  .from("products")
  .select("*")
  .eq("organization_id", orgId)
  .not("deleted_at", "is", null)
```

## Recommendation Summary

✅ **Implement Soft Deletes** because:
- Your data is business-critical (rates, contracts, products)
- Users will make mistakes
- Compliance may require data retention
- Better UX and trust
- Audit trail already in place (just enhance it)

✅ **Add Hard Delete Option** for:
- Admin bulk cleanup
- Scheduled retention policy cleanup
- User-requested permanent deletion

✅ **Best of Both Worlds**:
- Default to soft delete (safe)
- Allow hard delete (flexible)
- Automatic cleanup after retention period (efficient)

## Next Steps

1. ✅ Create migration to add `deleted_at` columns
2. ✅ Update server actions to soft delete
3. ✅ Add restore functionality
4. ✅ Update queries to exclude deleted
5. ✅ Add admin "Deleted Items" view
6. ✅ Implement cleanup job
7. ✅ Update documentation

Would you like me to start implementing soft deletes for your application?

