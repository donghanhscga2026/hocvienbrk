'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { getPostsAction, getPostDetailAction, createPostAction, updatePostAction } from '@/app/actions/post-actions'
import { Plus, Newspaper, Save, Loader2, Image as ImageIcon, X, Pencil } from 'lucide-react'
import MainHeader from '@/components/layout/MainHeader'

type Post = { id: string; title: string; content: string; image?: string | null; createdAt: string | Date; _count?: { comments: number } }

export default function ToolsPostsPage() {
    const { data: session, status } = useSession()
    const isAdmin = session?.user?.role === 'ADMIN'
    const [posts, setPosts] = useState<Post[]>([])
    const [loading, setLoading] = useState(true)
    const [showCreate, setShowCreate] = useState(false)
    const [editingPostId, setEditingPostId] = useState<string | null>(null)
    const [title, setTitle] = useState('')
    const [content, setContent] = useState('')
    const [image, setImage] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')
    const [page, setPage] = useState(0)
    const [totalPages, setTotalPages] = useState(1)

    // Phân trang giữ các bài cũ có thể tìm và chỉnh sửa.
    useEffect(() => {
        let cancelled = false
        getPostsAction(page).then(res => {
            if (cancelled) return
            if (res.success) {
                setPosts(res.posts || [])
                setTotalPages(res.totalPages || 1)
            } else setError('Chưa tải được danh sách bài viết.')
            setLoading(false)
        }).catch(() => { if (!cancelled) { setError('Chưa tải được danh sách bài viết.'); setLoading(false) } })
        return () => { cancelled = true }
    }, [page])

    // Liên kết “Sửa bài viết” ở bảng tin mở đúng bài trong công cụ quản lý.
    useEffect(() => {
        if (!isAdmin) return
        const id = new URLSearchParams(window.location.search).get('edit')
        if (!id) return
        let cancelled = false
        getPostDetailAction(id).then(res => {
            if (cancelled) return
            if (res.success && res.post) {
                setEditingPostId(res.post.id); setTitle(res.post.title); setContent(res.post.content)
                setImage(res.post.image || ''); setShowCreate(true)
            } else setError('Không tìm thấy bài viết cần sửa.')
        }).catch(() => { if (!cancelled) setError('Chưa tải được bài viết cần sửa.') })
        return () => { cancelled = true }
    }, [isAdmin])

    const resetForm = () => {
        setTitle(''); setContent(''); setImage(''); setEditingPostId(null); setShowCreate(false); setError('')
    }
    const startEdit = (post: Post) => {
        setEditingPostId(post.id); setTitle(post.title); setContent(post.content); setImage(post.image || '')
        setError(''); setNotice(''); setShowCreate(true)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (saving || !isAdmin) return
        setSaving(true); setError(''); setNotice('')
        try {
            const editing = editingPostId !== null
            const res = editingPostId ? await updatePostAction(editingPostId, { title, content, image }) : await createPostAction({ title, content, image })
            if (res.success) {
                resetForm()
                setNotice(editing ? 'Đã cập nhật bài viết.' : 'Đã đăng bài viết.')
                const refreshed = await getPostsAction(page)
                if (refreshed.success) { setPosts(refreshed.posts || []); setTotalPages(refreshed.totalPages || 1) }
                else setError('Đã lưu bài nhưng chưa tải lại được danh sách.')
            } else setError(res.error || 'Chưa thể lưu bài viết.')
        } catch { setError('Chưa thể hoàn tất thao tác. Vui lòng thử lại.') }
        finally { setSaving(false) }
    }

    return <div className="min-h-screen bg-gray-50">
        <MainHeader title="Bảng tin" toolSlug="posts" />
        <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 pb-16 sm:px-6">
            <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-gray-600">Quản lý bài viết cộng đồng</p>
                {isAdmin && <button type="button" disabled={saving} onClick={() => {
                    if (showCreate) resetForm()
                    else { resetForm(); setShowCreate(true); setNotice('') }
                }} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brk-primary px-4 text-sm font-semibold text-white">
                    {showCreate ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}{showCreate ? 'Đóng' : 'Đăng bài'}
                </button>}
            </div>
            {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
            {notice && <p role="status" className="rounded-xl bg-green-50 p-4 text-sm text-green-800">{notice}</p>}
            {status !== 'loading' && !isAdmin && <p className="text-sm text-gray-600">Chỉ quản trị viên được đăng và sửa bài viết.</p>}
            {showCreate && isAdmin && <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
                <h2 className="mb-5 flex items-center gap-2 text-lg font-bold"><Newspaper className="h-5 w-5 text-brk-primary" />{editingPostId ? 'Sửa bài viết' : 'Đăng bài mới'}</h2>
                <form onSubmit={handleCreate} className="space-y-4">
                    <div><label htmlFor="post-title" className="mb-2 block text-sm font-semibold">Tiêu đề</label><input id="post-title" value={title} onChange={e => setTitle(e.target.value)} maxLength={300} required disabled={saving} className="min-h-11 w-full rounded-xl border border-gray-200 px-4 py-3" /></div>
                    <div><label htmlFor="post-content" className="mb-2 block text-sm font-semibold">Nội dung</label><textarea id="post-content" value={content} onChange={e => setContent(e.target.value)} rows={8} maxLength={100000} required disabled={saving} className="w-full rounded-xl border border-gray-200 px-4 py-3" /></div>
                    <div><label htmlFor="post-image" className="mb-2 block text-sm font-semibold">Link ảnh minh họa (không bắt buộc)</label><div className="relative"><ImageIcon className="absolute left-4 top-4 h-4 w-4 text-gray-400" /><input id="post-image" value={image} onChange={e => setImage(e.target.value)} disabled={saving} placeholder="https://..." className="min-h-11 w-full rounded-xl border border-gray-200 py-3 pl-11 pr-4" /></div><p className="mt-2 text-xs text-gray-500">Để trống để bỏ ảnh minh họa.</p></div>
                    <div className="flex flex-wrap gap-3">
                        <button disabled={saving || !title.trim() || !content.trim()} type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brk-primary px-5 font-semibold text-white disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{editingPostId ? 'Lưu thay đổi' : 'Đăng bài viết'}</button>
                        <button type="button" disabled={saving} onClick={resetForm} className="min-h-11 rounded-xl border border-gray-200 px-5">Hủy</button>
                    </div>
                </form>
            </section>}
            <section aria-label="Bài viết đã đăng" className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white">
                {loading ? <div className="p-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-brk-primary" /><p className="mt-3 text-sm text-gray-500">Đang tải bài viết…</p></div> : posts.length === 0 ? <p className="p-8 text-center text-sm text-gray-500">Chưa có bài viết nào.</p> : posts.map(post => <article key={post.id} className="flex items-center justify-between gap-4 p-4 sm:p-5">
                    <div className="min-w-0"><h3 className="break-words font-semibold text-gray-900">{post.title}</h3><p className="mt-2 text-xs text-gray-500">{new Date(post.createdAt).toLocaleDateString('vi-VN')} · {post._count?.comments || 0} bình luận</p></div>
                    {isAdmin && <button type="button" disabled={saving} onClick={() => startEdit(post)} aria-label={`Sửa bài viết: ${post.title}`} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-brk-outline px-3 text-sm font-semibold text-brk-primary"><Pencil className="h-4 w-4" />Sửa</button>}
                </article>)}
            </section>
            <div className="flex items-center justify-between gap-3 text-sm">
                <button type="button" disabled={loading || saving || page === 0} onClick={() => { setLoading(true); setPage(value => value - 1) }} className="min-h-11 rounded-xl border border-gray-200 px-4 disabled:opacity-40">Trang trước</button>
                <span>Trang {page + 1}/{totalPages}</span>
                <button type="button" disabled={loading || saving || page + 1 >= totalPages} onClick={() => { setLoading(true); setPage(value => value + 1) }} className="min-h-11 rounded-xl border border-gray-200 px-4 disabled:opacity-40">Trang sau</button>
            </div>
            <Link href="/" className="inline-block py-3 text-sm font-semibold text-brk-primary">Về trang chủ</Link>
        </div>
    </div>
}
