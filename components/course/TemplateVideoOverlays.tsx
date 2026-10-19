'use client'

import { useEffect, useState, type RefObject } from 'react'
import { youtubeEmbedUrl } from '@/lib/course-page/youtube-embed'

type Slot = { id: string; src: string; title: string; left: number; top: number; width: number; height: number; radius: string; clip: number[] }
type Layout = { revision?: string; slots: Slot[]; x: number; y: number; scale: number }

/** Players live outside the untrusted srcdoc, at its reserved video positions.
 * This preserves a normal HTTPS Referer and fullscreen without relaxing sandbox.
 */
export default function TemplateVideoOverlays({ frame, revision }: { frame: RefObject<HTMLIFrameElement | null>; revision?: string }) {
  const [layout, setLayout] = useState<Layout>({ slots: [], x: 0, y: 0, scale: 1 })
  useEffect(() => {
    const element = frame.current
    if (!element) return
    const request = () => element.contentWindow?.postMessage({ source: 'mfc-youtube-parent' }, '*')
    const reset = () => { setLayout({ revision, slots: [], x: 0, y: 0, scale: 1 }); request() }
    const receive = (event: MessageEvent) => {
      if (event.source !== element.contentWindow || event.data?.source !== 'mfc-youtube-slots' || !Array.isArray(event.data.slots)) return
      const slots: Slot[] = []
      for (const raw of event.data.slots.slice(0, 12)) {
        if (!raw || typeof raw !== 'object') continue
        const src = youtubeEmbedUrl(raw.src)
        if (!src || typeof raw.id !== 'string' || !/^\d{1,2}$/.test(raw.id) || slots.some(slot => slot.id === raw.id) || !['left', 'top', 'width', 'height'].every(key => typeof raw[key] === 'number' && Number.isFinite(raw[key]) && Math.abs(raw[key]) <= 100000) || raw.width <= 0 || raw.height <= 0) continue
        const clip = Array.isArray(raw.clip) && raw.clip.length === 4 && raw.clip.every((n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 100000) ? raw.clip : [0, 0, 0, 0]
        slots.push({ id: raw.id, src, title: typeof raw.title === 'string' ? raw.title.slice(0, 160) : 'Video YouTube', left: raw.left, top: raw.top, width: raw.width, height: raw.height, radius: typeof raw.radius === 'string' && /^[\d.%px\s/]+$/.test(raw.radius) ? raw.radius : '0px', clip })
      }
      const scale = element.offsetWidth ? element.getBoundingClientRect().width / element.offsetWidth : 1
      setLayout({ revision, slots, x: element.offsetLeft, y: element.offsetTop, scale: scale || 1 })
    }
    window.addEventListener('message', receive)
    window.addEventListener('resize', request)
    element.addEventListener('load', reset)
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(request)
    observer?.observe(element)
    request()
    return () => {
      window.removeEventListener('message', receive)
      window.removeEventListener('resize', request)
      element.removeEventListener('load', reset)
      observer?.disconnect()
    }
  }, [frame, revision])

  if (layout.revision !== revision || !layout.slots.length) return null
  return <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
    {layout.slots.map(slot => <div key={slot.id} style={{ position: 'absolute', left: layout.x + slot.left * layout.scale, top: layout.y + slot.top * layout.scale, width: slot.width * layout.scale, height: slot.height * layout.scale, borderRadius: slot.radius, overflow: 'hidden', clipPath: `inset(${slot.clip.map(n => `${n * layout.scale}px`).join(' ')})`, pointerEvents: 'auto' }}>
      <iframe title={slot.title} src={slot.src} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen" allowFullScreen style={{ display: 'block', width: '100%', height: '100%', border: 0 }} />
    </div>)}
  </div>
}
