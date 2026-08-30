'use client'

import { useState, useEffect, useLayoutEffect, useRef, useMemo, useOptimistic, useTransition, memo } from 'react'
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

    // {name} {17:20 20/08/2026} — giờ+ngày nằm chung 1 dòng với tên, thay cho
    // việc nhóm bình luận theo ngày như trước.
    const formatTimestamp = (date: Date) => {
        const time = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        const day = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
        return `${time} ${day}`
    }

    // [CLAMP] Bình luận dài chỉ hiện tối đa 3 dòng, có "(xem thêm)" để mở rộng
    // — tự thu gọn lại sau 5 giây nếu không chủ động bấm "(thu gọn)" trước đó.
    const [isContentExpanded, setIsContentExpanded] = useState(false)
    const [isTruncated, setIsTruncated] = useState(false)
    const contentRef = useRef<HTMLParagraphElement>(null)
    const autoCollapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useLayoutEffect(() => {
        setIsContentExpanded(false)
    }, [comment.content])

    useLayoutEffect(() => {
        const el = contentRef.current
        if (!el || isContentExpanded) return
        setIsTruncated(el.scrollHeight > el.clientHeight + 1)
    }, [comment.content, isContentExpanded])

    useEffect(() => {
        return () => {
            if (autoCollapseTimerRef.current) clearTimeout(autoCollapseTimerRef.current)
        }
    }, [])

    function collapseContent() {
        if (autoCollapseTimerRef.current) {
            clearTimeout(autoCollapseTimerRef.current)
            autoCollapseTimerRef.current = null
        }
        setIsContentExpanded(false)
    }

    function expandContent() {
        setIsContentExpanded(true)
        if (autoCollapseTimerRef.current) clearTimeout(autoCollapseTimerRef.current)
        autoCollapseTimerRef.current = setTimeout(() => {
            setIsContentExpanded(false)
        }, 5000)
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
                    <div className="flex items-baseline gap-2 flex-wrap">
                        <span className={`font-semibold text-white ${isReply ? 'text-[13px]' : 'text-sm'}`}>
                            {comment.userName || 'Người dùng'}
                            <span className="ml-1.5 font-normal text-zinc-400 text-[10px]">
                                {formatTimestamp(comment.createdAt)}
                            </span>
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
                                    ref={contentRef}
                                    className={`text-[13px] text-zinc-200 mt-0.5 break-words leading-relaxed text-justify ${!isContentExpanded ? 'line-clamp-3' : ''}`}
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
                                    {isTruncated && (
                                        <button
                                            type="button"
                                            onClick={isContentExpanded ? collapseContent : expandContent}
                                            className="text-[11px] font-semibold text-zinc-300 hover:text-yellow-400 transition-colors"
                                        >
                                            {isContentExpanded ? '(thu gọn)' : '(xem thêm)'}
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

const COMMENTS_PAGE_SIZE = 20

function ChatSection({ lessonId, session }: ChatSectionProps) {
    const [comments, setComments] = useState<Comment[]>([])
    const [loading, setLoading] = useState(true)
    // [PAGINATE] Chỉ tải 20 bình luận GỐC mới nhất mỗi lần — "totalTopLevel" =
    // tổng số thread gốc của bài học, "loadedTopLevel" = số đã tải. Còn dư thì
    // hiện nút "Xem thêm bình luận khác".
    const [totalTopLevel, setTotalTopLevel] = useState(0)
    const [loadedTopLevel, setLoadedTopLevel] = useState(0)
    const [loadingMore, setLoadingMore] = useState(false)
    const [isPending, startTransition] = useTransition()
    const [newComment, setNewComment] = useState('')
    const [error, setError] = useState('')
    const [replyingTo, setReplyingTo] = useState<{ id: number | string; userName: string | null } | null>(null)
    // [EXPAND] Ô nhập bình luận: chỉ mở rộng thành overlay lớn khi người dùng
    // BẤM/CHẠM vào ô để nhập liệu (focus) — không tự bật khi chỉ rê chuột
    // ngang qua khu vực này. Cùng cơ chế với ô "Bồi Nhân" trong AssignmentForm
    // (mục 2 của Ghi nhận).
    const [commentFocused, setCommentFocused] = useState(false)
    const commentExpanded = commentFocused

    // [EDIT] Sửa bình luận của chính mình — dùng LẠI ô soạn thảo mở rộng (cùng
    // toolbar định dạng/ảnh như lúc viết bình luận mới), chỉ đổi hành vi Gửi
    // sang gọi updateComment() thay vì createComment() khi editingId != null.
    const [editingId, setEditingId] = useState<number | string | null>(null)
    const currentUserId = session?.user?.id ? parseInt(session.user.id) : null
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

    // Cache comments theo lessonId (kèm trạng thái phân trang đã tải tới đâu)
    const commentCache = useRef<Map<string, { comments: Comment[]; totalTopLevel: number; loadedTopLevel: number }>>(new Map())
    // Mặc định mới nhất nằm TRÊN CÙNG — chỉ cần cuộn về đầu khi vừa đổi bài học
    // hoặc vừa gửi bình luận mới để thấy ngay. Bấm "Xem thêm" chỉ nối thêm
    // bình luận CŨ HƠN vào cuối danh sách nên không cần chỉnh lại vị trí cuộn.
    const shouldScrollToTopRef = useRef(false)
    const chatScrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const cached = commentCache.current.get(lessonId)
        if (cached) {
            setComments(cached.comments)
            setTotalTopLevel(cached.totalTopLevel)
            setLoadedTopLevel(cached.loadedTopLevel)
            setLoading(false)
            shouldScrollToTopRef.current = true
            return
        }

        setLoading(true)
        setReplyingTo(null)
        getCommentsByLesson(lessonId, { limit: COMMENTS_PAGE_SIZE, offset: 0 }).then(data => {
            const mapped = data.comments.map((c: any) => ({
                ...c,
                createdAt: new Date(c.createdAt)
            })) as Comment[]

            commentCache.current.set(lessonId, { comments: mapped, totalTopLevel: data.totalTopLevel, loadedTopLevel: data.loadedTopLevel })
            setComments(mapped)
            setTotalTopLevel(data.totalTopLevel)
            setLoadedTopLevel(data.loadedTopLevel)
            setLoading(false)
            shouldScrollToTopRef.current = true
        })
    }, [lessonId])

    async function handleLoadMoreComments() {
        if (loadingMore || loadedTopLevel >= totalTopLevel) return
        setLoadingMore(true)
        try {
            const data = await getCommentsByLesson(lessonId, { limit: COMMENTS_PAGE_SIZE, offset: loadedTopLevel })
            const mapped = data.comments.map((c: any) => ({
                ...c,
                createdAt: new Date(c.createdAt)
            })) as Comment[]

            // Bình luận CŨ HƠN nối vào CUỐI — không ảnh hưởng vị trí đang cuộn.
            setComments(prev => {
                const updated = [...prev, ...mapped]
                commentCache.current.set(lessonId, { comments: updated, totalTopLevel: data.totalTopLevel, loadedTopLevel: data.loadedTopLevel })
                return updated
            })
            setTotalTopLevel(data.totalTopLevel)
            setLoadedTopLevel(data.loadedTopLevel)
        } finally {
            setLoadingMore(false)
        }
    }

    useEffect(() => {
        if (!shouldScrollToTopRef.current) return
        chatScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
        shouldScrollToTopRef.current = false
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
                        commentCache.current.set(lessonId, { comments: updated, totalTopLevel, loadedTopLevel })
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
            shouldScrollToTopRef.current = true
            addOptimisticComment(tempComment)

            // 3. Gọi server action
            const result = await createComment(lessonId, content, typeof parentId === 'number' ? parentId : null, imageUrl)

            if (result.success && result.comment) {
                const newEntry = {
                    ...result.comment,
                    createdAt: new Date(result.comment.createdAt)
                } as Comment
                // Bình luận GỐC mới (không phải reply) → tính thêm vào tổng số thread
                // đã tải, để nút "Xem thêm" hiện đúng số bình luận CŨ còn lại.
                const isNewTopLevel = !newEntry.parentId
                const nextTotal = isNewTopLevel ? totalTopLevel + 1 : totalTopLevel
                const nextLoaded = isNewTopLevel ? loadedTopLevel + 1 : loadedTopLevel

                // 4. Cập nhật state chính thức sau khi server trả về
                setComments(prev => {
                    const updated = [...prev, newEntry]
                    commentCache.current.set(lessonId, { comments: updated, totalTopLevel: nextTotal, loadedTopLevel: nextLoaded })
                    return updated
                })
                if (isNewTopLevel) {
                    setTotalTopLevel(nextTotal)
                    setLoadedTopLevel(nextLoaded)
                }
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
    // hiển thị thụt lề bên dưới bình luận gốc. Bình luận gốc sắp MỚI NHẤT
    // TRƯỚC (không phân theo ngày nữa — mỗi dòng tự hiện giờ+ngày riêng); reply
    // trong từng thread vẫn theo thứ tự thời gian tự nhiên (cũ trước) để đọc
    // hội thoại xuôi. Sắp xếp lại ở đây (thay vì phụ thuộc thứ tự chèn vào
    // mảng gốc) để "Xem thêm"/gửi mới/optimistic-add không cần lo thứ tự.
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
        top.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        Object.values(replies).forEach(list => list.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()))
        return { topLevelComments: top, repliesByParent: replies }
    }, [optimisticComments])

    return (
        <div className="relative flex flex-col h-full bg-zinc-950">
            <div className="shrink-0 px-4 py-3 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-yellow-400" />
                    Tương tác
                    <span className="text-zinc-400 font-normal text-xs">
                        ({loadedTopLevel} của {totalTopLevel} bình luận)
                    </span>
                </h3>
            </div>

            <div ref={chatScrollRef} className="flex-1 overflow-y-auto px-4 py-3 custom-scrollbar">
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
                    <>
                    {topLevelComments.map(comment => (
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
                    {/* Mặc định mới nhất ở TRÊN — "Xem thêm" nối thêm bình luận CŨ HƠN nên
                        đặt ở CUỐI, đúng vị trí sau khi đã xem hết các thread đang hiển thị. */}
                    {loadedTopLevel < totalTopLevel && (
                        <div className="flex justify-center mt-2 mb-2">
                            <button
                                type="button"
                                onClick={handleLoadMoreComments}
                                disabled={loadingMore}
                                className="flex items-center gap-2 text-xs font-semibold text-zinc-300 hover:text-yellow-400 bg-zinc-800/60 hover:bg-zinc-800 px-4 py-2 rounded-full transition-colors disabled:opacity-50"
                            >
                                {loadingMore && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                Xem thêm bình luận khác ({totalTopLevel - loadedTopLevel})
                            </button>
                        </div>
                    )}
                    </>
                )}
                <div className="h-4" />
            </div>

            {/* KHÔNG dùng backdrop-blur (backdrop-filter) trên div này — vẫn giữ
                thói quen tránh filter/transform trên các div tổ tiên của ô soạn
                thảo, dù giờ ô mở rộng dùng position:absolute (neo theo div gốc
                "relative" của ChatSection, không còn position:fixed theo viewport
                như trước) nên rủi ro containing-block bị đổi đã giảm nhiều. */}
            <div className="shrink-0 border-t border-zinc-800 bg-zinc-900/90 p-3">
                {session?.user ? (
                    <>
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
                        <div className="fixed inset-0 z-40 bg-black/50" onMouseDown={(e) => e.preventDefault()} onClick={handleCloseComposer} />
                    )}
                    <form onSubmit={handleSendComment}>
                        <div
                            className={commentExpanded
                                // [FIX] Bắt đầu ngay dưới khung video/nội dung (top:0 của
                                // chính ChatSection, vốn đã nằm dưới khung đó) thay vì canh
                                // giữa màn hình như trước — tránh che mất phần đề bài phía
                                // trên. Giới hạn chiều cao (không còn 85-90vh) để trên mobile
                                // không bị bàn phím ảo che mất khi gõ.
                                ? 'absolute inset-x-0 top-0 z-50 max-h-[50vh] overflow-y-auto flex flex-col'
                                : 'flex items-end gap-2'
                            }
                        >
                            {commentExpanded && (
                                <>
                                {(editingId != null || replyingTo) && (
                                    <div className="mb-1.5 shrink-0">
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
                                )}

                                {/* Toolbar định dạng cùng dòng với Gửi/Đóng — Gửi/Lưu = gửi rồi
                                    tự đóng lại. Đóng = thu gọn lại; nếu đang sửa thì Đóng = huỷ
                                    sửa, nếu đang soạn mới thì Đóng chỉ thu gọn, nội dung đang gõ
                                    vẫn giữ nguyên trong ô. */}
                                <div className="relative flex items-center justify-between gap-2 mb-2 shrink-0 flex-wrap">
                                    <div className="flex items-center gap-1 flex-wrap">
                                    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('bold')} title="In đậm" className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-colors">
                                        <Bold className="w-4 h-4" />
                                    </button>
                                    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => setActivePopover(p => p === 'color' ? null : 'color')} title="Màu chữ" className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-colors">
                                        <Palette className="w-4 h-4" />
                                    </button>
                                    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => setActivePopover(p => p === 'size' ? null : 'size')} title="Cỡ chữ" className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-colors">
                                        <Type className="w-4 h-4" />
                                    </button>
                                    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => setActivePopover(p => p === 'emoji' ? null : 'emoji')} title="Emoji" className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-colors">
                                        <Smile className="w-4 h-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploadingImage}
                                        title="Chèn ảnh"
                                        className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-colors disabled:opacity-40"
                                    >
                                        {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                                    </button>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            type="submit"
                                            onMouseDown={(e) => e.preventDefault()}
                                            disabled={(!newComment.trim() && !pendingImageUrl) || isPending || uploadingImage}
                                            className="flex items-center gap-1 bg-yellow-400 hover:bg-yellow-300 text-black text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg transition-colors disabled:opacity-30 disabled:grayscale"
                                        >
                                            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} {editingId != null ? 'Lưu' : 'Gửi'}
                                        </button>
                                        <button
                                            type="button"
                                            onMouseDown={(e) => e.preventDefault()}
                                            onClick={handleCloseComposer}
                                            className="flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg transition-colors"
                                        >
                                            <X className="w-3.5 h-3.5" /> ĐÓNG
                                        </button>
                                    </div>

                                    {activePopover === 'color' && (
                                        <div className="absolute top-full left-0 mt-1 z-10 flex gap-1.5 p-2 bg-white border border-gray-200 rounded-xl shadow-xl">
                                            {COLOR_PRESETS.map(c => (
                                                <button
                                                    key={c.key}
                                                    type="button"
                                                    onMouseDown={(e) => e.preventDefault()}
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
                                                    onMouseDown={(e) => e.preventDefault()}
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
                                                    onMouseDown={(e) => e.preventDefault()}
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
                                            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => setPendingImageUrl(null)} className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-200 transition-colors">
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
                                            : "Nhập nội dung tương tác..."
                                }
                                rows={commentExpanded ? undefined : 1}
                                className={commentExpanded
                                    ? 'flex-1 w-full bg-white text-base text-gray-800 border border-gray-200 rounded-lg p-3 shadow-2xl resize-none focus:outline-none focus:ring-2 focus:ring-yellow-400/50 placeholder:text-gray-300 text-justify leading-relaxed'
                                    : 'flex-1 w-full block bg-zinc-800 border border-zinc-700 rounded-2xl pl-4 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 transition-all resize-none overflow-hidden leading-relaxed text-justify'
                                }
                                style={commentExpanded ? { minHeight: '160px' } : { minHeight: '42px', maxHeight: '120px' }}
                                disabled={isPending}
                            />
                            {!commentExpanded && (
                                <button
                                    type="submit"
                                    title="Ấn vào đây để gửi bình luận"
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
