'use client'

import { useEffect, useState, useRef } from 'react'

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''
const GIS_SCRIPT_ID = 'google-gis-script'
const TIMEOUT_MS = 8000

function decodeJWT(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split('.')[1]
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(decoded)
  } catch {
    return null
  }
}

function isGoogleClientLoaded(): boolean {
  return typeof window !== 'undefined' && !!(window as any).google?.accounts?.id
}

export function useEmailPrefill() {
  const [email, setEmail] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const attempted = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (attempted.current || !GOOGLE_CLIENT_ID) {
      setIsReady(true)
      return
    }
    attempted.current = true

    const finish = (foundEmail: string | null, err?: string) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      setEmail(foundEmail)
      setError(err || null)
      setIsReady(true)
    }

    timerRef.current = setTimeout(() => finish(null, 'Timeout'), TIMEOUT_MS)

    const tryCredentialAPI = async () => {
      try {
        if (!navigator.credentials) return false
        const cred = await (navigator.credentials as any).get({
          password: true,
          federated: { providers: ['https://accounts.google.com'] },
        })
        if (cred && 'id' in cred && cred.id && cred.id.includes('@')) {
          finish(cred.id)
          return true
        }
      } catch { /* silently fail */ }
      return false
    }

    const tryOneTap = (): Promise<boolean> => {
      return new Promise((resolve) => {
        if (isGoogleClientLoaded()) {
          initOneTap(resolve)
          return
        }

        const script = document.createElement('script')
        script.src = 'https://accounts.google.com/gsi/client'
        script.id = GIS_SCRIPT_ID
        script.async = true
        script.defer = true
        script.onload = () => {
          // Small delay to ensure google.accounts is fully initialized
          setTimeout(() => initOneTap(resolve), 300)
        }
        script.onerror = () => resolve(false)
        document.head.appendChild(script)
      })
    }

    const initOneTap = (resolve: (val: boolean) => void) => {
      try {
        const google = (window as any).google
        if (!google?.accounts?.id) {
          resolve(false)
          return
        }

        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response: { credential?: string }) => {
            if (response?.credential) {
              const payload = decodeJWT(response.credential)
              const foundEmail = (payload?.email as string) || null
              finish(foundEmail)
              resolve(true)
            }
          },
          cancel_on_tap_outside: false,
        })

        google.accounts.id.prompt((notification: { isNotDisplayed: boolean; isSkippedMoment: boolean; getDismissedReason: () => string }) => {
          // One Tap không hiển thị → fallback
          if (notification.isNotDisplayed || notification.isSkippedMoment) {
            resolve(false)
          }
        })
      } catch {
        resolve(false)
      }
    }

    ;(async () => {
      const oneTapSuccess = await tryOneTap()
      if (!oneTapSuccess) {
        const credentialSuccess = await tryCredentialAPI()
        if (!credentialSuccess) {
          finish(null)
        }
      }
    })()

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return { email, isReady, error }
}
