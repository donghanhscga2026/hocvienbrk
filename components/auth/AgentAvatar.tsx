'use client'

import { useState, useCallback } from 'react'
import VideoPlayer from './VideoPlayer'
import { Volume2, VolumeX, User, Play } from 'lucide-react'

interface AgentAvatarProps {
  videoUrl: string | null | undefined
}

export default function AgentAvatar({ videoUrl }: AgentAvatarProps) {
  const [muted, setMuted] = useState(false)
  const [videoEnded, setVideoEnded] = useState(false)
  const [playCount, setPlayCount] = useState(0)

  const handleEnded = useCallback(() => setVideoEnded(true), [])

  const handleReplay = useCallback(() => {
    setPlayCount(c => c + 1)
    setVideoEnded(false)
  }, [])

  return (
    <div className="relative shrink-0">
      <div className="w-[150px] h-[150px] rounded-full overflow-hidden border-4 border-brk-primary shadow-lg shadow-brk-primary/20 bg-brk-background/20 flex items-center justify-center">
        {videoUrl ? (
          <div className="relative w-full h-full">
            <VideoPlayer
              key={playCount}
              url={videoUrl}
              className="w-full h-full"
              autoplay
              muted={muted}
              onEnded={handleEnded}
            />
          </div>
        ) : (
          <User className="w-16 h-16 text-brk-muted/40" />
        )}
      </div>
      {videoUrl && (
        <>
          {videoEnded && (
            <button
              onClick={handleReplay}
              className="absolute -bottom-1 -left-1 z-20 w-8 h-8 rounded-full bg-brk-surface border-2 border-brk-primary flex items-center justify-center text-brk-on-surface hover:bg-brk-primary/20 transition-colors shadow-md"
              title="Phát lại video"
            >
              <Play className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setMuted(!muted)}
            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-brk-surface border-2 border-brk-primary flex items-center justify-center text-brk-on-surface hover:bg-brk-primary/20 transition-colors shadow-md"
            title={muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </>
      )}
    </div>
  )
}
