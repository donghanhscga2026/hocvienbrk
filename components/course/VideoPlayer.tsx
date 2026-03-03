
'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { RotateCcw, CheckCircle } from 'lucide-react'

interface VideoPlayerProps {
    videoUrl: string | null
    playerId?: string
    initialMaxTime?: number   // Thời điểm xem dở từ DB
    initialPercent?: number   // % đã xem từ DB
    onProgress: (maxTime: number, duration: number) => void  // Chỉ gọi khi cần lưu (chuyển bài, rời trang)
    onPercentChange: (percent: number) => void  // UI update mượt mà mỗi 5s
    lessonContent?: string | null  // Nội dung bài học (link Google Docs hoặc HTML)
}

function extractVideoId(url: string) {
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
    const match = url.match(regExp)
    return match && match[2].length === 11 ? match[2] : null
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
    const isCompletedRef = useRef(false) // ref để tránh stale closure trong interval

    // Khởi tạo isCompleted ngay từ DB data — không chờ onReady
    const initCompleted = initialPercent !== undefined && initialPercent >= 99.9
    const [isCompleted, setIsCompleted] = useState(initCompleted)

    const videoId = videoUrl ? extractVideoId(videoUrl) : null

    // Sync ref với state
    const setCompleted = (val: boolean) => {
        isCompletedRef.current = val
        setIsCompleted(val)
    }

    // Track progress — chỉ cập nhật UI (không lưu DB)
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

    // Save progress to DB — gọi khi cần lưu thực sự
    const saveProgress = useCallback(() => {
        const player = playerRef.current
        if (!player?.getCurrentTime || !player?.getDuration) return
        const cur = player.getCurrentTime()
        const dur = player.getDuration()
        if (cur > 0 && dur > 0) {
            onProgress(cur, dur)
        }
    }, [onProgress])

    useEffect(() => {
        if (!videoId) return

        const handleMessage = (event: MessageEvent) => {
            if (event.origin !== 'https://www.youtube.com') return
        }

        // Lưu progress khi người dùng rời khỏi trang (refresh, đóng tab, chuyển trang)
        const handleBeforeUnload = () => {
            saveProgress()
        }
        window.addEventListener('message', handleMessage)
        window.addEventListener('beforeunload', handleBeforeUnload)
        window.addEventListener('pagehide', handleBeforeUnload)

        const initPlayer = () => {
            if (playerRef.current) {
                playerRef.current.destroy()
            }

            // Nếu đã xem hết → bắt đầu từ 0 thay vì seek tới cuối
            const startTime = initCompleted ? 0 : Math.floor(initialMaxTime)

            playerRef.current = new (window as any).YT.Player(playerId, {
                height: '100%',
                width: '100%',
                videoId,
                playerVars: {
                    autoplay: initCompleted ? 0 : 1, // Không autoplay nếu đã xem hết
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
                            // Đã xem hết: set completed, báo 100%, không autoplay
                            setCompleted(true)
                            onPercentChange(100)
                        } else {
                            onPercentChange(Math.round(pct))
                            startTracking()
                        }
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
                                onProgress(dur, dur)
                                onPercentChange(100)
                                setCompleted(true)
                            }
                        }
                    },
                    onError: (e: any) => {
                        console.error('YouTube player error:', e)
                    },
                },
            })
        }

        if ((window as any).YT?.Player) {
            initPlayer()
        } else {
            const prev = (window as any).onYouTubeIframeAPIReady
                ; (window as any).onYouTubeIframeAPIReady = () => {
                    if (typeof prev === 'function') prev()
                    initPlayer()
                }
            if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
                const tag = document.createElement('script')
                tag.src = 'https://www.youtube.com/iframe_api'
                document.head.appendChild(tag)
            }
        }

        return () => {
            window.removeEventListener('message', handleMessage)
            window.removeEventListener('beforeunload', handleBeforeUnload)
            window.removeEventListener('pagehide', handleBeforeUnload)
            stopTracking()
            playerRef.current?.destroy?.()
            playerRef.current = null
        }
    }, [videoId, saveProgress])

    const startTracking = () => {
        if (saveIntervalRef.current) return
        saveIntervalRef.current = setInterval(trackProgress, 5000) // Chỉ cập nhật UI mượt mà, KHÔNG lưu DB
    }

    const stopTracking = () => {
        if (saveIntervalRef.current) {
            clearInterval(saveIntervalRef.current)
            saveIntervalRef.current = null
        }
    }

    // Nhận diện mobile cho style
    const [isMobile, setIsMobile] = useState(false)
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 767px)')
        setIsMobile(mq.matches)
        const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
        mq.addEventListener('change', handler)
        return () => mq.removeEventListener('change', handler)
    }, [])

    // "Xem lại từ đầu": reset completed, seek về 0, bắt đầu track lại
    const handleRewatch = () => {
        setCompleted(false)
        playerRef.current?.seekTo?.(0, true)
        playerRef.current?.playVideo?.()
        startTracking()
    }

    // Kiểm tra nếu là link Google Docs/Drive
    const getEmbedUrl = (url: string | null | undefined) => {
        if (!url || !url.includes('docs.google.com')) return null
        const cleanUrl = url.split('/edit')[0].split('/view')[0].split('/preview')[0].replace(/\/+$/, '')
        return `${cleanUrl}/preview`
    }

    const embedUrl = getEmbedUrl(videoUrl) || getEmbedUrl(lessonContent)

    if (!videoId) {
        // Nếu có link Google Docs (ở videoUrl hoặc content) -> hiển thị embed
        if (embedUrl) {
            return (
                <div className="relative w-full aspect-video bg-white overflow-hidden rounded-xl border border-zinc-800 shadow-2xl">
                    <iframe
                        src={embedUrl}
                        className="absolute inset-0 w-full h-full"
                        allow="autoplay"
                        title="Tài liệu bài học"
                    />
                </div>
            )
        }

        // Nếu có HTML content -> hiển thị trực tiếp
        if (lessonContent) {
            return (
                <div className="w-full h-full min-h-[400px] bg-zinc-900 overflow-x-hidden overflow-y-auto p-6">
                    <div
                        className="prose prose-invert max-w-none text-zinc-300"
                        dangerouslySetInnerHTML={{ __html: lessonContent }}
                    />
                </div>
            )
        }

        // Không có gì -> hiển thị thông báo
        return (
            <div className="aspect-video bg-zinc-900 flex items-center justify-center">
                <p className="text-zinc-500 text-sm">Bài học này không có video hướng dẫn</p>
            </div>
        )
    }

    return (
        <div className="relative w-full aspect-video bg-black overflow-hidden">
            {/* Player — ẩn khi hiện màn hình hoàn thành */}
            <div className={isCompleted ? 'hidden' : 'w-full h-full relative'}>
                <div id={playerId} className="w-full h-full absolute inset-0" />
            </div>

            {/* Màn hình "Đã xem hết" */}
            {isCompleted && (
                <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center gap-3">
                    <CheckCircle className="w-12 h-12 sm:w-16 sm:h-16 text-emerald-500" />
                    <p className="text-white text-lg sm:text-xl font-bold">Video đã xem hết!</p>
                    <p className="text-zinc-400 text-xs sm:text-sm text-center px-4">
                        Hãy điền bài nộp để hoàn thành bài học.
                    </p>
                    <button
                        onClick={handleRewatch}
                        className="flex items-center gap-2 mt-1 px-5 py-2.5 rounded-full border border-zinc-600 text-zinc-300 hover:text-white hover:border-white transition-colors text-sm"
                    >
                        <RotateCcw className="w-4 h-4" /> Xem lại từ đầu
                    </button>
                </div>
            )}
        </div>
    )
}
