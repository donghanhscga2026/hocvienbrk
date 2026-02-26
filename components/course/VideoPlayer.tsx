
'use client'

import { useEffect, useRef, useState } from 'react'
import { RotateCcw, CheckCircle } from 'lucide-react'

interface VideoPlayerProps {
    videoUrl: string | null
    initialMaxTime?: number  // Thời điểm xem dở từ DB
    onProgress: (maxTime: number, duration: number) => void
    onPercentChange: (percent: number) => void  // Cho AssignmentForm biết % realtime
}

function extractVideoId(url: string) {
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
    const match = url.match(regExp)
    return match && match[2].length === 11 ? match[2] : null
}

export default function VideoPlayer({ videoUrl, initialMaxTime = 0, onProgress, onPercentChange }: VideoPlayerProps) {
    const playerRef = useRef<any>(null)
    const saveIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const [isReady, setIsReady] = useState(false)
    const [isCompleted, setIsCompleted] = useState(false) // Video đã xem hết 100%
    const [isDone100, setIsDone100] = useState(false)     // Đã đạt >= 95%, dùng để không reset

    const videoId = videoUrl ? extractVideoId(videoUrl) : null

    // Nạp YouTube API
    useEffect(() => {
        if (!videoId) return

        const initPlayer = () => {
            if (playerRef.current) {
                playerRef.current.destroy()
            }

            playerRef.current = new (window as any).YT.Player('yt-player', {
                height: '100%',
                width: '100%',
                videoId,
                playerVars: {
                    autoplay: 1,  // Tự phát từ vị trí đã lưu (hoặc từ đầu nếu bài mới)
                    modestbranding: 1,
                    rel: 0,
                    start: Math.floor(initialMaxTime),
                },
                events: {
                    onReady: (e: any) => {
                        setIsReady(true)
                        const duration = e.target.getDuration()
                        const pct = duration > 0 ? initialMaxTime / duration : 0
                        // Nếu đã xem hết trước đó → hiện màn hình hoàn thành, báo 100% cho parent
                        if (pct >= 0.999) {
                            setIsCompleted(true)
                            setIsDone100(true)
                            onPercentChange(100) // ← fix: đồng bộ lên CoursePlayer
                        } else {
                            onPercentChange(Math.round(pct * 100))
                        }
                    },
                    onStateChange: (e: any) => {
                        const YT = (window as any).YT.PlayerState
                        if (e.data === YT.PLAYING) {
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
                                setIsDone100(true)
                            }
                        }
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
            stopTracking()
            playerRef.current?.destroy?.()
            playerRef.current = null
        }
    }, [videoId]) // Re-mount khi đổi bài

    const startTracking = () => {
        stopTracking()
        saveIntervalRef.current = setInterval(() => {
            const player = playerRef.current
            if (!player?.getCurrentTime || !player?.getDuration) return
            const cur = player.getCurrentTime()
            const dur = player.getDuration()
            if (dur > 0) {
                const pct = cur / dur
                onPercentChange(Math.round(pct * 100))
                onProgress(cur, dur)
                if (pct >= 0.999 && !isDone100) {
                    setIsCompleted(true)
                    setIsDone100(true)
                }
            }
        }, 2000) // Cập nhật mỗi 2 giây
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
            <div className={isCompleted ? 'hidden' : 'w-full h-full'}>
                <div id="yt-player" className="w-full h-full" />
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
