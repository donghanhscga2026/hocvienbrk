'use client'

import { SessionProvider } from 'next-auth/react'
import { ThemeProvider } from './contexts/ThemeContext'
import { AttentionHighlightProvider } from './contexts/AttentionHighlightContext'
import { AccountAssistantProvider } from '@/components/auth/AccountAssistantContext'
import { AssistantProvider } from '@/components/assistant/AssistantProvider'
import { MbwDashboardProvider } from '@/components/mbw/MbwDashboardContext'
import { Session } from 'next-auth'
import type { AttentionHighlightConfig, AttentionHighlightItem } from '@/lib/attention-highlight-types'

export default function Providers({
  children,
  session,
  attentionHighlight,
}: {
  children: React.ReactNode,
  session?: Session | null,
  attentionHighlight: { config: AttentionHighlightConfig; items: AttentionHighlightItem[] }
}) {
  return (
    <SessionProvider session={session}>
      <ThemeProvider>
        <AttentionHighlightProvider config={attentionHighlight.config} items={attentionHighlight.items}>
          <AccountAssistantProvider>
            <AssistantProvider>
              <MbwDashboardProvider>
                {children}
              </MbwDashboardProvider>
            </AssistantProvider>
          </AccountAssistantProvider>
        </AttentionHighlightProvider>
      </ThemeProvider>
    </SessionProvider>
  )
}
