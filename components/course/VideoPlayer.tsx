'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { RotateCcw, CheckCircle } from 'lucide-react'
import { normalizeGoogleDocsHtml } from "@/lib/normalizeGoogleDocsHtml"
import ImageViewer from "@/components/ImageViewer"


interface VideoPlayerProps {
  videoUrl: string | null
  playerId?: string
  initialMaxTime?: number
  initialPercent?: number
  onProgress: (maxTime: number, duration: number) => void
  onPercentChange: (percent: number) => void
  lessonContent?: string | null
}

/* --------------------------
   YOUTUBE LOGIC (GIỮ NGUYÊN)
--------------------------- */

function extractVideoId(url: string) {
  const regExp =
    /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
  const match = url.match(regExp)
  return match && match[2].length === 11 ? match[2] : null
}

/* --------------------------
   GOOGLE DOCS HELPER
--------------------------- */

function getDocsHtmlUrl(url: string | null | undefined) {
  if (!url || !url.includes('docs.google.com')) return null
  const match = url.match(/document\/d\/([^/]+)/)
  if (!match) return null
  const docId = match[1]
  return `https://docs.google.com/document/d/${docId}/export?format=html`
}

export default function VideoPlayer({
  videoUrl,
  playerId = 'yt-player',
  initialMaxTime = 0,
  initialPercent,
  onProgress,
  onPercentChange,
  lessonContent,
}: VideoPlayerProps) {
  const playerRef = useRef<any>(null)
  const saveIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isCompletedRef = useRef(false)

  

  const [isCompleted, setIsCompleted] = useState(false)
  const [docHtml, setDocHtml] = useState<string | null>(null)
  const [isLoadingDoc, setIsLoadingDoc] = useState(false)
const [mounted, setMounted] = useState(false)

  const videoId = videoUrl ? extractVideoId(videoUrl) : null

  const setCompleted = (val: boolean) => {
    isCompletedRef.current = val
    setIsCompleted(val)
  }

  const trackProgress = () => {
    const player = playerRef.current
    if (!player?.getCurrentTime || !player?.getDuration) return
    const cur = player.getCurrentTime()
    const dur = player.getDuration()
    if (dur > 0) {
      const pct = cur / dur
      onPercentChange(Math.round(pct * 100))
      if (pct >= 0.999 && !isCompletedRef.current) {
        setCompleted(true)
      }
    }
  }

  const saveProgress = useCallback(() => {
    const player = playerRef.current
    if (!player?.getCurrentTime || !player?.getDuration) return
    const cur = player.getCurrentTime()
    const dur = player.getDuration()
    if (cur > 0 && dur > 0) {
      onProgress(cur, dur)
    }
  }, [onProgress])

  /* --------------------------
     GOOGLE DOCS FETCH
  --------------------------- */

  useEffect(() => {
  const docsUrl = getDocsHtmlUrl(lessonContent || videoUrl)
  if (!docsUrl) return

  setIsLoadingDoc(true)

  fetch(`/api/docs?url=${encodeURIComponent(docsUrl)}`)
    .then((res) => res.text())
    .then((html) => {
  const clean = normalizeGoogleDocsHtml(html)
  setDocHtml(clean)
})

    .catch(() => {
      setDocHtml('')
    })
    .finally(() => {
      setIsLoadingDoc(false)
    })
}, [lessonContent, videoUrl])
useEffect(() => {
  setMounted(true)
}, [])


  /* --------------------------
     YOUTUBE INIT (GIỮ NGUYÊN)
  --------------------------- */

  useEffect(() => {
    if (!videoId) return

    const handleBeforeUnload = () => {
      saveProgress()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('pagehide', handleBeforeUnload)

    const initPlayer = () => {
      if (playerRef.current) {
        playerRef.current.destroy()
      }

      const startTime = Math.floor(initialMaxTime)


      playerRef.current = new (window as any).YT.Player(
        playerId,
        {
          height: '100%',
          width: '100%',
          videoId,
          playerVars: {
            autoplay: 1,
            modestbranding: 1,
            rel: 0,
            start: startTime,
            playsinline: 1,
            enablejsapi: 1,
            fs: 1,
          },
          events: {
            onReady: (e: any) => {
              const duration = e.target.getDuration()
              let pct = 0

              if (initialPercent !== undefined) {
                pct = initialPercent
              } else if (initialMaxTime > 0 && duration > 0) {
                pct = (initialMaxTime / duration) * 100
              }

              if (pct >= 99.9) {
                setCompleted(true)
                onPercentChange(100)
              } else {
                onPercentChange(Math.round(pct))
                startTracking()
              }
            },
            onStateChange: (e: any) => {
              const YT = (window as any).YT.PlayerState
              if (
                e.data === YT.PLAYING ||
                e.data === YT.BUFFERING
              ) {
                startTracking()
              } else {
                stopTracking()
              }

              if (e.data === YT.ENDED) {
                const dur =
                  playerRef.current?.getDuration?.() || 0
                if (dur > 0) {
                  onProgress(dur, dur)
                  onPercentChange(100)
                  setCompleted(true)
                }
              }
            },
          },
        }
      )
    }

    if ((window as any).YT?.Player) {
      initPlayer()
    } else {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(tag)
      ;(window as any).onYouTubeIframeAPIReady =
        initPlayer
    }

    return () => {
      window.removeEventListener(
        'beforeunload',
        handleBeforeUnload
      )
      window.removeEventListener(
        'pagehide',
        handleBeforeUnload
      )
      stopTracking()
      playerRef.current?.destroy?.()
      playerRef.current = null
    }
  }, [videoId, saveProgress])

  const startTracking = () => {
    if (saveIntervalRef.current) return
    saveIntervalRef.current = setInterval(
      trackProgress,
      5000
    )
  }

  const stopTracking = () => {
    if (saveIntervalRef.current) {
      clearInterval(saveIntervalRef.current)
      saveIntervalRef.current = null
    }
  }

  const handleRewatch = () => {
    setCompleted(false)
    playerRef.current?.seekTo?.(0, true)
    playerRef.current?.playVideo?.()
    startTracking()
  }

  /* --------------------------
     RENDER LOGIC
  --------------------------- */

  // 👉 Nếu không phải YouTube mà là Google Docs
  if (!videoId) {
  return (
    <><div className="relative w-full aspect-video bg-zinc-900 overflow-hidden rounded-xl">
          <div className="absolute inset-0 overflow-y-auto p-6">

              {!mounted && (
  <div className="flex items-center justify-center h-full text-zinc-500">
    Đang khởi tạo...
  </div>
)}

{mounted && isLoadingDoc && (
  <div className="flex items-center justify-center h-full text-zinc-400">
    Đang tải nội dung bài học...
  </div>
)}

{mounted && !isLoadingDoc && docHtml && (
  <div
    className="prose prose-invert max-w-none text-zinc-300"
    dangerouslySetInnerHTML={{ __html: docHtml }}
  />
)}

{mounted && !isLoadingDoc && !docHtml && (
  <div className="flex items-center justify-center h-full text-zinc-500">
    Bài học này không có nội dung
  </div>
)}


          </div>
      </div><ImageViewer /></>
  )
}

  // 👉 YouTube Player
  return (
    <div className="relative w-full aspect-video bg-black overflow-hidden">
      <div
        className={
          isCompleted
            ? 'hidden'
            : 'w-full h-full relative'
        }
      >
        <div
          id={playerId}
          className="w-full h-full absolute inset-0"
        />
      </div>

      {isCompleted && (
        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center gap-3">
          <CheckCircle className="w-16 h-16 text-emerald-500" />
          <p className="text-white text-xl font-bold">
            Video đã xem hết!
          </p>
          <button
            onClick={handleRewatch}
            className="flex items-center gap-2 px-5 py-2 rounded-full border border-zinc-600 text-zinc-300 hover:text-white hover:border-white transition"
          >
            <RotateCcw className="w-4 h-4" />
            Xem lại từ đầu
          </button>
        </div>
      )}
    </div>
  )
}
