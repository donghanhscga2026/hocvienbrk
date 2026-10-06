'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Wrench, ArrowRight } from 'lucide-react'
import ToolShare from './ToolShare'

type Tool = { id: number; name: string; url: string; roles: string[]; isActive: boolean }
function publicHref(url: string) {
  if (url.startsWith('/') && !url.startsWith('//') && !url.includes('\\')) return url
  try { return new URL(url).protocol === 'https:' ? url : null } catch { return null }
}

export default function PublicTools({ loginHref }: { loginHref: string }) {
  const [tools, setTools] = useState<Tool[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    const abort = new AbortController()
    void fetch('/api/tools', { signal: abort.signal }).then(async response => {
      if (!response.ok) throw new Error('Không tải được tiện ích. Vui lòng tải lại trang.')
      return response.json()
    }).then(data => {
      // Khách chỉ thấy tiện ích thật sự công khai, không hiển thị công cụ quản trị bị khóa.
      setTools(data.tools.filter((tool: Tool) => tool.isActive && Array.isArray(tool.roles) && tool.roles.length === 0 && publicHref(tool.url)))
    }).catch(error => {
      if (!abort.signal.aborted) setError(error instanceof Error ? error.message : 'Không tải được tiện ích.')
    }).finally(() => { if (!abort.signal.aborted) setLoading(false) })
    return () => abort.abort()
  }, [])
  return <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6">
    <Link href="/" className="inline-flex min-h-11 items-center text-sm text-brk-primary">← Khóa học</Link>
    <h1 className="mt-3 text-2xl font-semibold text-brk-on-surface">Công cụ tiện ích</h1>
    <p className="mt-2 text-sm text-brk-muted">Các tiện ích bạn có thể dùng ngay, không cần đăng nhập.</p>
    {loading ? <p role="status" className="py-6">Đang tải tiện ích…</p> : error ? <p role="alert" className="py-6">{error}</p> : tools.length ? <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {tools.map(tool => <article key={tool.id} className="flex min-w-0 items-center gap-2 rounded-2xl border border-brk-outline bg-brk-surface p-3">
        <Link href={publicHref(tool.url)!} className="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-sm font-semibold text-brk-on-surface"><Wrench className="h-5 w-5 shrink-0 text-brk-primary" aria-hidden /><span className="min-w-0 flex-1 break-words">{tool.name}</span><ArrowRight className="h-4 w-4 shrink-0" aria-hidden /></Link>
        <ToolShare name={tool.name} url={tool.url} />
      </article>)}
    </div> : <p className="py-6 text-sm text-brk-muted">Chưa có tiện ích công khai.</p>}
    <section className="mt-6 rounded-2xl border border-brk-outline bg-brk-surface p-5"><h2 className="font-semibold text-brk-on-surface">Công cụ của tôi</h2><p className="mt-2 text-sm text-brk-muted">Đăng nhập để dùng CRM, quản lý khóa học và các công cụ theo quyền của bạn trong Không gian của tôi.</p><Link href={loginHref} className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-brk-primary px-4 text-sm font-semibold text-brk-on-primary">Đăng nhập để mở công cụ của tôi</Link></section>
  </div>
}
