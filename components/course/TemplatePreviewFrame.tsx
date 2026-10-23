'use client'
import { useEffect, useRef, useState } from 'react'
import TemplateVideoOverlays from './TemplateVideoOverlays'

// Khung chứa chỉ hiển thị mẫu; không nhúng lại trang quản lý hay menu Wi300.
export default function TemplatePreviewFrame({ src, html, width = 1280, thumbnail = false, exportToken, onSource, title = 'Xem trước mẫu' }: { src?: string; html?: string; width?: number; thumbnail?: boolean; exportToken?: string; onSource?: (html: string) => void; title?: string }) {
  const box = useRef<HTMLDivElement>(null), frame = useRef<HTMLIFrameElement>(null)
  const [available, setAvailable] = useState(600), [loading, setLoading] = useState(true), [error, setError] = useState('')
  const deadline = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => { const host = box.current; if (!host) return; const resize = () => setAvailable(host.clientWidth || 600); resize(); if (typeof ResizeObserver === 'undefined') return; const observer = new ResizeObserver(resize); observer.observe(host); return () => observer.disconnect() }, [])
  useEffect(() => { setLoading(true); setError(''); const timer = setTimeout(() => { setLoading(false); setError('Preview chưa phản hồi. Hãy tải lại hoặc mở bản xem trước riêng.') }, 20000); deadline.current = timer; return () => clearTimeout(timer) }, [src, html])
  useEffect(() => {
    if (!exportToken || !onSource) return
    const receive = (event: MessageEvent) => {
      if (event.origin !== location.origin || event.source !== frame.current?.contentWindow || event.data?.source !== 'course-template-builtin' || event.data.token !== exportToken || typeof event.data.html !== 'string') return
      onSource(event.data.html)
    }
    window.addEventListener('message', receive); return () => window.removeEventListener('message', receive)
  }, [exportToken, onSource])
  const scale = Math.min(1, available / width), height = thumbnail ? 240 : Math.max(500, Math.min(760, typeof window === 'undefined' ? 650 : window.innerHeight - 250))
  return <div ref={box} inert={thumbnail || undefined} className="relative w-full overflow-hidden rounded-xl border border-brk-outline bg-white" style={{ height }}>
    {loading && <p role="status" className="absolute inset-x-0 top-3 z-10 text-center text-xs text-gray-500">Đang tải preview…</p>}
    {error && loading === false && <p className="absolute inset-x-3 top-3 z-10 rounded-lg bg-white p-3 text-xs text-red-700">{error}</p>}
    <iframe ref={frame} title={title} loading={thumbnail ? 'lazy' : 'eager'} src={src} srcDoc={html} sandbox={html ? 'allow-scripts' : 'allow-scripts allow-same-origin'} referrerPolicy="no-referrer" tabIndex={thumbnail ? -1 : undefined} className="block border-0" style={{ width, height: height / scale, transform: `scale(${scale})`, transformOrigin: 'top left' }} onLoad={() => { if (deadline.current) clearTimeout(deadline.current); setLoading(false); setError('') }} />
    <TemplateVideoOverlays frame={frame} revision={html || src} />
  </div>
}
