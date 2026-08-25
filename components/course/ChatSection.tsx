'use client'

import { useState, useEffect, useRef, useMemo, useOptimistic, useTransition, memo } from 'react'
import { getCommentsByLesson, createComment, updateComment } from '@/app/actions/comment-actions'
import { Send, LogIn, Loader2, MessageCircle, X, Bold, Palette, Type, Smile, Image as ImageIcon } from 'lucide-react'
import { useAccountAssistant } from '@/components/auth/AccountAssistantContext'
import {
    formatCommentContent,
    wrapSelection,
    insertAtCursor,
    COLOR_PRESETS,
    SIZE_PRESETS,
    EMOJI_PRESETS,
} from '@/lib/comment-format'

interface Comment {
    id: number | string
    content: string
    imageUrl?: string | null
    createdAt: Date
    editedAt?: Date | null
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

interface CommentItemProps {
    comment: Comment
    isReply?: boolean
    onReply?: (comment: Comment) => void
    isOwner?: boolean
    isBeingEdited?: boolean
    onStartEdit?: (comment: Comment) => void
}

// Tách component nhỏ để tối ưu re-render
const CommentItem = ({
    comment, isReply, onReply,
    isOwner, isBeingEdited, onStartEdit,
}: CommentItemProps) => {
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
                        {comment.editedAt && !comment.sending && (
                            <span className="text-[10px] text-zinc-500 italic">(đã chỉnh sửa)</span>
                        )}
                        {comment.sending && <span className="text-[9px] text-yellow-500 italic">Đang gửi...</span>}
                    </div>

                    {isBeingEdited ? (
                        <p className="text-[11px] text-yellow-400 italic mt-0.5">✎ Đang sửa ở ô soạn thảo bên dưới...</p>
                    ) : (
                        <>
                            {comment.content && (
                                <p
                                    className="text-[13px] text-zinc-200 mt-0.5 break-words leading-relaxed text-justify"
                                    dangerouslySetInnerHTML={{ __html: formatCommentContent(comment.content) }}
                                />
                            )}
                            {comment.imageUrl && (
                                <img
                                    src={comment.imageUrl}
                                    alt="Hình ảnh đính kèm"
                                    className="mt-1.5 max-w-[220px] max-h-[220px] rounded-lg border border-zinc-800 object-cover cursor-zoom-in"
                                    onClick={() => window.open(comment.imageUrl!, '_blank')}
                                />
                            )}
                            {!comment.sending && (
                                <div className="flex items-center gap-3 mt-1">
                                    {onReply && (
                                        <button
                                            onClick={() => onReply(comment)}
                                            className="text-[11px] font-semibold text-zinc-300 hover:text-yellow-400 transition-colors"
                                        >
                                            ↩ Trả lời
                                        </button>
                                    )}
                                    {isOwner && (
                                        <button
                                            onClick={() => onStartEdit?.(comment)}
                                            className="text-[11px] font-semibold text-zinc-300 hover:text-yellow-400 transition-colors"
                                        >
                                            ✎ Sửa
                                        </button>
                                    )}
                                </div>
                            )}
                        </>
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
    // [EXPAND] Ô nhập bình luận: hover (desktop) hoặc đang gõ (mọi thiết bị) thì
    // mở rộng thành overlay lớn để soạn thảo dễ hơn — cùng cơ chế với ô "Bồi
    // Nhân" trong AssignmentForm (mục 2 của Ghi nhận).
    const [commentHovering, setCommentHovering] = useState(false)
    const [commentFocused, setCommentFocused] = useState(false)
    const commentExpanded = commentHovering || commentFocused

    // [EDIT] Sửa bình luận của chính mình — dùng LẠI ô soạn thảo mở rộng (cùng
    // toolbar định dạng/ảnh như lúc viết bình luận mới), chỉ đổi hành vi Gửi
    // sang gọi updateComment() thay vì createComment() khi editingId != null.
    const [editingId, setEditingId] = useState<number | string | null>(null)
    const currentUserId = session?.user?.id ? parseInt(session.user.id) : null
    const commentsEndRef = useRef<HTMLDivElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const { openAssistant } = useAccountAssistant()

    // [FORMAT] Toolbar định dạng đơn giản — chỉ hiện khi đã mở rộng (đủ chỗ).
    const [activePopover, setActivePopover] = useState<'color' | 'size' | 'emoji' | null>(null)
    const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null)
    const [uploadingImage, setUploadingImage] = useState(false)
    const [uploadError, setUploadError] = useState('')

    const closeCommentExpand = () => {
        textareaRef.current?.blur()
        setCommentHovering(false)
        setCommentFocused(false)
        setActivePopover(null)
    }

    // Nút ĐÓNG / bấm ra ngoài overlay: nếu đang sửa 1 bình luận thì huỷ luôn
    // thao tác sửa (xoá nội dung đang gõ dở), khác với lúc soạn bình luận MỚI
    // (đóng chỉ thu gọn, vẫn giữ nháp).
    const handleCloseComposer = () => {
        if (editingId != null) {
            setEditingId(null)
            setNewComment('')
            setPendingImageUrl(null)
            setUploadError('')
        }
        closeCommentExpand()
    }

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

    // Áp dụng 1 thao tác định dạng (đậm/màu/cỡ chữ/emoji) vào vùng đang chọn
    // trong textarea, rồi khôi phục vị trí con trỏ sau khi React render lại.
    function applyFormat(kind: 'bold' | { color: string } | { size: string } | { emoji: string }) {
        const ta = textareaRef.current
        if (!ta) return
        const start = ta.selectionStart ?? newComment.length
        const end = ta.selectionEnd ?? newComment.length

        let result
        if (kind === 'bold') {
            result = wrapSelection(newComment, start, end, '**', '**', 'chữ đậm')
        } else if ('color' in kind) {
            result = wrapSelection(newComment, start, end, `{{c:${kind.color}}}`, '{{/c}}', 'chữ màu')
        } else if ('size' in kind) {
            result = wrapSelection(newComment, start, end, `{{s:${kind.size}}}`, '{{/s}}', 'chữ cỡ khác')
        } else {
            result = insertAtCursor(newComment, start, end, kind.emoji)
        }

        setNewComment(result.text)
        setActivePopover(null)
        requestAnimationFrame(() => {
            ta.focus()
            ta.setSelectionRange(result.cursorStart, result.cursorEnd)
        })
    }

    async function handleImageFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        e.target.value = '' // cho phép chọn lại cùng 1 file lần sau
        if (!file) return

        setUploadError('')
        setUploadingImage(true)
        try {
            const formData = new FormData()
            formData.append('file', file)
            const res = await fetch('/api/upload/comment', { method: 'POST', body: formData })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Tải ảnh thất bại')
            setPendingImageUrl(data.url)
        } catch (err: any) {
            setUploadError(err.message || 'Tải ảnh thất bại')
        } finally {
            setUploadingImage(false)
        }
    }

    async function handleSendComment(e: React.FormEvent) {
        e.preventDefault()
        const content = newComment.trim()
        if ((!content && !pendingImageUrl) || !session?.user) return

        // [EDIT] Đang sửa 1 bình luận có sẵn — gọi updateComment() thay vì tạo mới.
        if (editingId != null) {
            if (typeof editingId !== 'number') return
            const targetId = editingId
            const imageUrl = pendingImageUrl
            setNewComment('')
            setPendingImageUrl(null)
            setUploadError('')
            setError('')
            setEditingId(null)
            closeCommentExpand()

            startTransition(async () => {
                const result = await updateComment(targetId, content, imageUrl)
                if (result.success && result.comment) {
                    setComments(prev => {
                        const updated = prev.map(c => c.id === targetId
                            ? {
                                ...c,
                                content: result.comment!.content,
                                imageUrl: result.comment!.imageUrl,
                                editedAt: result.comment!.editedAt ? new Date(result.comment!.editedAt) : c.editedAt
                            }
                            : c)
                        commentCache.current.set(lessonId, updated)
                        return updated
                    })
                } else {
                    setError(result.message || 'Cập nhật thất bại. Vui lòng thử lại.')
                }
            })
            return
        }

        const parentId = replyingTo?.id
        const imageUrl = pendingImageUrl
        setNewComment('')
        setPendingImageUrl(null)
        setUploadError('')
        setError('')
        setReplyingTo(null)
        // Gửi = gửi rồi tự thu gọn lại (khác với Đóng — chỉ thu gọn, không gửi)
        closeCommentExpand()

        // 1. Tạo bản tin nhắn tạm thời (Optimistic)
        const tempId = Date.now().toString()
        const tempComment: Comment = {
            id: tempId,
            content: content,
            imageUrl,
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
            const result = await createComment(lessonId, content, typeof parentId === 'number' ? parentId : null, imageUrl)

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
        // Đang sửa dở 1 bình luận khác thì huỷ luôn thao tác sửa trước khi
        // chuyển sang trả lời (2 việc dùng chung 1 ô soạn thảo, không thể lẫn).
        if (editingId != null) {
            setEditingId(null)
            setNewComment('')
            setPendingImageUrl(null)
        }
        // Luôn quy về gốc thread (không lồng quá 1 cấp) — trả lời 1 reply cũng
        // gắn parentId vào bình luận GỐC của thread đó, chỉ đổi tên hiển thị trong chip.
        const threadRootId = (typeof comment.parentId === 'number' ? comment.parentId : comment.id)
        setReplyingTo({ id: threadRootId as number, userName: comment.userName })
        setCommentFocused(true)
        textareaRef.current?.focus()
    }

    // Mở LẠI ô soạn thảo mở rộng (giống lúc viết bình luận mới — đầy đủ
    // toolbar định dạng/ảnh), nạp sẵn nội dung + ảnh của bình luận đang sửa.
    function handleStartEdit(comment: Comment) {
        setReplyingTo(null)
        setUploadError('')
        setError('')
        setEditingId(comment.id)
        setNewComment(comment.content)
        setPendingImageUrl(comment.imageUrl || null)
        setCommentFocused(true)
        requestAnimationFrame(() => textareaRef.current?.focus())
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
                                    <CommentItem
                                        comment={comment}
                                        onReply={session?.user ? handleReplyClick : undefined}
                                        isOwner={currentUserId != null && comment.userId === currentUserId}
                                        isBeingEdited={editingId === comment.id}
                                        onStartEdit={handleStartEdit}
                                    />
                                    {repliesByParent[String(comment.id)]?.length > 0 && (
                                        <div className="ml-11 pl-3 border-l-2 border-zinc-800 -mt-1">
                                            {repliesByParent[String(comment.id)].map(reply => (
                                                <CommentItem
                                                    key={reply.id}
                                                    comment={reply}
                                                    isReply
                                                    onReply={session?.user ? handleReplyClick : undefined}
                                                    isOwner={currentUserId != null && reply.userId === currentUserId}
                                                    isBeingEdited={editingId === reply.id}
                                                    onStartEdit={handleStartEdit}
                                                />
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

            {/* [FIX] KHÔNG dùng backdrop-blur (backdrop-filter) trên div này — theo
                spec CSS, backdrop-filter/filter/transform tạo containing block MỚI
                cho con cháu position:fixed, khiến ô mở rộng bên trong (.comment-expand-box)
                tính "top" theo div này (nằm sát đáy khung chat) thay vì theo viewport
                thật → hộp mở rộng bị đẩy ra ngoài màn hình, trông như "biến mất". */}
            <div className="shrink-0 border-t border-zinc-800 bg-zinc-900/90 p-3">
                {session?.user ? (
                    <>
                    <style jsx>{`
                        .comment-expand-box { height: 90vh; top: 5vh; }
                        @supports (height: 100dvh) {
                            .comment-expand-box { height: 85dvh; top: 7.5dvh; }
                        }
                    `}</style>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        onChange={handleImageFileChange}
                    />
                    {!commentExpanded && replyingTo && (
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
                    {!commentExpanded && (pendingImageUrl || uploadingImage) && (
                        <div className="flex items-center gap-2 mb-2 pl-2 pr-2 py-1.5 rounded-xl bg-zinc-800/70 border border-zinc-700">
                            {uploadingImage ? (
                                <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
                            ) : (
                                <img src={pendingImageUrl!} alt="preview" className="w-8 h-8 rounded object-cover" />
                            )}
                            <span className="text-[11px] text-zinc-300 flex-1">{uploadingImage ? 'Đang tải ảnh...' : 'Đã đính kèm ảnh'}</span>
                            {!uploadingImage && (
                                <button type="button" onClick={() => setPendingImageUrl(null)} className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors">
                                    <X className="h-3 w-3" />
                                </button>
                            )}
                        </div>
                    )}
                    {commentExpanded && (
                        <div className="fixed inset-0 z-40 bg-black/50" onClick={handleCloseComposer} />
                    )}
                    <form onSubmit={handleSendComment}>
                        <div
                            onMouseEnter={() => setCommentHovering(true)}
                            onMouseLeave={() => setCommentHovering(false)}
                            className={commentExpanded
                                ? 'comment-expand-box fixed left-1/2 -translate-x-1/2 z-50 w-[92vw] max-w-2xl flex flex-col'
                                : 'flex items-end gap-2'
                            }
                        >
                            {commentExpanded && (
                                <>
                                <div className="flex items-center justify-between gap-2 mb-2 shrink-0">
                                    <div className="min-w-0 flex-1">
                                        {editingId != null ? (
                                            <span className="inline-block max-w-full text-xs text-zinc-200 bg-zinc-800 px-3 py-1.5 rounded-lg truncate">
                                                ✎ Đang sửa bình luận
                                            </span>
                                        ) : replyingTo && (
                                            <span className="inline-block max-w-full text-xs text-zinc-200 bg-zinc-800 px-3 py-1.5 rounded-lg truncate">
                                                ↩ Đang trả lời <span className="font-semibold text-yellow-400">{replyingTo.userName || 'Người dùng'}</span>
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {/* Gửi/Lưu = gửi rồi tự đóng lại. Đóng = thu gọn lại; nếu
                                            đang sửa thì Đóng = huỷ sửa, nếu đang soạn mới thì Đóng
                                            chỉ thu gọn, nội dung đang gõ vẫn giữ nguyên trong ô. */}
                                        <button
                                            type="submit"
                                            disabled={(!newComment.trim() && !pendingImageUrl) || isPending || uploadingImage}
                                            className="flex items-center gap-1 bg-yellow-400 hover:bg-yellow-300 text-black text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg transition-colors disabled:opacity-30 disabled:grayscale"
                                        >
                                            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} {editingId != null ? 'Lưu' : 'Gửi'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleCloseComposer}
                                            className="flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg transition-colors"
                                        >
                                            <X className="w-3.5 h-3.5" /> ĐÓNG
                                        </button>
                                    </div>
                                </div>

                                {/* Toolbar định dạng: đậm / màu / cỡ chữ / emoji / ảnh */}
                                <div className="relative flex items-center gap-1 mb-2 shrink-0 flex-wrap">
                                    <button type="button" onClick={() => applyFormat('bold')} title="In đậm" className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-colors">
                                        <Bold className="w-4 h-4" />
                                    </button>
                                    <button type="button" onClick={() => setActivePopover(p => p === 'color' ? null : 'color')} title="Màu chữ" className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-colors">
                                        <Palette className="w-4 h-4" />
                                    </button>
                                    <button type="button" onClick={() => setActivePopover(p => p === 'size' ? null : 'size')} title="Cỡ chữ" className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-colors">
                                        <Type className="w-4 h-4" />
                                    </button>
                                    <button type="button" onClick={() => setActivePopover(p => p === 'emoji' ? null : 'emoji')} title="Emoji" className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-colors">
                                        <Smile className="w-4 h-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploadingImage}
                                        title="Chèn ảnh"
                                        className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-colors disabled:opacity-40"
                                    >
                                        {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                                    </button>

                                    {activePopover === 'color' && (
                                        <div className="absolute top-full left-0 mt-1 z-10 flex gap-1.5 p-2 bg-white border border-gray-200 rounded-xl shadow-xl">
                                            {COLOR_PRESETS.map(c => (
                                                <button
                                                    key={c.key}
                                                    type="button"
                                                    title={c.label}
                                                    onClick={() => applyFormat({ color: c.key })}
                                                    className="w-6 h-6 rounded-full border border-gray-200 hover:scale-110 transition-transform"
                                                    style={{ backgroundColor: c.hex }}
                                                />
                                            ))}
                                        </div>
                                    )}
                                    {activePopover === 'size' && (
                                        <div className="absolute top-full left-9 mt-1 z-10 flex gap-1.5 p-2 bg-white border border-gray-200 rounded-xl shadow-xl">
                                            {SIZE_PRESETS.map(s => (
                                                <button
                                                    key={s.key}
                                                    type="button"
                                                    onClick={() => applyFormat({ size: s.key })}
                                                    className="px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-colors"
                                                >
                                                    {s.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {activePopover === 'emoji' && (
                                        <div className="absolute top-full left-16 mt-1 z-10 grid grid-cols-5 gap-1 p-2 bg-white border border-gray-200 rounded-xl shadow-xl w-[190px]">
                                            {EMOJI_PRESETS.map(emoji => (
                                                <button
                                                    key={emoji}
                                                    type="button"
                                                    onClick={() => applyFormat({ emoji })}
                                                    className="text-lg hover:bg-gray-100 rounded-lg py-0.5 transition-colors"
                                                >
                                                    {emoji}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {(pendingImageUrl || uploadingImage) && (
                                    <div className="flex items-center gap-2 mb-2 pl-2 pr-2 py-1.5 rounded-xl bg-gray-100 shrink-0">
                                        {uploadingImage ? (
                                            <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                                        ) : (
                                            <img src={pendingImageUrl!} alt="preview" className="w-10 h-10 rounded-lg object-cover" />
                                        )}
                                        <span className="text-xs text-gray-600 flex-1">{uploadingImage ? 'Đang tải ảnh...' : 'Đã đính kèm ảnh — sẽ gửi kèm bình luận'}</span>
                                        {!uploadingImage && (
                                            <button type="button" onClick={() => setPendingImageUrl(null)} className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-200 transition-colors">
                                                <X className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </div>
                                )}
                                {uploadError && (
                                    <p className="text-[11px] text-red-500 mb-2 shrink-0">{uploadError}</p>
                                )}
                                </>
                            )}
                            <textarea
                                ref={textareaRef}
                                value={newComment}
                                onChange={(e) => {
                                    setNewComment(e.target.value)
                                    if (!commentExpanded) {
                                        // Auto-resize (chỉ áp dụng ở trạng thái thu gọn)
                                        e.target.style.height = 'auto'
                                        e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
                                    }
                                }}
                                onFocus={() => setCommentFocused(true)}
                                onBlur={() => setCommentFocused(false)}
                                onKeyDown={(e) => {
                                    // Enter thuần = xuống dòng (không submit)
                                    // Không có action nào submit khi nhấn Enter
                                }}
                                placeholder={
                                    editingId != null
                                        ? "Chỉnh sửa bình luận..."
                                        : replyingTo
                                            ? `Trả lời ${replyingTo.userName || 'người dùng'}...`
                                            : "Nhập nội dung tương tác... (Enter để xuống dòng, bấm nút ➤ để gửi)"
                                }
                                rows={commentExpanded ? undefined : 1}
                                className={commentExpanded
                                    ? 'flex-1 w-full bg-white text-base text-gray-800 border border-gray-200 rounded-lg p-3 shadow-2xl resize-none focus:outline-none focus:ring-2 focus:ring-yellow-400/50 placeholder:text-gray-300 text-justify leading-relaxed'
                                    : 'flex-1 w-full block bg-zinc-800 border border-zinc-700 rounded-2xl pl-4 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 transition-all resize-none overflow-hidden leading-relaxed text-justify'
                                }
                                style={commentExpanded ? undefined : { minHeight: '42px', maxHeight: '120px' }}
                                disabled={isPending}
                            />
                            {!commentExpanded && (
                                <button
                                    type="submit"
                                    disabled={(!newComment.trim() && !pendingImageUrl) || isPending}
                                    className="shrink-0 w-9 h-9 rounded-xl bg-yellow-400 text-black flex items-center justify-center disabled:opacity-30 disabled:grayscale hover:bg-yellow-300 transition-all active:scale-90 mb-0.5"
                                >
                                    {isPending ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Send className="h-4 w-4" />
                                    )}
                                </button>
                            )}
                        </div>
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
