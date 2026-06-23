'use client'

import { SessionProvider } from 'next-auth/react'
import { ThemeProvider } from './contexts/ThemeContext'
import { AccountAssistantProvider } from '@/components/auth/AccountAssistantContext'
import { Session } from 'next-auth'

export default function Providers({ 
  children,
  session 
}: { 
  children: React.ReactNode,
  session?: Session | null 
}) {
  return (
    <SessionProvider session={session}>
      <ThemeProvider>
        <AccountAssistantProvider>
          {children}
        </AccountAssistantProvider>
      </ThemeProvider>
    </SessionProvider>
  )
}
