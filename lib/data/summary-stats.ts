/**
 * Reusable summary statistics data fetching
 * 
 * Centralized functions for fetching summary stats used across list pages
 */

import { createClient } from '@/lib/supabase/server'
import type { DatabaseTimestamp } from '@/lib/types'

export interface SummaryStats {
  total: number
  active: number
  inactive: number
  newThisMonth: number
}

export interface StatusSummaryStats {
  total: number
  active: number
  expired?: number
  draft?: number
  newThisMonth: number
}

/**
 * Get summary stats for suppliers
 */
export async function getSuppliersSummaryStats(): Promise<SummaryStats> {
  const supabase = await createClient()
  
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  
  const [totalRes, activeRes, inactiveRes, newRes] = await Promise.all([
    supabase.from('suppliers').select('id', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('suppliers').select('id', { count: 'exact', head: true }).eq('is_active', true).is('deleted_at', null),
    supabase.from('suppliers').select('id', { count: 'exact', head: true }).eq('is_active', false).is('deleted_at', null),
    supabase.from('suppliers').select('id', { count: 'exact', head: true }).gte('created_at', startOfMonth).is('deleted_at', null),
  ])
  
  return {
    total: totalRes.count ?? 0,
    active: activeRes.count ?? 0,
    inactive: inactiveRes.count ?? 0,
    newThisMonth: newRes.count ?? 0,
  }
}

/**
 * Get summary stats for contracts
 */
export async function getContractsSummaryStats(): Promise<StatusSummaryStats> {
  const supabase = await createClient()
  
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  
  const [totalRes, activeRes, expiredRes, draftRes, newRes] = await Promise.all([
    supabase.from('contracts').select('id', { count: 'exact', head: true }),
    supabase.from('contracts').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('contracts').select('id', { count: 'exact', head: true }).eq('status', 'expired'),
    supabase.from('contracts').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
    supabase.from('contracts').select('id', { count: 'exact', head: true }).gte('created_at', startOfMonth),
  ])
  
  return {
    total: totalRes.count ?? 0,
    active: activeRes.count ?? 0,
    expired: expiredRes.count ?? 0,
    draft: draftRes.count ?? 0,
    newThisMonth: newRes.count ?? 0,
  }
}

/**
 * Generic function to get summary stats by status field
 */
export async function getSummaryStatsByStatus(
  tableName: string,
  statusField: string,
  statusValues: {
    active?: string
    inactive?: string
    [key: string]: string | undefined
  }
): Promise<Record<string, number>> {
  const supabase = await createClient()
  
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  
  const queries = [
    supabase.from(tableName).select('id', { count: 'exact', head: true }),
    ...Object.entries(statusValues).map(([key, value]) =>
      value
        ? supabase.from(tableName).select('id', { count: 'exact', head: true }).eq(statusField, value)
        : null
    ).filter(Boolean),
    supabase.from(tableName).select('id', { count: 'exact', head: true }).gte('created_at', startOfMonth),
  ]
  
  const results = await Promise.all(queries)
  
  const stats: Record<string, number> = {
    total: results[0]?.count ?? 0,
    newThisMonth: results[results.length - 1]?.count ?? 0,
  }
  
  let resultIndex = 1
  for (const [key, value] of Object.entries(statusValues)) {
    if (value && resultIndex < results.length - 1) {
      stats[key] = results[resultIndex]?.count ?? 0
      resultIndex++
    }
  }
  
  return stats
}

