'use client'

import { useState, useCallback, useEffect } from 'react'
import VideoPlayer from './VideoPlayer'
import { Volume2, VolumeX, User, Play } from 'lucide-react'

interface AgentAvatarProps {
  videoUrl: string | null | undefined
}

export default function AgentAvatar({ videoUrl }: AgentAvatarProps) {
  const [muted, setMuted] = useState(false)
  const [videoEnded, setVideoEnded] = useState(false)
  const [playCount, setPlayCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setVideoEnded(false)
  }, [videoUrl])

  const handleLoadStart = useCallback(() => setLoading(true), [])
  const handleCanPlay = useCallback(() => setLoading(false), [])
  const handleEnded = useCallback(() => setVideoEnded(true), [])

  const handleReplay = useCallback(() => {
    setPlayCount(c => c + 1)
    setVideoEnded(false)
    setLoading(true)
  }, [])

  return (
    <div className="relative shrink-0">
      <div className="w-[100px] h-[100px] rounded-full overflow-hidden border-4 border-brk-primary shadow-lg shadow-brk-primary/20 bg-brk-background/20 flex items-center justify-center">
        {videoUrl ? (
          <div className="relative w-full h-full">
            {loading && (
              <div className="absolute inset-0 z-10 rounded-full bg-gradient-to-br from-brk-primary/5 via-brk-primary/10 to-brk-primary/5 animate-pulse transition-opacity duration-500" />
            )}
            <VideoPlayer
              key={playCount}
              url={videoUrl}
              className="w-full h-full"
              autoplay
              muted={muted}
              preload="auto"
              onEnded={handleEnded}
              onLoadStart={handleLoadStart}
              onCanPlay={handleCanPlay}
            />
          </div>
        ) : (
          <User className="w-10 h-10 text-brk-muted/40" />
        )}
      </div>
      {videoUrl && (
        <>
          {videoEnded && (
            <button
              onClick={handleReplay}
              className="absolute -bottom-1 -left-1 z-20 w-6 h-6 rounded-full bg-brk-surface border-2 border-brk-primary flex items-center justify-center text-brk-on-surface hover:bg-brk-primary/20 transition-colors shadow-md"
              title="Phát lại video"
            >
              <Play className="w-3 h-3" />
            </button>
          )}
          <button
            onClick={() => setMuted(!muted)}
            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-brk-surface border-2 border-brk-primary flex items-center justify-center text-brk-on-surface hover:bg-brk-primary/20 transition-colors shadow-md"
            title={muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
          >
            {muted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
          </button>
        </>
      )}
    </div>
  )
}
