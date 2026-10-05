'use client'

import React from 'react'

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

  React.useEffect(() => {
    const frame = frameRef.current
    if (!frame) return

    const handleMessage = (event: MessageEvent) => {
      if (event.source !== frame.contentWindow) return
      const data = event.data || {}

      if ((data.source === 'mfc-zip-source' || data.source === 'dhcc') && data.type === 'height' && Number.isFinite(data.height)) {
        setHeight(Math.max(300, Math.min(20000, Math.ceil(data.height))))
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
    const timer = window.setTimeout(sendViewport, 250)

    return () => {
      window.removeEventListener('message', handleMessage)
      window.removeEventListener('scroll', sendViewport)
      window.removeEventListener('resize', sendViewport)
      window.clearTimeout(timer)
    }
  }, [onAction, sourceUrl])

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
      src={sourceUrl}
      sandbox="allow-scripts"
      referrerPolicy="no-referrer"
      scrolling="no"
      className="block w-full border-0 bg-white"
      style={{ height }}
    />
  )
}
