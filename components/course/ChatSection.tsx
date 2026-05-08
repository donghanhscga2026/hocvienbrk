'use client'

import { useState, useEffect, useRef, useMemo, useOptimistic, useTransition } from 'react'
import { getCommentsByLesson, createComment } from '@/app/actions/comment-actions'
import { Send, LogIn, Loader2, MessageCircle } from 'lucide-react'
import Link from 'next/link'

interface Comment {
    id: number | string
    content: string
    createdAt: Date
    userId: number
    userName: string | null
    userAvatar: string | null
    sending?: boolean
}

interface ChatSectionProps {
    lessonId: string
    session: any
}

// Tách component nhỏ để tối ưu re-render
const CommentItem = ({ comment }: { comment: Comment }) => {
    const getInitials = (name: string | null) => {
        if (!name) return '?'
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    }

    return (
        <div className={`mb-3 group transition-opacity ${comment.sending ? 'opacity-50' : 'opacity-100'}`}>
            <div className="flex gap-3">
                <div className="shrink-0">
                    {comment.userAvatar ? (
                        <img
                            src={comment.userAvatar}
                            alt={comment.userName || 'User'}
                            className="w-8 h-8 rounded-full object-cover border border-zinc-800"
                        />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-xs font-bold text-black">
                            {getInitials(comment.userName)}
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                        <span className="text-sm font-semibold text-white">
                            {comment.userName || 'Người dùng'}
                        </span>
                        <span className="text-[10px] text-zinc-500">
                            {formatTime(comment.createdAt)}
                        </span>
                        {comment.sending && <span className="text-[9px] text-yellow-500 italic">Đang gửi...</span>}
                    </div>
                    <p className="text-[13px] italic text-zinc-300 mt-0.5 break-words leading-relaxed">
                        {comment.content}
                    </p>
                </div>
            </div>
        </div>
    )
}

export default function ChatSection({ lessonId, session }: ChatSectionProps) {
    const [comments, setComments] = useState<Comment[]>([])
    const [loading, setLoading] = useState(true)
    const [isPending, startTransition] = useTransition()
    const [newComment, setNewComment] = useState('')
    const [error, setError] = useState('')
    const commentsEndRef = useRef<HTMLDivElement>(null)

    // Optimistic UI: Hiển thị ngay lập tức khi nhấn gửi
    const [optimisticComments, addOptimisticComment] = useOptimistic(
        comments,
        (state: Comment[], newItem: Comment) => [...state, newItem]
    )

    // Cache comments theo lessonId
    const commentCache = useRef<Map<string, Comment[]>>(new Map())

    useEffect(() => {
        if (commentCache.current.has(lessonId)) {
            setComments(commentCache.current.get(lessonId)!)
            setLoading(false)
            return
        }

        setLoading(true)
        getCommentsByLesson(lessonId).then(data => {
            const mapped = data.map((c: any) => ({
                ...c,
                createdAt: new Date(c.createdAt)
            })) as Comment[]
            
            commentCache.current.set(lessonId, mapped)
            setComments(mapped)
            setLoading(false)
        })
    }, [lessonId])

    useEffect(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [optimisticComments])

    async function handleSendComment(e: React.FormEvent) {
        e.preventDefault()
        const content = newComment.trim()
        if (!content || !session?.user) return

        setNewComment('')
        setError('')

        // 1. Tạo bản tin nhắn tạm thời (Optimistic)
        const tempId = Date.now().toString()
        const tempComment: Comment = {
            id: tempId,
            content: content,
            createdAt: new Date(),
            userId: parseInt(session.user.id),
            userName: session.user.name || session.user.studentId || 'Bạn',
            userAvatar: session.user.image || null,
            sending: true
        }

        // 2. Cập nhật UI ngay lập tức
        startTransition(async () => {
            addOptimisticComment(tempComment)
            
            // 3. Gọi server action
            const result = await createComment(lessonId, content)

            if (result.success && result.comment) {
                const newEntry = {
                    ...result.comment,
                    createdAt: new Date(result.comment.createdAt)
                } as Comment
                
                // 4. Cập nhật state chính thức sau khi server trả về
                setComments(prev => {
                    const updated = [...prev, newEntry]
                    commentCache.current.set(lessonId, updated)
                    return updated
                })
            } else {
                setError(result.message || 'Gửi thất bại. Vui lòng thử lại.')
            }
        })
    }

    const groupedComments = useMemo(() => {
        const map: Record<string, Comment[]> = {}
        optimisticComments.forEach(comment => {
            const dateKey = new Date(comment.createdAt).toDateString()
            if (!map[dateKey]) map[dateKey] = []
            map[dateKey].push(comment)
        })
        return map
    }, [optimisticComments])

    const formatDate = (dateKey: string) => {
        const date = new Date(dateKey)
        const today = new Date()
        if (date.toDateString() === today.toDateString()) return 'Hôm nay'
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        if (date.toDateString() === yesterday.toDateString()) return 'Hôm qua'
        return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
    }

    return (
        <div className="flex flex-col h-full bg-zinc-950">
            <div className="shrink-0 px-4 py-3 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-yellow-400" />
                    Tương tác
                    <span className="text-zinc-500 font-normal text-xs">({optimisticComments.length})</span>
                </h3>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 custom-scrollbar">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <Loader2 className="h-6 w-6 animate-spin text-yellow-400" />
                        <span className="text-xs text-zinc-500">Đang tải nội dung...</span>
                    </div>
                ) : optimisticComments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center mb-3">
                            <MessageCircle className="h-6 w-6 text-zinc-700" />
                        </div>
                        <p className="text-zinc-500 text-sm font-medium">Chưa có bình luận nào</p>
                        <p className="text-zinc-600 text-xs mt-1">Hãy là người đầu tiên bắt đầu cuộc trò chuyện!</p>
                    </div>
                ) : (
                    Object.entries(groupedComments).map(([dateKey, dateComments]) => (
                        <div key={dateKey} className="mb-6">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="h-px flex-1 bg-zinc-800/50"></div>
                                <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                                    {formatDate(dateKey)}
                                </span>
                                <div className="h-px flex-1 bg-zinc-800/50"></div>
                            </div>
                            {dateComments.map(comment => (
                                <CommentItem key={comment.id} comment={comment} />
                            ))}
                        </div>
                    ))
                )}
                <div ref={commentsEndRef} className="h-4" />
            </div>

            <div className="shrink-0 border-t border-zinc-800 bg-zinc-900/80 p-3 backdrop-blur-md">
                {session?.user ? (
                    <form onSubmit={handleSendComment} className="relative flex items-center">
                        <input
                            type="text"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Nhập nội dung tương tác..."
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl pl-4 pr-12 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 transition-all"
                            disabled={isPending}
                        />
                        <button
                            type="submit"
                            disabled={!newComment.trim() || isPending}
                            className="absolute right-1.5 w-8 h-8 rounded-xl bg-yellow-400 text-black flex items-center justify-center disabled:opacity-30 disabled:grayscale hover:bg-yellow-300 transition-all active:scale-90"
                        >
                            {isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                        </button>
                    </form>
                ) : (
                    <div className="bg-zinc-800/50 rounded-xl py-3 px-4 border border-zinc-700/50 text-center">
                        <Link
                            href="/login"
                            className="inline-flex items-center gap-2 text-sm font-semibold text-yellow-400 hover:text-yellow-300 transition-colors"
                        >
                            <LogIn className="h-4 w-4" />
                            Đăng nhập để tham gia tương tác
                        </Link>
                    </div>
                )}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2 mt-2">
                        <p className="text-red-400 text-[10px] text-center font-medium">{error}</p>
                    </div>
                )}
            </div>
        </div>
    )
}
