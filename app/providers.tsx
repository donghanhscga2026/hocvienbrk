'use client'

import { SessionProvider } from 'next-auth/react'
import { ThemeProvider } from './contexts/ThemeContext'
import { AccountAssistantProvider } from '@/components/auth/AccountAssistantContext'
import { AssistantProvider } from '@/components/assistant/AssistantProvider'
import { MbwDashboardProvider } from '@/components/mbw/MbwDashboardContext'
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
          <AssistantProvider>
            <MbwDashboardProvider>
              {children}
            </MbwDashboardProvider>
          </AssistantProvider>
        </AccountAssistantProvider>
      </ThemeProvider>
    </SessionProvider>
  )
}
