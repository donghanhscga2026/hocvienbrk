'use client'

import React from 'react'
import { zipFrameSource } from '@/lib/course-page/importer/source-url'

type Props = {
  id?: string
  content: any
  onAction?: (actionType: string, target?: string) => void
}

function safeExternal(value: unknown) {
  if (typeof value !== 'string') return undefined
  try {
    const url = new URL(value)
    return ['http:', 'https:', 'tel:', 'mailto:'].includes(url.protocol) ? value : undefined
  } catch {
    return undefined
  }
}

export default function ZipSourceSection({ id, content, onAction }: Props) {
  const frameRef = React.useRef<HTMLIFrameElement | null>(null)
  const [height, setHeight] = React.useState(900)
  const sourceUrl = content?.exactSource?.url || content?.importedSource?.exactSource?.url || ''
  const selectedBlockKeys: string[] | null = Array.isArray(content?.selectedBlockKeys)
    ? content.selectedBlockKeys.filter((value: unknown): value is string => typeof value === 'string')
    : null
  const registrationBlockKeys: string[] = Array.isArray(content?.registrationBlockKeys)
    ? content.registrationBlockKeys.filter((value: unknown): value is string => typeof value === 'string')
    : []

  React.useEffect(() => {
    const frame = frameRef.current
    if (!frame) return

    const sendAnchorToFrame = () => {
      const rawHash = window.location.hash
      if (!rawHash || rawHash === '#') return
      let anchor = rawHash.slice(1)
      try { anchor = decodeURIComponent(anchor) } catch {}
      try {
        frame.contentWindow?.postMessage({
          source: 'mfc-zip-parent',
          type: 'navigate_anchor',
          anchor,
        }, '*')
      } catch {}
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.source !== frame.contentWindow) return
      const data = event.data || {}

      if ((data.source === 'mfc-zip-source' || data.source === 'dhcc') && data.type === 'height' && Number.isFinite(data.height)) {
        setHeight(Math.max(300, Math.min(20000, Math.ceil(data.height))))
        return
      }

      if (data.source === 'mfc-zip-source' && data.type === 'scroll' && Number.isFinite(data.top)) {
        const rect = frameRef.current?.getBoundingClientRect()
        if (!rect) return

        if (data.updateHash !== false && typeof data.anchor === 'string' && data.anchor) {
          const url = new URL(window.location.href)
          const previousHash = url.hash
          url.hash = data.anchor
          if (url.hash !== previousHash) {
            window.history.pushState(null, '', `${url.pathname}${url.search}${url.hash}`)
          }
        }

        const absoluteTop = window.scrollY + rect.top + Number(data.top) - 72
        window.scrollTo({ top: Math.max(0, absoluteTop), behavior: 'smooth' })
        return
      }

      if (data.source === 'mfc-zip-source' && data.type === 'action') {
        const actionType = typeof data.actionType === 'string' ? data.actionType : 'open_registration'
        if (actionType === 'external_link') {
          const target = safeExternal(data.target)
          if (target) onAction?.('external_link', target)
          return
        }
        if (['open_registration', 'open_share'].includes(actionType)) onAction?.(actionType)
        return
      }

      if (data.source === 'dhcc' && data.type === 'scroll' && Number.isFinite(data.top)) {
        const rect = frame.getBoundingClientRect()
        const absoluteTop = window.scrollY + rect.top + Number(data.top) - 72
        window.scrollTo({ top: Math.max(0, absoluteTop), behavior: 'smooth' })
      }
    }

    const sendConfiguration = () => {
      try {
        frame.contentWindow?.postMessage({
          source: 'mfc-zip-parent',
          type: 'configure',
          selectedBlockKeys,
          registrationBlockKeys,
        }, '*')
      } catch {}
    }

    const sendViewport = () => {
      const rect = frame.getBoundingClientRect()
      const top = Math.max(0, -rect.top)
      const viewportHeight = window.innerHeight
      try {
        frame.contentWindow?.postMessage({ source: 'mfc-zip-parent', type: 'viewport', top, height: viewportHeight }, '*')
        // Backward-compatible bridge for the supplied "Đồng Hành Cùng Con" source package.
        frame.contentWindow?.postMessage({ source: 'dhcc-parent', type: 'viewport', top, height: viewportHeight }, '*')
      } catch {}
    }

    window.addEventListener('message', handleMessage)
    window.addEventListener('scroll', sendViewport, { passive: true })
    window.addEventListener('resize', sendViewport)
    window.addEventListener('hashchange', sendAnchorToFrame)
    window.addEventListener('popstate', sendAnchorToFrame)
    const timer = window.setTimeout(() => {
      sendConfiguration()
      sendViewport()
      sendAnchorToFrame()
    }, 250)

    return () => {
      window.removeEventListener('message', handleMessage)
      window.removeEventListener('scroll', sendViewport)
      window.removeEventListener('resize', sendViewport)
      window.removeEventListener('hashchange', sendAnchorToFrame)
      window.removeEventListener('popstate', sendAnchorToFrame)
      window.clearTimeout(timer)
    }
  }, [onAction, sourceUrl, selectedBlockKeys?.join('|'), registrationBlockKeys.join('|')])

  if (!sourceUrl) {
    return (
      <section id={id} className="mx-auto max-w-3xl p-8 text-center text-sm text-red-600">
        Không tìm thấy nguồn HTML của mẫu ZIP.
      </section>
    )
  }

  return (
    <iframe
      ref={frameRef}
      id={id}
      title={content?.exactSource?.entryPath || 'ZIP website template'}
      src={zipFrameSource(sourceUrl, process.env.NEXT_PUBLIC_SUPABASE_URL || '')}
      sandbox="allow-scripts"
      referrerPolicy="no-referrer"
      scrolling="no"
      className="block w-full border-0 bg-white"
      style={{ height }}
      onLoad={() => {
        try {
          frameRef.current?.contentWindow?.postMessage({
            source: 'mfc-zip-parent',
            type: 'configure',
            selectedBlockKeys,
            registrationBlockKeys,
          }, '*')
          const rawHash = window.location.hash
          if (rawHash && rawHash !== '#') {
            let anchor = rawHash.slice(1)
            try { anchor = decodeURIComponent(anchor) } catch {}
            frameRef.current?.contentWindow?.postMessage({
              source: 'mfc-zip-parent',
              type: 'navigate_anchor',
              anchor,
            }, '*')
          }
        } catch {}
      }}
    />
  )
}
