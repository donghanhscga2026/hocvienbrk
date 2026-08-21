'use client'

import { useState, useEffect, useRef, useMemo, useOptimistic, useTransition, memo } from 'react'
import { getCommentsByLesson, createComment } from '@/app/actions/comment-actions'
import { Send, LogIn, Loader2, MessageCircle, X } from 'lucide-react'
import { useAccountAssistant } from '@/components/auth/AccountAssistantContext'

interface Comment {
    id: number | string
    content: string
    createdAt: Date
    userId: number
    userName: string | null
    userAvatar: string | null
    parentId?: number | string | null
    sending?: boolean
}

interface ChatSectionProps {
    lessonId: string
    session: any
}

// Tách component nhỏ để tối ưu re-render
const CommentItem = ({ comment, isReply, onReply }: { comment: Comment; isReply?: boolean; onReply?: (comment: Comment) => void }) => {
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
                            className={`rounded-full object-cover border border-zinc-800 ${isReply ? 'w-6 h-6' : 'w-8 h-8'}`}
                        />
                    ) : (
                        <div className={`rounded-full bg-yellow-400 flex items-center justify-center font-bold text-black ${isReply ? 'w-6 h-6 text-[10px]' : 'w-8 h-8 text-xs'}`}>
                            {getInitials(comment.userName)}
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                        <span className={`font-semibold text-white ${isReply ? 'text-[13px]' : 'text-sm'}`}>
                            {comment.userName || 'Người dùng'}
                        </span>
                        <span className="text-[10px] text-zinc-400">
                            {formatTime(comment.createdAt)}
                        </span>
                        {comment.sending && <span className="text-[9px] text-yellow-500 italic">Đang gửi...</span>}
                    </div>
                    <p className="text-[13px] italic text-zinc-200 mt-0.5 break-words leading-relaxed">
                        {comment.content}
                    </p>
                    {onReply && !comment.sending && (
                        <button
                            onClick={() => onReply(comment)}
                            className="mt-1 text-[11px] font-semibold text-zinc-300 hover:text-yellow-400 transition-colors"
                        >
                            ↩ Trả lời
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

function ChatSection({ lessonId, session }: ChatSectionProps) {
    const [comments, setComments] = useState<Comment[]>([])
    const [loading, setLoading] = useState(true)
    const [isPending, startTransition] = useTransition()
    const [newComment, setNewComment] = useState('')
    const [error, setError] = useState('')
    const [replyingTo, setReplyingTo] = useState<{ id: number | string; userName: string | null } | null>(null)
    const commentsEndRef = useRef<HTMLDivElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const { openAssistant } = useAccountAssistant()

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
        setReplyingTo(null)
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

        const parentId = replyingTo?.id
        setNewComment('')
        setError('')
        setReplyingTo(null)

        // 1. Tạo bản tin nhắn tạm thời (Optimistic)
        const tempId = Date.now().toString()
        const tempComment: Comment = {
            id: tempId,
            content: content,
            createdAt: new Date(),
            userId: parseInt(session.user.id),
            userName: session.user.name || session.user.studentId || 'Bạn',
            userAvatar: session.user.image || null,
            parentId: parentId ?? null,
            sending: true
        }

        // 2. Cập nhật UI ngay lập tức
        startTransition(async () => {
            addOptimisticComment(tempComment)

            // 3. Gọi server action
            const result = await createComment(lessonId, content, typeof parentId === 'number' ? parentId : null)

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

    function handleReplyClick(comment: Comment) {
        // Luôn quy về gốc thread (không lồng quá 1 cấp) — trả lời 1 reply cũng
        // gắn parentId vào bình luận GỐC của thread đó, chỉ đổi tên hiển thị trong chip.
        const threadRootId = (typeof comment.parentId === 'number' ? comment.parentId : comment.id)
        setReplyingTo({ id: threadRootId as number, userName: comment.userName })
        textareaRef.current?.focus()
    }

    // Tách bình luận gốc (parentId null) và reply, gom reply theo threadRoot để
    // hiển thị thụt lề bên dưới bình luận gốc thay vì trộn lẫn theo thời gian.
    const { topLevelComments, repliesByParent } = useMemo(() => {
        const top: Comment[] = []
        const replies: Record<string, Comment[]> = {}
        optimisticComments.forEach(comment => {
            if (comment.parentId) {
                const key = String(comment.parentId)
                if (!replies[key]) replies[key] = []
                replies[key].push(comment)
            } else {
                top.push(comment)
            }
        })
        return { topLevelComments: top, repliesByParent: replies }
    }, [optimisticComments])

    const groupedComments = useMemo(() => {
        const map: Record<string, Comment[]> = {}
        topLevelComments.forEach(comment => {
            const dateKey = new Date(comment.createdAt).toDateString()
            if (!map[dateKey]) map[dateKey] = []
            map[dateKey].push(comment)
        })
        return map
    }, [topLevelComments])

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
                    <span className="text-zinc-400 font-normal text-xs">({optimisticComments.length})</span>
                </h3>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 custom-scrollbar">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <Loader2 className="h-6 w-6 animate-spin text-yellow-400" />
                        <span className="text-xs text-zinc-400">Đang tải nội dung...</span>
                    </div>
                ) : optimisticComments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center mb-3">
                            <MessageCircle className="h-6 w-6 text-zinc-600" />
                        </div>
                        <p className="text-zinc-300 text-sm font-medium">Chưa có bình luận nào</p>
                        <p className="text-zinc-400 text-xs mt-1">Hãy là người đầu tiên bắt đầu cuộc trò chuyện!</p>
                    </div>
                ) : (
                    Object.entries(groupedComments).map(([dateKey, dateComments]) => (
                        <div key={dateKey} className="mb-6">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="h-px flex-1 bg-zinc-800/50"></div>
                                <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
                                    {formatDate(dateKey)}
                                </span>
                                <div className="h-px flex-1 bg-zinc-800/50"></div>
                            </div>
                            {dateComments.map(comment => (
                                <div key={comment.id}>
                                    <CommentItem comment={comment} onReply={session?.user ? handleReplyClick : undefined} />
                                    {repliesByParent[String(comment.id)]?.length > 0 && (
                                        <div className="ml-11 pl-3 border-l-2 border-zinc-800 -mt-1">
                                            {repliesByParent[String(comment.id)].map(reply => (
                                                <CommentItem key={reply.id} comment={reply} isReply onReply={session?.user ? handleReplyClick : undefined} />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ))
                )}
                <div ref={commentsEndRef} className="h-4" />
            </div>

            <div className="shrink-0 border-t border-zinc-800 bg-zinc-900/80 p-3 backdrop-blur-md">
                {session?.user ? (
                    <>
                    {replyingTo && (
                        <div className="flex items-center justify-between gap-2 mb-2 pl-3 pr-2 py-1.5 rounded-xl bg-zinc-800/70 border border-zinc-700">
                            <span className="text-[11px] text-zinc-300 truncate">
                                ↩ Đang trả lời <span className="font-semibold text-yellow-400">{replyingTo.userName || 'Người dùng'}</span>
                            </span>
                            <button
                                type="button"
                                onClick={() => setReplyingTo(null)}
                                className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    )}
                    <form onSubmit={handleSendComment} className="relative flex items-end gap-2">
                        <textarea
                            ref={textareaRef}
                            value={newComment}
                            onChange={(e) => {
                                setNewComment(e.target.value)
                                // Auto-resize
                                e.target.style.height = 'auto'
                                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
                            }}
                            onKeyDown={(e) => {
                                // Enter thuần = xuống dòng (không submit)
                                // Không có action nào submit khi nhấn Enter
                            }}
                            placeholder={replyingTo ? `Trả lời ${replyingTo.userName || 'người dùng'}...` : "Nhập nội dung tương tác... (Enter để xuống dòng, bấm nút ➤ để gửi)"}
                            rows={1}
                            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-2xl pl-4 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 transition-all resize-none overflow-hidden leading-relaxed"
                            style={{ minHeight: '42px', maxHeight: '120px' }}
                            disabled={isPending}
                        />
                        <button
                            type="submit"
                            disabled={!newComment.trim() || isPending}
                            className="shrink-0 w-9 h-9 rounded-xl bg-yellow-400 text-black flex items-center justify-center disabled:opacity-30 disabled:grayscale hover:bg-yellow-300 transition-all active:scale-90 mb-0.5"
                        >
                            {isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                        </button>
                    </form>
                    </>
                ) : (
                    <div className="bg-zinc-800/50 rounded-xl py-3 px-4 border border-zinc-700/50 text-center">
                        <button
                            onClick={openAssistant}
                            className="inline-flex items-center gap-2 text-sm font-semibold text-yellow-400 hover:text-yellow-300 transition-colors"
                        >
                            <LogIn className="h-4 w-4" />
                            Đăng nhập để tham gia tương tác
                        </button>
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

export default memo(ChatSection)
