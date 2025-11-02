/**
 * Query helper utilities for filtering soft-deleted records
 * 
 * These helpers work with Supabase PostgrestFilterBuilder to easily
 * exclude or include soft-deleted records in queries.
 */

import type { PostgrestFilterBuilder } from "@supabase/postgrest-js"

/**
 * Type guard for entities with deleted_at field
 */
type SoftDeletable = {
  deleted_at: string | null | Date
}

/**
 * Excludes soft-deleted records from a query
 * Use this for all normal queries where you only want active (non-deleted) records
 */
export function excludeDeleted<T extends SoftDeletable>(
  query: PostgrestFilterBuilder<any, T, any>
): PostgrestFilterBuilder<any, T, any> {
  return query.is("deleted_at", null)
}

/**
 * Includes all records (both deleted and non-deleted)
 * Use this for admin views where you need to see everything
 */
export function includeDeleted<T extends SoftDeletable>(
  query: PostgrestFilterBuilder<any, T, any>
): PostgrestFilterBuilder<any, T, any> {
  return query
}

/**
 * Only returns soft-deleted records
 * Use this for admin "deleted items" views
 */
export function onlyDeleted<T extends SoftDeletable>(
  query: PostgrestFilterBuilder<any, T, any>
): PostgrestFilterBuilder<any, T, any> {
  return query.not("deleted_at", "is", null)
}

/**
 * Checks if a record is soft-deleted
 */
export function isDeleted(record: SoftDeletable | null | undefined): boolean {
  return record !== null && record !== undefined && record.deleted_at !== null
}

/**
 * Checks if a record is not soft-deleted (active)
 */
export function isActive(record: SoftDeletable | null | undefined): boolean {
  return !isDeleted(record)
}

