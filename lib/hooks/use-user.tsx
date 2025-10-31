'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useUser() {
  const [user, setUser] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchUser() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        const { data } = await supabase
          .from('users')
          .select(`*, organization:organizations (*)`)
          .eq('auth_id', authUser.id)
          .single()
        setUser(data)
      }
      setLoading(false)
    }

    fetchUser()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => fetchUser())
    return () => subscription.unsubscribe()
  }, [])

  return { user, loading }
}


