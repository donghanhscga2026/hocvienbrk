'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Plus, Newspaper, Save, Loader2, Pencil, Trash2, Folder } from 'lucide-react'
import MainHeader from '@/components/layout/MainHeader'
import SeoFields, { contentFieldClass as field } from '@/components/content/SeoFields'
import { emptyContentSeo, contentUrl, type ContentSeo } from '@/lib/content/seo'

type Post = { id: string; title: string; content: string; image: string | null; categoryId: number | null; published: boolean; updatedAt: string; createdAt: string; seo: ContentSeo; _count?: { comments: number } }
type Category = { id: number; name: string; description: string | null; order: number; seo: ContentSeo; _count?: { posts: number } }
type Form = { id?: string | number; title: string; content: string; image: string; categoryId: number | null; published: boolean; order: number; seo: ContentSeo; version?: string }
const blank = (): Form => ({ title: '', content: '', image: '', categoryId: null, published: true, order: 0, seo: { ...emptyContentSeo } })
async function api(url: string, method = 'GET', data?: unknown, signal?: AbortSignal) {
  const response = await fetch(url, { method, signal, cache: 'no-store', ...(data ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) } : {}) })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Chưa xử lý được yêu cầu.')
  return result
}
export default function ToolsPostsPage() {
  const { data: session, status } = useSession(), isAdmin = session?.user?.role === 'ADMIN'
  const [tab, setTab] = useState<'posts' | 'categories'>('posts'), [posts, setPosts] = useState<Post[]>([]), [categories, setCategories] = useState<Category[]>([])
  const [form, setForm] = useState<Form | null>(null), [panel, setPanel] = useState<'content' | 'seo'>('content')
  const [page, setPage] = useState(0), [totalPages, setTotalPages] = useState(1), [query, setQuery] = useState(''), [category, setCategory] = useState(''), [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('')
  const groupsLoaded = useRef(false)
  // Hủy kết quả cũ khi chuyển bộ lọc, tránh ghi đè danh sách vừa tải.
  const load = useCallback(async (signal?: AbortSignal) => {
    const params = new URLSearchParams({ page: String(page), q: query, category, status: filter })
    const [list, groups] = await Promise.all([api('/api/admin/posts?' + params, 'GET', undefined, signal), signal && groupsLoaded.current ? Promise.resolve(null) : api('/api/admin/post-categories', 'GET', undefined, signal)])
    if (signal?.aborted) return
    setPosts(list.posts); setTotalPages(list.totalPages)
    if (groups) { setCategories(groups.data); groupsLoaded.current = true }
  }, [page, query, category, filter])
  useEffect(() => {
    if (!isAdmin) { groupsLoaded.current = false; setLoading(false); setPosts([]); setCategories([]); setForm(null); return }
    const controller = new AbortController(); setLoading(true); setError('')
    const timer = setTimeout(() => { void load(controller.signal).catch(error => { if (!controller.signal.aborted) setError(error.message) }).finally(() => { if (!controller.signal.aborted) setLoading(false) }) }, 250)
    return () => { controller.abort(); clearTimeout(timer) }
  }, [load, isAdmin])
  useEffect(() => {
    if (!isAdmin) return
    const id = new URLSearchParams(window.location.search).get('edit'); if (!id) return
    let cancelled = false
    void api('/api/admin/posts?id=' + encodeURIComponent(id)).then(({ post }) => {
      if (!cancelled) { if (post) { setForm({ ...blank(), ...post, image: post.image || '', version: post.updatedAt }); setPanel('content') } else setError('Không tìm thấy bài viết.') }
    }).catch(error => { if (!cancelled) setError(error.message) })
    return () => { cancelled = true }
  }, [isAdmin])
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (form) { event.preventDefault(); event.returnValue = '' } }
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn)
  }, [form])
  function switchTab(next: typeof tab) { if (form && !window.confirm('Đóng nội dung chưa lưu?')) return; setTab(next); setForm(null); setError(''); setNotice('') }
  function edit(row: Post | Category) {
    setForm('title' in row ? { ...blank(), ...row, image: row.image || '', version: row.updatedAt } : { ...blank(), id: row.id, title: row.name, content: row.description || '', order: row.order, seo: row.seo })
    setPanel('content'); setError(''); setNotice(''); window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (!form || busy) return; setBusy(true); setError(''); setNotice('')
    try {
      const data = tab === 'posts' ? { ...(form.id ? { id: form.id, version: form.version } : {}), title: form.title, content: form.content, image: form.image, categoryId: form.categoryId, published: form.published, seo: form.seo }
        : { ...(form.id !== undefined ? { id: form.id } : {}), name: form.title, description: form.content, order: form.order, seo: form.seo }
      await api(tab === 'posts' ? '/api/admin/posts' : '/api/admin/post-categories', 'POST', data)
      setForm(null); setNotice(tab === 'posts' ? 'Đã lưu bài viết.' : 'Đã lưu danh mục.'); await load()
    } catch (error) { setError(error instanceof Error ? error.message : 'Chưa lưu được nội dung.') } finally { setBusy(false) }
  }
  async function remove(row: Post | Category) {
    const message = 'title' in row ? `Xóa bài viết “${row.title}” và các bình luận của bài?` : `Xóa danh mục “${row.name}”? ${row._count?.posts || 0} bài viết sẽ được chuyển sang chưa phân loại.`
    if (busy || !window.confirm(message)) return
    setBusy(true); setError(''); setNotice('')
    try {
      await api(tab === 'posts' ? '/api/admin/posts' : '/api/admin/post-categories', 'DELETE', { id: row.id, ...('updatedAt' in row ? { version: row.updatedAt } : {}) })
      if (form?.id === row.id) setForm(null)
      setNotice('Đã xóa.'); if (tab === 'posts' && posts.length === 1 && page > 0) setPage(page - 1); else await load()
    } catch (error) { setError(error instanceof Error ? error.message : 'Chưa xóa được nội dung.') } finally { setBusy(false) }
  }
  const label = tab === 'posts' ? 'bài viết' : 'danh mục'
  return <main className="min-h-screen bg-brk-background text-brk-on-surface"><MainHeader title="Bài viết" toolSlug="posts" /><div className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-6">
    {status === 'loading' ? <p>Đang kiểm tra quyền…</p> : !isAdmin ? <p>Chỉ quản trị viên được quản lý bài viết.</p> : <>
      <div className="flex flex-wrap items-center justify-between gap-3"><nav aria-label="Quản lý bài viết" className="flex flex-wrap gap-2">{([{ id: 'posts', label: 'Bài viết', Icon: Newspaper }, { id: 'categories', label: 'Danh mục bài viết', Icon: Folder }] as const).map(({ id, label, Icon }) => <button key={id} disabled={busy} type="button" onClick={() => switchTab(id)} aria-pressed={tab === id} className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 ${tab === id ? 'wi300-pill-active' : 'wi300-pill'}`}><Icon size={18} />{label}</button>)}</nav><button type="button" disabled={busy} onClick={() => { if (form && !window.confirm('Đóng nội dung chưa lưu?')) return; setForm(blank()); setPanel('content'); setError('') }} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brk-primary px-4 font-semibold text-white"><Plus size={18} />Tạo {label}</button></div>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}{notice && <p role="status" className="rounded-xl bg-green-50 p-4 text-green-800">{notice}</p>}
      {form && <form onSubmit={save} className="space-y-4 rounded-2xl border border-brk-outline bg-white p-4 sm:p-6"><h2 className="text-xl font-bold">{form.id !== undefined ? 'Sửa ' : 'Tạo '}{label}</h2><div className="flex gap-2">{(['content', 'seo'] as const).map(id => <button type="button" key={id} aria-pressed={panel === id} onClick={() => setPanel(id)} className={`min-h-11 rounded-xl border px-4 ${panel === id ? 'wi300-pill-active' : 'wi300-pill'}`}>{id === 'content' ? 'Nội dung' : 'SEO'}</button>)}</div><fieldset disabled={busy} className="space-y-4">
        <div hidden={panel !== 'content'} className="space-y-4"><label className="block text-sm font-semibold" htmlFor="post-title">{tab === 'posts' ? 'Tiêu đề' : 'Tên danh mục'}<input id="post-title" required maxLength={300} value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} className={field} /></label><label className="block text-sm font-semibold" htmlFor="post-content">{tab === 'posts' ? 'Nội dung' : 'Mô tả'}<textarea id="post-content" rows={tab === 'posts' ? 10 : 4} required={tab === 'posts'} maxLength={tab === 'posts' ? 100000 : 1500} value={form.content} onChange={event => setForm({ ...form, content: event.target.value })} className={field} /></label>
          {tab === 'posts' ? <><label className="block text-sm font-semibold">Ảnh minh họa<input value={form.image} maxLength={1000} onChange={event => setForm({ ...form, image: event.target.value })} className={field} /></label><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold">Danh mục<select value={form.categoryId ?? ''} onChange={event => setForm({ ...form, categoryId: event.target.value === '' ? null : Number(event.target.value) })} className={field}><option value="">Chưa phân loại</option>{categories.map(row => <option value={row.id} key={row.id}>{row.name}</option>)}</select></label><label className="block text-sm font-semibold">Trạng thái<select value={form.published ? 'published' : 'draft'} onChange={event => setForm({ ...form, published: event.target.value === 'published' })} className={field}><option value="published">Công khai</option><option value="draft">Bản nháp</option></select></label></div></> : <label className="block text-sm font-semibold">Thứ tự<input type="number" min={0} max={10000} value={form.order} onChange={event => setForm({ ...form, order: Number(event.target.value) })} className={field} /></label>}</div>
        <div hidden={panel !== 'seo'}><SeoFields value={form.seo} onChange={seo => setForm({ ...form, seo })} /></div>
      </fieldset><div className="flex flex-wrap gap-3"><button disabled={busy} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brk-primary px-5 font-semibold text-white">{busy ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}Lưu {label}</button><button type="button" disabled={busy} onClick={() => { if (window.confirm('Đóng nội dung chưa lưu?')) setForm(null) }} className="min-h-11 rounded-xl border px-4">Hủy</button></div></form>}
      {tab === 'posts' && <div className="grid gap-3 sm:grid-cols-3"><label className="text-sm">Tìm bài viết<input className={field} value={query} onChange={event => { setQuery(event.target.value); setPage(0) }} /></label><label className="text-sm">Danh mục<select className={field} value={category} onChange={event => { setCategory(event.target.value); setPage(0) }}><option value="">Tất cả danh mục</option>{categories.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label><label className="text-sm">Trạng thái<select className={field} value={filter} onChange={event => { setFilter(event.target.value); setPage(0) }}><option value="">Tất cả</option><option value="published">Công khai</option><option value="draft">Bản nháp</option></select></label></div>}
      <section aria-label={'Danh sách ' + label} className="divide-y divide-brk-outline rounded-2xl border border-brk-outline bg-white">{loading ? <p className="p-6">Đang tải…</p> : !(tab === 'posts' ? posts : categories).length ? <p className="p-6 text-brk-muted">Chưa có {label}.</p> : (tab === 'posts' ? posts : categories).map(row => <article key={row.id} className="grid min-w-0 gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><div className="min-w-0 flex-1"><h2 className="break-words font-bold">{'title' in row ? row.title : row.name}</h2><p className="mt-1 text-sm text-brk-muted">{'published' in row ? (row.published ? 'Công khai' : 'Bản nháp') + ' · ' + (categories.find(item => item.id === row.categoryId)?.name || 'Chưa phân loại') : (row._count?.posts || 0) + ' bài viết'}</p>{(!('published' in row) || row.published) && <Link href={contentUrl('title' in row ? 'post' : 'category', row.id, row.seo)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center text-sm text-brk-primary">Xem trên website ↗</Link>}</div><div className="flex flex-wrap gap-2"><button type="button" disabled={busy} aria-label={'Sửa ' + ('title' in row ? row.title : row.name)} onClick={() => edit(row)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-3"><Pencil size={16} />Sửa</button><button type="button" disabled={busy} aria-label={'Xóa ' + ('title' in row ? row.title : row.name)} onClick={() => void remove(row)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 text-red-700"><Trash2 size={16} />Xóa</button></div></article>)}</section>
      {tab === 'posts' && <div className="flex items-center justify-between gap-3 text-sm"><button disabled={busy || loading || page === 0} onClick={() => setPage(page - 1)} className="min-h-11 rounded-xl border px-4 disabled:opacity-40">Trang trước</button><span>Trang {page + 1}/{totalPages}</span><button disabled={busy || loading || page + 1 >= totalPages} onClick={() => setPage(page + 1)} className="min-h-11 rounded-xl border px-4 disabled:opacity-40">Trang sau</button></div>}
    </>}<Link href="/tools" className="inline-flex min-h-11 items-center text-sm font-semibold text-brk-primary">← Công cụ quản lý</Link></div></main>
}
