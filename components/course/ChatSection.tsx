'use client'

import { useState, useEffect, useRef } from 'react'
import { getCommentsByLesson, createComment } from '@/app/actions/comment-actions'
import { auth } from '@/auth'
import { Send, LogIn, Loader2, MessageCircle } from 'lucide-react'
import Link from 'next/link'

interface Comment {
    id: number
    content: string
    createdAt: Date
    userId: number
    userName: string | null
    userAvatar: string | null
}

interface ChatSectionProps {
    lessonId: string
    session: any
}

export default function ChatSection({ lessonId, session }: ChatSectionProps) {
    const [comments, setComments] = useState<Comment[]>([])
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)
    const [newComment, setNewComment] = useState('')
    const [error, setError] = useState('')
    const commentsEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        loadComments()
    }, [lessonId])

    useEffect(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [comments])

    async function loadComments() {
        setLoading(true)
        const data = await getCommentsByLesson(lessonId)
        setComments(data.map((c: any) => ({
            ...c,
            createdAt: new Date(c.createdAt)
        })) as Comment[])
        setLoading(false)
    }

    async function handleSendComment(e: React.FormEvent) {
        e.preventDefault()
        if (!newComment.trim()) return

        setSending(true)
        setError('')

        const result = await createComment(lessonId, newComment)

        if (result.success && result.comment) {
            setComments(prev => [...prev, result.comment as Comment])
            setNewComment('')
        } else {
            setError(result.message || 'Có lỗi xảy ra')
        }

        setSending(false)
    }

    function formatTime(date: Date) {
        return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    }

    function formatDate(date: Date) {
        const today = new Date()
        const isToday = date.toDateString() === today.toDateString()
        
        if (isToday) return 'Hôm nay'
        
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        if (date.toDateString() === yesterday.toDateString()) return 'Hôm qua'
        
        return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
    }

    function getInitials(name: string | null) {
        if (!name) return '?'
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }

    // Group comments by date
    const groupedComments: { [key: string]: Comment[] } = {}
    comments.forEach(comment => {
        const dateKey = comment.createdAt.toDateString()
        if (!groupedComments[dateKey]) {
            groupedComments[dateKey] = []
        }
        groupedComments[dateKey].push(comment)
    })

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="shrink-0 px-4 py-3 border-b border-zinc-800 bg-zinc-900">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-yellow-400" />
                    Tương tác
                    <span className="text-zinc-500 font-normal text-xs">({comments.length})</span>
                </h3>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
                    </div>
                ) : comments.length === 0 ? (
                    <div className="text-center py-8">
                        <MessageCircle className="h-10 w-10 text-zinc-700 mx-auto mb-2" />
                        <p className="text-zinc-500 text-sm">Chưa có bình luận nào</p>
                        <p className="text-zinc-600 text-xs">Hãy là người đầu tiên!</p>
                    </div>
                ) : (
                    Object.entries(groupedComments).map(([dateKey, dateComments]) => (
                        <div key={dateKey}>
                            <div className="text-center mb-3">
                                <span className="text-[10px] text-zinc-500 bg-zinc-800 px-2 py-1 rounded-full">
                                    {formatDate(new Date(dateKey))}
                                </span>
                            </div>
                            {dateComments.map(comment => (
                                <div key={comment.id} className="mb-3 group">
                                    <div className="flex gap-3">
                                        {/* Avatar */}
                                        <div className="shrink-0">
                                            {comment.userAvatar ? (
                                                <img 
                                                    src={comment.userAvatar} 
                                                    alt={comment.userName || 'User'}
                                                    className="w-8 h-8 rounded-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-xs font-bold text-black">
                                                    {getInitials(comment.userName)}
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-sm font-semibold text-white">
                                                    {comment.userName || 'Người dùng'}
                                                </span>
                                                <span className="text-[10px] text-zinc-500">
                                                    ID: {comment.userId}
                                                </span>
                                                <span className="text-[10px] text-zinc-600">
                                                    {formatTime(comment.createdAt)}
                                                </span>
                                            </div>
                                            <p className="text-sm text-zinc-300 mt-0.5 break-words">
                                                {comment.content}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))
                )}
                <div ref={commentsEndRef} />
            </div>

            {/* Input Area */}
            <div className="shrink-0 border-t border-zinc-800 bg-zinc-900 p-3">
                {session?.user ? (
                    <form onSubmit={handleSendComment} className="flex gap-2">
                        <input
                            type="text"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Nhập bình luận..."
                            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-full px-4 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                            disabled={sending}
                        />
                        <button
                            type="submit"
                            disabled={!newComment.trim() || sending}
                            className="shrink-0 w-10 h-10 rounded-full bg-yellow-400 text-black flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-yellow-300 transition-colors"
                        >
                            {sending ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <Send className="h-5 w-5" />
                            )}
                        </button>
                    </form>
                ) : (
                    <div className="text-center py-2">
                        <Link
                            href="/login"
                            className="inline-flex items-center gap-2 text-sm text-yellow-400 hover:text-yellow-300 transition-colors"
                        >
                            <LogIn className="h-4 w-4" />
                            Đăng nhập để bình luận
                        </Link>
                    </div>
                )}
                {error && (
                    <p className="text-red-400 text-xs text-center mt-2">{error}</p>
                )}
            </div>
        </div>
    )
}
