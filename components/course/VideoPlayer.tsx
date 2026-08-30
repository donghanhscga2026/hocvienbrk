'use client'

import { useEffect, useRef, useState, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react'
import {
    RotateCcw, CheckCircle, List, ChevronLeft, ChevronRight,
    Play, CheckCircle2, X, FileText, Clock, Loader2, PlayCircle, SkipBack, SkipForward, Maximize2
} from 'lucide-react'
import { cn } from "@/lib/utils"
import { detectVideoSource, isYouTube, VideoSource } from '@/lib/video-sources'
import LessonContentBox from './LessonContentBox'

export interface VideoPlayerHandle {
    /** Đọc vị trí phát video HIỆN TẠI (live), dùng để tính điểm ngay lúc bấm "Ghi nhận kết quả" */
    getLiveProgress: () => { maxTime: number; duration: number }
}

interface VideoPlayerProps {
    videoUrl: string | null
    lessonContent: string | null
    initialMaxTime: number
    onProgress: (maxTime: number, duration: number) => void
    onPercentChange: (percent: number) => void
    playlistData?: Record<number, { maxTime: number, duration: number }>
    lastVideoIndex?: number
    serverPlaylist?: PlaylistItem[]
    courseType?: string
    lessonType?: string
    contentImageUrl?: string | null
    canEditContent?: boolean
    onSaveContent?: (content: string, imageUrl: string | null) => Promise<{ success: boolean; message?: string }>
}

type PlaylistItem = {
    type: 'video' | 'doc' | 'text'
    title: string
    url: string
    source?: VideoSource
    content?: string
}

function trimDocUrl(url: string) {
    if (!url.includes('docs.google.com')) return url
    if (url.includes('/pub')) return url
    const cleanUrl = url.split('/edit')[0].split('/view')[0].split('/preview')[0].replace(/\/+$/, '')
    return `${cleanUrl}/preview`
}

function buildPlaylist(videoUrl: string | null, serverPlaylist: PlaylistItem[] | undefined, lessonType: string | undefined, lessonContent: string | null, canEditContent?: boolean): PlaylistItem[] {
    let base: PlaylistItem[] = []
    if (serverPlaylist && serverPlaylist.length > 0) {
        base = serverPlaylist.map(item => ({
            ...item,
            source: item.url ? detectVideoSource(item.url) : undefined,
        }))
    } else if (videoUrl) {
        base = videoUrl.split('|').map((item, index) => {
            const videoMatch = item.match(/^\[(.*?)\](.*)$/)
            if (videoMatch) {
                const url = videoMatch[2].trim()
                return { type: 'video' as const, title: videoMatch[1], url, source: detectVideoSource(url) }
            }
            const docMatch = item.match(/^\((.*?)\)(.*)$/)
            if (docMatch) {
                return { type: 'doc' as const, title: docMatch[1], url: docMatch[2].trim() }
            }
            const url = item.trim()
            // [FIX] Bài học loại DOCS lưu link thẳng (không cần bọc "(tiêu đề)")
            // — trước đây rơi vào nhánh video mặc định (platform "unknown"),
            // vừa bỏ lỡ trimDocUrl() (chuyển /edit → /preview để nhúng được),
            // vừa bị ép theo khung tỉ lệ video 16:9 quá thấp để đọc tài liệu.
            if (lessonType === 'DOCS') {
                return { type: 'doc' as const, title: `Phần ${index + 1}`, url }
            }
            return { type: 'video' as const, title: `Phần ${index + 1}`, url, source: detectVideoSource(url) }
        })
    }
    // [EDIT] Cho phép ADMIN/giáo viên thêm nội dung text lần đầu cho bài ALL
    // (bình thường chỉ chèn mục text khi đã có lessonContent).
    if (lessonType === 'ALL' && (lessonContent || canEditContent)) {
        return [
            { type: 'text' as const, title: 'Nội dung bài học', url: '', content: lessonContent || '' },
            ...base,
        ]
    }
    return base
}

function getYouTubeVideoId(item: PlaylistItem): string | null {
    if (item.source?.platform === 'youtube') return item.source.videoId
    if (isYouTube(item.url)) {
        const detected = detectVideoSource(item.url)
        return detected.videoId
    }
    return null
}

function PlayOverlay({ thumbnailUrl, onClick }: { thumbnailUrl?: string; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="group/play absolute inset-0 z-20 flex w-full h-full items-center justify-center bg-black"
            aria-label="Phát video"
        >
            {thumbnailUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumbnailUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" />
            )}
            <span className="relative z-10 flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-orange-500 shadow-2xl transition-transform group-hover/play:scale-110">
                <Play className="ml-1 h-8 w-8 sm:h-9 sm:w-9 fill-current text-white" />
            </span>
        </button>
    )
}

