
'use client'

import { useEffect, useRef, useState } from 'react'
import { RotateCcw, CheckCircle } from 'lucide-react'

interface VideoPlayerProps {
    videoUrl: string | null
    initialMaxTime?: number  // Thời điểm xem dở từ DB
    initialPercent?: number   // % đã xem từ DB (nếu có)
    onProgress: (maxTime: number, duration: number) => void
    onPercentChange: (percent: number) => void  // Cho AssignmentForm biết % realtime
}

function extractVideoId(url: string) {
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
    const match = url.match(regExp)
    return match && match[2].length === 11 ? match[2] : null
}

export default function VideoPlayer({ videoUrl, initialMaxTime = 0, initialPercent, onProgress, onPercentChange }: VideoPlayerProps) {
    const playerRef = useRef<any>(null)
    const saveIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const [isReady, setIsReady] = useState(false)
    const [isCompleted, setIsCompleted] = useState(false) // Video đã xem hết 100%

    const videoId = videoUrl ? extractVideoId(videoUrl) : null

    // Track video progress
    const trackProgress = () => {
        const player = playerRef.current
        if (!player?.getCurrentTime || !player?.getDuration) return
        const cur = player.getCurrentTime()
        const dur = player.getDuration()
        if (dur > 0) {
            const pct = cur / dur
            onPercentChange(Math.round(pct * 100))
            onProgress(cur, dur)
            if (pct >= 0.999 && !isCompleted) {
                setIsCompleted(true)
            }
        }
    }

    // Nạp YouTube API
    useEffect(() => {
        if (!videoId) return

        // Handle postMessage errors from YouTube
        const handleMessage = (event: MessageEvent) => {
            if (event.origin !== 'https://www.youtube.com') return
            // Silently ignore errors
        }
        window.addEventListener('message', handleMessage)

        const initPlayer = () => {
            if (playerRef.current) {
                playerRef.current.destroy()
            }

            playerRef.current = new (window as any).YT.Player('yt-player', {
                height: '100%',
                width: '100%',
                videoId,
                playerVars: {
                    autoplay: 1,
                    modestbranding: 1,
                    rel: 0,
                    start: Math.floor(initialMaxTime),
                    playsinline: 1,
                    enablejsapi: 1,
                },
                events: {
                    onReady: (e: any) => {
                        setIsReady(true)
                        const duration = e.target.getDuration()
                        
                        // Tính % ban đầu: ưu tiên initialPercent, sau đó tính từ initialMaxTime/duration
                        let pct = 0
                        if (initialPercent !== undefined) {
                            pct = initialPercent
                        } else if (initialMaxTime > 0 && duration > 0) {
                            pct = (initialMaxTime / duration) * 100
                        }
                        
                        // Nếu đã xem hết trước đó → hiện màn hình hoàn thành
                        if (pct >= 99.9) {
                            setIsCompleted(true)
                            onPercentChange(100)
                        } else {
                            onPercentChange(Math.round(pct))
                        }
                        
                        // Luôn bắt đầu tracking để cập nhật % khi user xem tiếp
                        startTracking()
                    },
                    onStateChange: (e: any) => {
                        const YT = (window as any).YT.PlayerState
                        if (e.data === YT.PLAYING || e.data === YT.BUFFERING) {
                            startTracking()
                        } else {
                            stopTracking()
                        }
                        if (e.data === YT.ENDED) {
                            const dur = playerRef.current?.getDuration?.() || 0
                            if (dur > 0) {
                                onProgress(dur, dur) // Đánh dấu 100%
                                onPercentChange(100)
                                setIsCompleted(true)
                            }
                        }
                    },
                    onError: (e: any) => {
                        console.error('YouTube player error:', e)
                    }
                }
            })
        }

        if ((window as any).YT?.Player) {
            initPlayer()
        } else {
            const tag = document.createElement('script')
            tag.src = 'https://www.youtube.com/iframe_api'
                ; (window as any).onYouTubeIframeAPIReady = initPlayer
            document.head.appendChild(tag)
        }

        return () => {
            window.removeEventListener('message', handleMessage)
            stopTracking()
            playerRef.current?.destroy?.()
            playerRef.current = null
        }
    }, [videoId]) // Re-mount khi đổi bài

    const startTracking = () => {
        if (saveIntervalRef.current) return // Đã đang chạy
        saveIntervalRef.current = setInterval(trackProgress, 1000)
    }

    const stopTracking = () => {
        if (saveIntervalRef.current) {
            clearInterval(saveIntervalRef.current)
            saveIntervalRef.current = null
        }
    }

    const handleRewatch = () => {
        setIsCompleted(false)
        playerRef.current?.seekTo?.(0, true)
        playerRef.current?.playVideo?.()
    }

    if (!videoId) {
        return (
            <div className="aspect-video bg-zinc-900 flex items-center justify-center rounded-xl border border-zinc-800">
                <p className="text-zinc-500">Bài học này không có video hướng dẫn</p>
            </div>
        )
    }

    return (
        <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden border border-zinc-800 shadow-2xl">
            {/* Player ẩn đi khi hiện màn hình hoàn thành */}
            <div className={isCompleted ? 'hidden' : 'w-full h-full relative'}>
                <div id="yt-player" className="w-full h-full absolute inset-0" />
            </div>

            {/* Màn hình "Đã xem hết" */}
            {isCompleted && (
                <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center gap-4">
                    <CheckCircle className="w-16 h-16 text-emerald-500" />
                    <p className="text-white text-xl font-bold">Video đã xem hết!</p>
                    <p className="text-zinc-400 text-sm">Hãy điền bài nộp bên phải để hoàn thành bài học.</p>
                    <button
                        onClick={handleRewatch}
                        className="flex items-center gap-2 mt-2 px-5 py-2.5 rounded-full border border-zinc-600 text-zinc-300 hover:text-white hover:border-white transition-colors"
                    >
                        <RotateCcw className="w-4 h-4" /> Xem lại từ đầu
                    </button>
                </div>
            )}
        </div>
    )
}
