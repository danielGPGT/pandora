'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'

type SupabaseAuthUser = ReturnType<typeof createClient> extends infer Client
  ? Client extends { auth: infer Auth }
    ? Auth extends { getUser: () => Promise<{ data: { user: infer AuthUser | null } }> }
      ? AuthUser
      : never
    : never
  : never

export type AppUser = {
  id?: string
  auth_id?: string
  email: string
  first_name?: string | null
  last_name?: string | null
  avatar_url?: string | null
  role?: string | null
  organization_id?: string | null
  organization?: any
}

type UserContextValue = {
  user: AppUser | null
  loading: boolean
  refresh: () => Promise<void>
}

const UserContext = createContext<UserContextValue | undefined>(undefined)

function normalizeUser(authUser: SupabaseAuthUser, profile?: Partial<AppUser> | null): AppUser {
  console.info('[UserProvider] normalizeUser', { profile, metadata: authUser.user_metadata })
  const profileFirst = profile?.first_name?.trim() ?? ''
  const profileLast = profile?.last_name?.trim() ?? ''

  const metadataFullName = (authUser.user_metadata?.full_name as string | undefined)?.trim()
  const metadataFirst = (authUser.user_metadata?.first_name as string | undefined)?.trim()
  const metadataLast = (authUser.user_metadata?.last_name as string | undefined)?.trim()

  const fallbackFirst = profileFirst || metadataFirst || metadataFullName?.split(' ')?.[0] || null
  const fallbackLast = profileLast || metadataLast ||
    (metadataFullName ? metadataFullName.split(' ').slice(1).join(' ').trim() || null : null)

  return {
    id: profile?.id ?? authUser.id,
    auth_id: authUser.id,
    email: profile?.email ?? authUser.email ?? '',
    first_name: fallbackFirst,
    last_name: fallbackLast,
    avatar_url: (profile as any)?.avatar_url ?? (authUser.user_metadata?.avatar_url as string | undefined) ?? null,
    role: profile?.role ?? null,
    organization_id: profile?.organization_id ?? null,
    organization: profile?.organization ?? null,
  }
}

export function UserProvider({ initialUser, children }: { initialUser: AppUser | null; children: ReactNode }) {
  const supabase = createClient()
  const [user, setUser] = useState<AppUser | null>(initialUser)
  const [loading, setLoading] = useState<boolean>(!initialUser)

  const fetchUser = useCallback(async () => {
    setLoading(true)

    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      console.error('[UserProvider] getUser error', authError)
      setUser(null)
      setLoading(false)
      return
    }

    if (!authUser) {
      setUser(null)
      setLoading(false)
      return
    }

    const { data: profile, error } = await supabase
      .from('users')
      .select('id, auth_id, email, first_name, last_name, role, organization_id, organization:organizations(*)')
      .eq('auth_id', authUser.id)
      .maybeSingle()

    if (error) {
      console.warn('[UserProvider] profile lookup error', error)
    }

    setUser(normalizeUser(authUser, profile ?? undefined))
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    if (!initialUser) {
      fetchUser()
    } else {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event) => {
      fetchUser()
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [fetchUser, supabase])

  const value = useMemo<UserContextValue>(() => ({ user, loading, refresh: fetchUser }), [user, loading, fetchUser])

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUser() {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}


