'use client'

import { useMemo } from 'react'

interface VideoPlayerProps {
  url: string
  className?: string
  autoplay?: boolean
  muted?: boolean
  loop?: boolean
  preload?: 'none' | 'metadata' | 'auto'
  onEnded?: () => void
  onLoadStart?: () => void
  onCanPlay?: () => void
}

function isYouTubeUrl(url: string): boolean {
  return /(?:youtube\.com|youtu\.be)/i.test(url)
}

export function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/)
  if (match) return match[1]
  const shortsMatch = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/)
  if (shortsMatch) return shortsMatch[1]
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url
  return null
}

export default function VideoPlayer({ url, className = '', autoplay = false, muted = false, loop = false, preload = 'metadata', onEnded, onLoadStart, onCanPlay }: VideoPlayerProps) {
  const isYt = useMemo(() => isYouTubeUrl(url), [url])
  const videoId = useMemo(() => isYt ? getYouTubeId(url) : null, [url, isYt])

  if (isYt && videoId) {
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

    return (
      <div className={`overflow-hidden relative ${className}`}>
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?${params.toString()}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen={false}
          className="w-full h-full"
          title="video"
        />
        <div className="absolute inset-0 z-10" />
      </div>
    )
  }

  return (
    <div className={`overflow-hidden relative ${className}`}>
      <video
        src={url}
        autoPlay={autoplay}
        loop={loop}
        muted={muted}
        preload={preload}
        playsInline
        disablePictureInPicture
        onEnded={onEnded}
        onLoadStart={onLoadStart}
        onCanPlay={onCanPlay}
        className="w-full h-full object-cover pointer-events-none"
        style={{ WebkitMediaControls: 'none' } as any}
      />
    </div>
  )
}
