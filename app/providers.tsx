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
  website = false,
  accountAssistant = true,
}: {
  children: React.ReactNode,
  session?: Session | null,
  attentionHighlight: { config: AttentionHighlightConfig; items: AttentionHighlightItem[] }
  website?: boolean
  accountAssistant?: boolean
}) {
  return (
    <SessionProvider session={session}>
      <PlatformTheme enabled={!website}>
        <AttentionHighlightProvider config={attentionHighlight.config} items={attentionHighlight.items}>
          <AccountAssistantProvider enabled={accountAssistant}>
            <AssistantProvider>
              <MbwDashboardProvider>
                {children}
              </MbwDashboardProvider>
            </AssistantProvider>
          </AccountAssistantProvider>
        </AttentionHighlightProvider>
      </PlatformTheme>
    </SessionProvider>
  )
}
function PlatformTheme({enabled,children}:{enabled:boolean;children:React.ReactNode}) { return enabled ? <ThemeProvider>{children}</ThemeProvider> : children }