const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(function VideoPlayer({
    videoUrl,
    lessonContent,
    initialMaxTime,
    onProgress,
    onPercentChange,
    playlistData,
    lastVideoIndex = 0,
    serverPlaylist,
    courseType,
    lessonType,
    contentImageUrl,
    canEditContent,
    onSaveContent,
}, ref) {
    const playlist = useMemo(() => buildPlaylist(videoUrl, serverPlaylist, lessonType, lessonContent, canEditContent), [videoUrl, serverPlaylist, lessonType, lessonContent, canEditContent])
    const [currentIndex, setCurrentVideoIndex] = useState(lastVideoIndex < playlist.length ? lastVideoIndex : 0)
    // Bài học có ≥2 học phần → mở ra là thấy ngay danh sách học phần để chọn,
    // thay vì tự nhảy thẳng vào học phần đầu tiên khiến học viên không biết
    // còn học phần khác. Chỉ 1 học phần thì vào thẳng nội dung như cũ.
    const [showPlaylist, setShowPlaylist] = useState(() => playlist.length >= 2)
    const [isMounted, setIsMounted] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [docTimer, setDocTimer] = useState<number>(0)
    const [isReading, setIsReading] = useState(false)
    const [granularProgress, setGranularProgress] = useState<Record<number, { maxTime: number, duration: number }>>(() => playlistData || {})
    // [OPTIMIZE] Chỉ tải YouTube IFrame API / tự phát mp4 sau khi học viên bấm
    // Play lần đầu — trước đó hiện ảnh đại diện, tránh tải nặng + tự phát ngay
    // khi vừa vào trang bài học. Chuyển phần tiếp theo trong playlist vẫn tự
    // phát tiếp bình thường (không hỏi lại) vì hasStarted không đổi theo index.
    const [hasStarted, setHasStarted] = useState(false)
    const handleStartPlayback = useCallback(() => setHasStarted(true), [])
    type YTLikePlayer = { getCurrentTime?: () => number; getDuration?: () => number; destroy?: () => void }
    const playerRef = useRef<YTLikePlayer | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const saveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const docTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const videoContainerRef = useRef<HTMLDivElement>(null)
    const htmlVideoRef = useRef<HTMLVideoElement>(null)
    const currentItem = playlist[currentIndex]

    if (!currentItem) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                <div className="text-center p-8">
                    <FileText className="w-16 h-16 text-zinc-500 mx-auto mb-4" />
                    <p className="text-zinc-300 font-bold">Chưa có nội dung bài học</p>
                </div>
            </div>
        )
    }

    useEffect(() => { setIsMounted(true) }, [])

    // [FIX] YouTube IFrame API ném DOMException TimeoutError ("The operation was
    // aborted due to timeout") từ script nội bộ của youtube.com khi iframe bị gỡ
    // (chuyển bài học, bấm "Ẩn video"...) ngay giữa lúc đang handshake postMessage
    // để xác nhận player "ready". Đây là lỗi vô hại, không có API chính thức để hủy
    // handshake đó, nên ta nuốt riêng lỗi này để tránh log nhiễu / vỡ overlay dev.
    useEffect(() => {
        const swallowYouTubeTimeout = (e: PromiseRejectionEvent) => {
            const reason = e.reason
            if (reason instanceof DOMException && reason.name === 'TimeoutError') {
                e.preventDefault()
            }
        }
        window.addEventListener('unhandledrejection', swallowYouTubeTimeout)
        return () => window.removeEventListener('unhandledrejection', swallowYouTubeTimeout)
    }, [])

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsFullscreen(false)
        }
        window.addEventListener('keydown', handleEsc)
        return () => window.removeEventListener('keydown', handleEsc)
    }, [])

    const toggleFullScreen = () => setIsFullscreen(!isFullscreen)

    const calculateAggregateProgress = useCallback((updatedGranular: Record<number, { maxTime: number, duration: number }>) => {
        let totalMaxTime = 0
        let totalDuration = 0
        playlist.forEach((item, idx) => {
            const p = updatedGranular[idx] || { maxTime: 0, duration: item.type === 'doc' ? 30 : 0 }
            totalMaxTime += p.maxTime
            totalDuration += p.duration
        })
        if (totalDuration === 0) return { maxTime: initialMaxTime, duration: 0 }
        return { maxTime: totalMaxTime, duration: totalDuration }
    }, [playlist, initialMaxTime])

    // [PERF] Không còn ghi tiến độ video xuống DB liên tục — chỉ cập nhật state
    // cục bộ để hiển thị % xem trực tiếp. Điểm video được tính từ vị trí phát
    // LIVE tại đúng thời điểm bấm "Ghi nhận kết quả" (xem getLiveProgress).
    const saveProgress = useCallback((index: number, maxTime: number, duration: number) => {
        const nextGranular = { ...granularProgress, [index]: { maxTime, duration } }
        setGranularProgress(nextGranular)
        const aggregate = calculateAggregateProgress(nextGranular)
        onProgress(aggregate.maxTime, aggregate.duration)
        if (aggregate.duration > 0) {
            onPercentChange(Math.min(100, Math.round((aggregate.maxTime / aggregate.duration) * 100)))
        }
    }, [granularProgress, calculateAggregateProgress, onProgress, onPercentChange])

    const getLiveProgress = useCallback(() => {
        let liveMaxTime = granularProgress[currentIndex]?.maxTime ?? 0
        let liveDuration = granularProgress[currentIndex]?.duration ?? (currentItem?.type === 'doc' ? 30 : 0)

        if (currentItem?.type === 'video') {
            const source = currentItem.source || detectVideoSource(currentItem.url)
            if (source.platform === 'youtube' && playerRef.current?.getCurrentTime) {
                liveMaxTime = playerRef.current.getCurrentTime() ?? liveMaxTime
                liveDuration = playerRef.current.getDuration?.() ?? liveDuration
            } else if (source.platform === 'mp4' && htmlVideoRef.current) {
                liveMaxTime = htmlVideoRef.current.currentTime ?? liveMaxTime
                liveDuration = htmlVideoRef.current.duration || liveDuration
            }
        } else if (currentItem?.type === 'doc') {
            liveMaxTime = docTimer
            liveDuration = 30
        }

        const merged = { ...granularProgress, [currentIndex]: { maxTime: liveMaxTime, duration: liveDuration } }
        return calculateAggregateProgress(merged)
    }, [currentIndex, currentItem, granularProgress, docTimer, calculateAggregateProgress])

    useImperativeHandle(ref, () => ({ getLiveProgress }), [getLiveProgress])

    const trackYouTubeProgress = useCallback(() => {
        const currentTime = playerRef.current?.getCurrentTime?.() ?? 0
        const duration = playerRef.current?.getDuration?.() ?? 0
        const currentStored = granularProgress[currentIndex] || { maxTime: 0, duration: 0 }
        if (currentTime > currentStored.maxTime) saveProgress(currentIndex, currentTime, duration)
    }, [currentIndex, granularProgress, saveProgress])

    const trackMp4Progress = useCallback(() => {
        const video = htmlVideoRef.current
        if (!video) return
        const currentTime = video.currentTime
        const duration = video.duration
        if (!duration || !isFinite(duration)) return
        const currentStored = granularProgress[currentIndex] || { maxTime: 0, duration: 0 }
        if (currentTime > currentStored.maxTime) saveProgress(currentIndex, currentTime, duration)
    }, [currentIndex, granularProgress, saveProgress])

    const onMp4Ended = useCallback(() => {
        const video = htmlVideoRef.current
        if (!video) return
        const dur = video.duration || 0
        saveProgress(currentIndex, dur, dur)
    }, [currentIndex, saveProgress])

    const initYouTubePlayer = useCallback((item: PlaylistItem): (() => void) | undefined => {
        const videoId = getYouTubeVideoId(item)
        if (!videoId || !videoContainerRef.current) return

        const stored = granularProgress[currentIndex] || { maxTime: 0, duration: 0 }
        const startTime = Math.floor(stored.maxTime)

        const player = new (window as any).YT.Player(videoContainerRef.current, {
            videoId,
            height: '100%',
            width: '100%',
            playerVars: {
                autoplay: 1,
                modestbranding: 1,
                rel: 0,
                start: startTime,
                origin: window.location.origin,
                fs: 0,
            },
            events: {
                onStateChange: (e: { data?: number }) => {
                    const YTState = (window as any).YT.PlayerState
                    if (e.data === YTState.PLAYING) {
                        if (!saveIntervalRef.current) saveIntervalRef.current = setInterval(trackYouTubeProgress, 5000)
                    } else {
                        if (saveIntervalRef.current) { clearInterval(saveIntervalRef.current); saveIntervalRef.current = null }
                    }
                    if (e.data === YTState.ENDED) {
                        const dur = (player as any)?.getDuration ? (player as any).getDuration() : 0
                        saveProgress(currentIndex, dur, dur)
                    }
                },
            },
        })
        playerRef.current = player
    }, [currentIndex, granularProgress, saveProgress, trackYouTubeProgress])

    const initMp4Player = useCallback((): (() => void) | undefined => {
        const video = htmlVideoRef.current
        if (!video) return

        const stored = granularProgress[currentIndex] || { maxTime: 0, duration: 0 }
        if (stored.maxTime > 0) {
            video.currentTime = stored.maxTime
        }

        const onTimeupdate = () => {
            if (!saveIntervalRef.current) {
                saveIntervalRef.current = setInterval(trackMp4Progress, 5000)
            }
        }
        const onPause = () => {
            if (saveIntervalRef.current) { clearInterval(saveIntervalRef.current); saveIntervalRef.current = null }
        }

        video.addEventListener('timeupdate', onTimeupdate)
        video.addEventListener('pause', onPause)
        video.addEventListener('ended', onMp4Ended)

        video.play().catch(() => { })

        return () => {
            video.removeEventListener('timeupdate', onTimeupdate)
            video.removeEventListener('pause', onPause)
            video.removeEventListener('ended', onMp4Ended)
            if (saveIntervalRef.current) { clearInterval(saveIntervalRef.current); saveIntervalRef.current = null }
        }
    }, [currentIndex, granularProgress, trackMp4Progress, onMp4Ended])

    useEffect(() => {
        if (currentItem?.type !== 'video' || !isMounted || !hasStarted) return

        const source = currentItem.source || detectVideoSource(currentItem.url)

        let cleanup: (() => void) | undefined
        // [FIX] Cờ hủy: nếu effect này đã cleanup (đổi bài / unmount) trước khi
        // script YouTube API kịp tải xong và gọi onYouTubeIframeAPIReady, không
        // được khởi tạo player nữa — tránh tạo player "mồ côi" trên container đã
        // gỡ, một trong các nguyên nhân gây race condition dẫn tới TimeoutError.
        let cancelled = false

        if (source.platform === 'youtube') {
            const doInit = () => {
                if (cancelled) return
                if (cleanup) cleanup()
                cleanup = initYouTubePlayer(currentItem)
            }
            if ((window as any).YT && (window as any).YT.Player) {
                doInit()
            } else {
                if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
                    const tag = document.createElement('script')
                    tag.src = 'https://www.youtube.com/iframe_api'
                    document.head.appendChild(tag)
                }
                const originalCallback = (window as any).onYouTubeIframeAPIReady
                    ; (window as any).onYouTubeIframeAPIReady = () => {
                        if (originalCallback) originalCallback()
                        doInit()
                    }
            }
        } else if (source.platform === 'mp4') {
            cleanup = initMp4Player()
        }

        return () => {
            cancelled = true
            if (saveIntervalRef.current) {
                clearInterval(saveIntervalRef.current)
                saveIntervalRef.current = null
            }
            if (playerRef.current && typeof playerRef.current.destroy === 'function') {
                try {
                    playerRef.current.destroy()
                } catch {
                    // destroy() có thể ném lỗi nếu player chưa kịp "ready" — bỏ qua.
                }
            }
            playerRef.current = null
            if (cleanup) cleanup()
        }
    }, [currentIndex, isMounted, hasStarted, currentItem?.type, currentItem?.url])

    useEffect(() => {
        if (currentItem?.type === 'doc') {
            const currentStored = granularProgress[currentIndex] || { maxTime: 0, duration: 30 }
            if (currentStored.maxTime < 30) {
                setDocTimer(currentStored.maxTime)
                setIsReading(true)
                docTimerRef.current = setInterval(() => {
                    setDocTimer(prev => {
                        const next = prev + 1
                        if (next >= 30) {
                            if (docTimerRef.current) { clearInterval(docTimerRef.current) }
                            setIsReading(false)
                            saveProgress(currentIndex, 30, 30)
                            return 30
                        }
                        if (next % 5 === 0) saveProgress(currentIndex, next, 30)
                        return next
                    })
                }, 1000)
            } else { setDocTimer(30); setIsReading(false) }
        }
        return () => { if (docTimerRef.current) clearInterval(docTimerRef.current) }
    }, [currentIndex, currentItem?.type])

    const handleNext = () => setCurrentVideoIndex((prev) => (prev + 1) % playlist.length)
    const handlePrev = () => setCurrentVideoIndex((prev) => (prev - 1 + playlist.length) % playlist.length)

    if (!isMounted) return <div className="w-full aspect-video bg-black animate-pulse" />

    const renderVideo = () => {
        const source = currentItem.source || detectVideoSource(currentItem.url)

        if (source.platform === 'youtube') {
            const videoId = getYouTubeVideoId(currentItem)
            return (
                <div className="relative w-full h-full flex-1 group">
                    <div key={currentIndex} className="absolute inset-0 w-full h-full">
                        <div ref={videoContainerRef} />
                    </div>
                    {!hasStarted && (
                        <PlayOverlay
                            thumbnailUrl={videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : undefined}
                            onClick={handleStartPlayback}
                        />
                    )}
                    {courseType === 'LIB' && (
                        <div className="absolute top-0 left-0 right-0 h-[65px] z-[90] bg-transparent opacity-0 cursor-default" title="Video được bảo vệ" onContextMenu={(e) => e.preventDefault()} />
                    )}
                </div>
            )
        }

        if (source.platform === 'mp4') {
            return (
                <div className="relative w-full h-full flex-1 bg-black flex items-center justify-center">
                    <video
                        ref={htmlVideoRef}
                        src={source.embedUrl || currentItem.url}
                        className="w-full h-full object-contain"
                        controls
                        playsInline
                        preload="metadata"
                    />
                    {!hasStarted && <PlayOverlay onClick={handleStartPlayback} />}
                </div>
            )
        }

        if (source.platform === 'vimeo' || source.platform === 'dailymotion' || source.platform === 'tiktok' || source.platform === 'facebook' || source.platform === 'drive') {
            return (
                <div className="relative w-full h-full flex-1 bg-black flex items-center justify-center">
                    <iframe
                        src={source.embedUrl || currentItem.url}
                        className="w-full h-full border-0"
                        allow="autoplay; fullscreen; picture-in-picture"
                        allowFullScreen
                        title={currentItem.title}
                    />
                </div>
            )
        }

        if (source.platform === 'unknown' && currentItem.url) {
            return (
                <div className="relative w-full h-full flex-1 bg-black flex items-center justify-center">
                    <iframe
                        src={source.embedUrl || currentItem.url}
                        className="w-full h-full border-0"
                        allow="autoplay; fullscreen"
                        allowFullScreen
                        title={currentItem.title}
                    />
                </div>
            )
        }

        return (
            <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                <p className="text-zinc-300 text-sm">Không hỗ trợ định dạng video này</p>
            </div>
        )
    }

    const renderNonVideo = () => {
        if (currentItem?.type === 'text') {
            return (
                <LessonContentBox
                    variant="framed"
                    content={currentItem.content || lessonContent || ''}
                    imageUrl={contentImageUrl}
                    canEdit={!!canEditContent}
                    onSave={onSaveContent || (async () => ({ success: false, message: 'Không thể lưu' }))}
                />
            )
        }
        return (
            <div className="w-full h-full bg-white relative flex flex-col">
                <iframe src={trimDocUrl(currentItem.url)} className="flex-1 border-0" allow="autoplay" title="Tài liệu" />
                {isReading && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-zinc-200 z-10">
                        <div className="h-full bg-orange-500 transition-all duration-1000" style={{ width: `${(docTimer / 30) * 100}%` }} />
                    </div>
                )}
            </div>
        )
    }

    // Nội dung dùng chung của panel "Danh sách học phần" — khung bọc ngoài
    // khác nhau tuỳ chế độ toàn màn hình hay không (xem chỗ gọi).
    const renderPlaylistPanelBody = () => (
        <>
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 shrink-0">
                <h3 className="text-gray-900 font-black text-xs flex items-center gap-1.5 min-w-0">
                    <List className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                    <span className="truncate">Có {playlist.length} học phần trong bài này</span>
                </h3>
                <button onClick={() => setShowPlaylist(false)} className="shrink-0 p-1.5 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-all"><X className="w-3.5 h-3.5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar">
                {playlist.map((item, idx) => {
                    const isCurrent = idx === currentIndex
                    const isVideo = item.type === 'video'
                    return (
                        <button key={idx} onClick={() => { setCurrentVideoIndex(idx); setShowPlaylist(false) }} className={`w-full flex items-center gap-2 py-1.5 px-2 rounded-lg transition-all border ${isCurrent ? 'bg-orange-50 border-orange-400' : 'bg-white border-transparent hover:bg-gray-50'}`}>
                            <div className={`shrink-0 w-5 h-5 rounded-md flex items-center justify-center ${isCurrent ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                {isVideo ? <Play className="w-2.5 h-2.5 fill-current" /> : <FileText className="w-2.5 h-2.5" />}
                            </div>
                            <p className={`flex-1 text-left text-xs font-bold truncate ${isCurrent ? 'text-orange-600' : 'text-gray-700'}`}>
                                {item.title}
                            </p>
                        </button>
                    )
                })}
            </div>
        </>
    )

    return (
        <div className={cn(
            "flex flex-col bg-zinc-950 transition-all duration-300",
            isFullscreen ? "fixed inset-0 z-[9999] h-screen w-screen" : "w-full"
        )}>
            <div className={cn(
                "relative bg-black overflow-hidden shadow-2xl transition-all",
                // [REVERT] Khung hiển thị phải giữ ĐÚNG 1 kích thước/tỉ lệ (aspect-video)
                // cho MỌI loại nội dung (video/text/docs) — không đổi kích thước theo
                // loại, để không xô lệch bố cục các phần khác đã canh sẵn xung quanh.
                // Nội dung text/docs dài hơn khung thì tự cuộn BÊN TRONG khung đó
                // (đã có overflow-y-auto/iframe riêng), không phải mở rộng khung ra.
                isFullscreen ? "fixed inset-0 z-[9999] flex flex-col" : "w-full aspect-video"
            )}>
                {currentItem?.type === 'video' ? renderVideo() : renderNonVideo()}

                {/* Toàn màn hình thì khung video CHÍNH LÀ toàn bộ viewport (fixed
                    inset-0) — không có khái niệm "dưới khung" nữa nên vẫn phải hiện
                    đè lên trên như cũ. Chỉ khi KHÔNG toàn màn hình mới tách hẳn panel
                    ra ngoài, xuống dưới khung (xem khối bên dưới). */}
                {isFullscreen && showPlaylist && (
                    <div className="absolute inset-x-0 top-0 z-50 max-h-[70vh] flex flex-col bg-white text-gray-900 rounded-b-2xl shadow-2xl animate-in slide-in-from-top duration-300">
                        {renderPlaylistPanelBody()}
                    </div>
                )}
            </div>

            {!isFullscreen && showPlaylist && (
                // [FIX] Nằm NGAY DƯỚI khung video, ở luồng bố cục bình thường (không
                // "absolute" đè lên trên) — không che nội dung/video đang hiển thị bên
                // trong khung nữa. Tự co giãn theo số lượng học phần, tối đa 70% chiều
                // cao giao diện hiển thị (max-h-[70vh] tính tới đáy, không phải theo
                // khung video), vượt quá thì tự cuộn bên trong. Nền/màu chữ đảo ngược
                // so với giao diện chính để nổi bật rõ đây là 1 lớp chọn lựa tạm thời.
                <div className="max-h-[70vh] flex flex-col bg-white text-gray-900 shadow-lg animate-in slide-in-from-top duration-300 z-40">
                    {renderPlaylistPanelBody()}
                </div>
            )}

            <div className="bg-zinc-900 border-t border-zinc-700 px-4 py-2.5 flex items-center justify-between gap-2 sm:gap-4">
                <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => setShowPlaylist(!showPlaylist)} className="flex items-center gap-2 px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white rounded-lg transition-all border border-zinc-600 shadow-sm">
                        <List className="w-4 h-4 text-brk-accent" />
                        <span className="text-[10px] font-black uppercase tracking-tighter hidden sm:inline">Các học phần của bài học ({currentIndex + 1}/{playlist.length})</span>
                    </button>
                </div>

                <div className="flex-1 flex flex-col items-center min-w-0 px-1">
                    <div className="flex items-center gap-1.5 max-w-full">
                        {currentItem?.type === 'video' ? <PlayCircle className="w-3 h-3 text-zinc-400 shrink-0" /> : <FileText className="w-3 h-3 text-zinc-400 shrink-0" />}
                        <p className="text-[10px] sm:text-[11px] font-black text-orange-400 truncate tracking-tight uppercase">{currentItem?.title}</p>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        {currentItem?.type === 'doc' ? (
                            isReading ? (
                                <span className="flex items-center gap-1 text-[8px] sm:text-[9px] text-zinc-400 font-bold uppercase"><Clock className="w-2.5 h-2.5 animate-spin" /> {30 - docTimer}s</span>
                            ) : (
                                <span className="flex items-center gap-1 text-[8px] sm:text-[9px] text-orange-400 font-bold uppercase"><CheckCircle2 className="w-2.5 h-2.5" /> Xong</span>
                            )
                        ) : (
                            <span className="text-[8px] sm:text-[9px] text-zinc-400 font-bold uppercase tracking-widest">
                                {currentItem?.source?.platform === 'youtube' ? 'YouTube' :
                                    currentItem?.source?.platform === 'mp4' ? 'MP4' :
                                        currentItem?.source?.platform === 'vimeo' ? 'Vimeo' :
                                            currentItem?.source?.platform === 'dailymotion' ? 'Dailymotion' :
                                                currentItem?.source?.platform === 'tiktok' ? 'TikTok' :
                                                    currentItem?.source?.platform === 'facebook' ? 'Facebook' :
                                                        currentItem?.source?.platform === 'drive' ? 'Google Drive' : 'Video'}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                    <button onClick={handlePrev} className="p-1.5 sm:p-2 bg-zinc-800 hover:bg-orange-500 text-zinc-300 hover:text-white rounded-lg transition-all border border-zinc-600 active:scale-90"><SkipBack className="w-3.5 h-3.5 sm:w-4 h-4" /></button>
                    <button onClick={handleNext} className="p-1.5 sm:p-2 bg-zinc-800 hover:bg-orange-500 text-zinc-300 hover:text-white rounded-lg transition-all border border-zinc-600 active:scale-90"><SkipForward className="w-3.5 h-3.5 sm:w-4 h-4" /></button>
                    <button onClick={toggleFullScreen} className="p-1.5 sm:p-2 bg-orange-500/20 hover:bg-orange-500 text-orange-400 hover:text-white rounded-lg transition-all border border-orange-400/30 active:scale-90 ml-1" title="Xem toàn màn hình">
                        <Maximize2 className="w-3.5 h-3.5 sm:w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    )
})

VideoPlayer.displayName = 'VideoPlayer'

export default VideoPlayer