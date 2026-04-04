'use client'

import { useEffect, useState } from 'react'
import { auth } from '@/auth'

export function useAffiliateCode() {
  const [affiliateCode, setAffiliateCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getAffiliateCode = async () => {
      try {
        const session = await auth()
        if (session?.user?.id) {
          const userId = session.user.id
          const code = String(userId)
          setAffiliateCode(code)
        }
      } catch (error) {
        console.error('[useAffiliateCode] Error:', error)
      } finally {
        setLoading(false)
      }
    }

    getAffiliateCode()
  }, [])

  return { affiliateCode, loading }
}
