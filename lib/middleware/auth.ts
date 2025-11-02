/**
 * Authentication middleware utilities
 */

import { createClient } from '@/lib/supabase/server'
import { UnauthorizedError, ForbiddenError } from '@/lib/errors'
import type { RequestContext } from '@/lib/types/api'

/**
 * Get authenticated user and organization context
 */
export async function getAuthContext(): Promise<RequestContext> {
  const supabase = await createClient()
  
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    throw new UnauthorizedError('Authentication required')
  }
  
  // Get user profile and organization
  const { data: userProfile } = await supabase
    .from('users')
    .select('id, organization_id')
    .eq('auth_id', user.id)
    .single()
  
  if (!userProfile) {
    throw new UnauthorizedError('User profile not found')
  }
  
  return {
    userId: userProfile.id,
    organizationId: userProfile.organization_id,
  }
}

/**
 * Require organization membership
 */
export async function requireOrganization(organizationId?: string): Promise<RequestContext> {
  const context = await getAuthContext()
  
  if (!context.organizationId) {
    throw new ForbiddenError('Organization membership required')
  }
  
  if (organizationId && context.organizationId !== organizationId) {
    throw new ForbiddenError('Access denied to this organization')
  }
  
  return context
}

