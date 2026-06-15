'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export interface Profile {
  id: string
  full_name: string
  role: 'admin' | 'staff'
  store_id: string | null
  store_name?: string
}

export function useProfile() {
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role, store_id')
        .eq('id', user.id)
        .single()

      if (data) {
        // 店舗名を別クエリで取得
        let store_name: string | undefined
        if (data.store_id) {
          const { data: store } = await supabase.from('stores').select('name').eq('id', data.store_id).single()
          store_name = store?.name
        }
        setProfile({
          id: data.id,
          full_name: data.full_name,
          role: data.role,
          store_id: data.store_id,
          store_name,
        })
      }
      setLoading(false)
    }
    fetch()
  }, [])

  const isAdmin = profile?.role === 'admin'

  return { profile, loading, isAdmin }
}
