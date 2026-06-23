'use client'

import { useMemo, useState, useEffect } from 'react'

interface YouTubeEmbedProps {
  url: string
  className?: string
  width?: number | string
  height?: number | string
  autoplay?: boolean
  muted?: boolean
  disableInteraction?: boolean
}

export function getYouTubeId(url: string): string | null {
  if (!url) return null

  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/)
  if (match) return match[1]

  const shortsMatch = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/)
  if (shortsMatch) return shortsMatch[1]

  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url

  return null
}

export default function YouTubeEmbed({ url, className = '', width = '100%', height = '100%', autoplay = false, muted = false, disableInteraction = false }: YouTubeEmbedProps) {
  const videoId = useMemo(() => getYouTubeId(url), [url])
  const [origin, setOrigin] = useState('')

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  if (!videoId) {
    return (
      <div className={`flex items-center justify-center bg-brk-background/20 text-brk-muted text-xs ${className}`}>
        Invalid YouTube URL
      </div>
    )
  }

  const params = new URLSearchParams({
    rel: '0',
    controls: '0',
    modestbranding: '1',
    iv_load_policy: '3',
    fs: '0',
    disablekb: '1',
    playsinline: '1',
    loop: '1',
    enablejsapi: '1',
  })
  if (autoplay) params.set('autoplay', '1')
  if (muted) params.set('mute', '1')
  if (origin) params.set('origin', origin)

  return (
    <div className={`overflow-hidden relative ${className}`}>
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?${params.toString()}`}
        width={width}
        height={height}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen={!disableInteraction}
        className="w-full h-full"
        title="YouTube video"
      />
      {disableInteraction && <div className="absolute inset-0 z-10" />}
    </div>
  )
}
