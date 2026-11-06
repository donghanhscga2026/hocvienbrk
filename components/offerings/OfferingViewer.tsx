'use client'

import { useState } from 'react'
import { detectVideoSource } from '@/lib/video-sources'

export function embeddedSource(raw: string, kind?: string) {
  const value = raw.trim()
  if (
    !/^https:\/\//i.test(value) &&
    !(value.startsWith('/') && !value.startsWith('//') && !/[\\\s]/.test(value))
  )
    return null
  let url: URL
  try {
    url = new URL(value, 'https://wi300.local')
  } catch {
    return null
  }
  if (url.hostname === 'drive.google.com') {
    const id = url.pathname.match(/^\/file\/d\/([\w-]+)/)?.[1] || url.searchParams.get('id')
    if (id && /^[\w-]+$/.test(id))
      return {
        src: `https://drive.google.com/file/d/${id}/preview`,
        video: false,
      }
  }
  if (/^(docs|sheets|slides)\.google\.com$/.test(url.hostname)) {
    const path = url.pathname.match(/^\/(document|spreadsheets|presentation)\/d\/([\w-]+)/)
    if (path)
      return {
        src: `${url.origin}/${path[1]}/d/${path[2]}/preview`,
        video: false,
      }
  }
  if (kind === 'VIDEO' || /(^|\.)(youtube\.com|youtu\.be|vimeo\.com|dailymotion\.com)$/.test(url.hostname)) {
    const source = detectVideoSource(value)
    if (source.platform !== 'unknown') return { src: source.embedUrl!, video: source.platform === 'mp4' }
  }
  return { src: value, video: /\.(mp4|webm|ogg)(?:[?#]|$)/i.test(value) }
}

export default function OfferingViewer({ url, title, kind }: { url: string; title: string; kind?: string }) {
  const [failed, setFailed] = useState(false)
  const source = embeddedSource(url, kind)
  if (!source || failed)
    return (
      <p role="alert" className="rounded-xl bg-amber-50 p-5 text-amber-950">
        Chưa thể xem nội dung tại đây. Vui lòng gửi yêu cầu hỗ trợ để đơn vị cung cấp cập nhật nguồn xem trực
        tiếp.
      </p>
    )
  return (
    <div className="space-y-3">
      {source.video ? (
        <video
          key={source.src}
          src={source.src}
          aria-label={title}
          controls
          controlsList="nodownload"
          disablePictureInPicture
          preload="metadata"
          onError={() => setFailed(true)}
          className="aspect-video w-full rounded-xl bg-black"
        />
      ) : (
        <iframe
          key={source.src}
          src={source.src}
          title={title}
          loading="lazy"
          sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
          allow="fullscreen; encrypted-media"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className={`w-full rounded-xl border bg-stone-50 ${kind === 'VIDEO' ? 'aspect-video' : 'h-[68dvh] min-h-96'}`}
        />
      )}
    </div>
  )
}
