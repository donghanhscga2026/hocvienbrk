'use client'

import { Suspense, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useAccountAssistant } from './AccountAssistantContext'

function TriggerInner() {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { openAssistant } = useAccountAssistant()

  useEffect(() => {
    if (status !== 'unauthenticated') return
    if (pathname === '/login' || pathname === '/register' || pathname === '/forgot-password') return
    if (pathname === '/complete-profile') return

    const ref = searchParams.get('ref')

    // Auto-open on homepage or aff links when not logged in
    if (pathname === '/' || ref) {
      openAssistant()
    }
  }, [status, pathname, searchParams, openAssistant])

  return null
}

export default function AccountAssistantTrigger() {
  return (
    <Suspense fallback={null}>
      <TriggerInner />
    </Suspense>
  )
}
