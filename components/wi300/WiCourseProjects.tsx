'use client'
import { useEffect, useState } from 'react'

type Option = { slug: string; name: string; revision: number; selected: boolean }

// Giới hạn cả thời gian nhận phản hồi và đọc dữ liệu, tránh chờ vô hạn.
async function requestProjects(url: string, init: RequestInit = {}) {
  const controller = new AbortController()
  const cancel = () => controller.abort()
  init.signal?.addEventListener('abort', cancel, { once: true })
  if (init.signal?.aborted) controller.abort()
  const timer = setTimeout(cancel, 20000)
  try {
    const response = await fetch(url, { ...init, cache: 'no-store', signal: controller.signal })
    if ([401, 403, 404].includes(response.status)) return null
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Không xử lý được liên kết dự án.')
    return data as { projects?: Option[] }
  } catch (error) {
    if (controller.signal.aborted && !init.signal?.aborted) {
      throw new Error('Phản hồi quá lâu. Bấm Tải lại để kiểm tra liên kết hiện tại.')
    }
    throw error
  } finally {
    clearTimeout(timer)
    init.signal?.removeEventListener('abort', cancel)
  }
}

export default function WiCourseProjects({ courseId, compact = false }: { courseId: string; compact?: boolean }) {
  const [projects, setProjects] = useState<Option[] | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [enabled, setEnabled] = useState(true)
  const [editing, setEditing] = useState(!compact)
  const [needsReload, setNeedsReload] = useState(false)
  const url = `/api/wi300/project-content?course=${encodeURIComponent(courseId)}`
  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const data = await requestProjects(url, { signal: controller.signal })
        if (controller.signal.aborted) return
        if (!data) { setEnabled(false); return }
        if (!Array.isArray(data.projects)) throw new Error('Không tải được danh sách dự án. Bấm Tải lại.')
        setProjects(data.projects)
      } catch (error) { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Không tải được dự án.') }
    }
    void load()
    return () => controller.abort()
  }, [url])
  async function reload() {
    if (busy) return
    setBusy(true); setError(''); setMessage('')
    try {
      const data = await requestProjects(url)
      if (!data) { setEnabled(false); return }
      if (!Array.isArray(data.projects)) throw new Error('Không tải được danh sách dự án. Bấm Tải lại.')
      setProjects(data.projects); setNeedsReload(false)
    } catch (error) { setError(error instanceof Error ? error.message : 'Không tải được dự án.') }
    finally { setBusy(false) }
  }
  async function save() {
    if (!projects || busy || needsReload) return
    setBusy(true); setError(''); setMessage('')
    // Sau khi gửi, lấy lại phiên bản thật trước lần sửa tiếp, kể cả khi mất kết nối.
    setNeedsReload(true)
    try {
      const data = await requestProjects(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projects: projects.map(({ slug, revision, selected }) => ({ slug, revision, selected })) }) })
      if (!data) { setEnabled(false); return }
      const result = await requestProjects(url)
      if (!result) { setEnabled(false); return }
      if (!Array.isArray(result.projects)) throw new Error('Bấm Tải lại để kiểm tra liên kết đã lưu.')
      setProjects(result.projects); setNeedsReload(false); setEditing(!compact); setMessage('Đã lưu liên kết dự án.')
    } catch (error) { setError(error instanceof Error ? error.message : 'Không lưu được liên kết.') }
    finally { setBusy(false) }
  }
  // API đã lọc quyền: ADMIN thấy tất cả; chủ/thành viên có quyền thấy dự án của mình.
  if (!enabled || projects?.length === 0 || (!projects && !error)) return null
  const selectedCount = projects?.filter(project => project.selected).length || 0
  return <section aria-label="Thuộc dự án" aria-busy={busy} className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-base font-bold">Thuộc dự án</h2>
      {projects && <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600">Đã chọn: {selectedCount}</span>}
    </div>
    {!editing && <div className="flex flex-wrap gap-2">{projects?.filter(project => project.selected).map(project => <span key={project.slug} className="rounded-lg bg-brk-background px-3 py-2 text-sm text-brk-primary">{project.name}</span>)}{!selectedCount && <p className="text-sm text-gray-500">Chưa liên kết dự án.</p>}</div>}
    {editing && <p className="text-sm text-gray-600">Chọn dự án để liên kết khóa học này.</p>}
    {projects && editing && <div className={compact ? "grid grid-cols-1 gap-2" : "grid grid-cols-1 gap-2 min-[360px]:grid-cols-2 sm:grid-cols-3"}>
      {projects.map(project => <label key={project.slug} className={`flex min-h-11 min-w-0 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors ${project.selected ? 'border-green-600 bg-green-50 text-green-900' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'} ${busy || needsReload ? 'cursor-default opacity-60' : ''}`}>
        <input type="checkbox" checked={project.selected} disabled={busy || needsReload} className="h-4 w-4 shrink-0 accent-green-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700" onChange={event => setProjects(current => current?.map(item => item.slug === project.slug ? { ...item, selected: event.target.checked } : item) || null)} />
        <span className="min-w-0 break-words">{project.name}</span>
      </label>)}
    </div>}
    {error && <p role="alert" className="text-sm text-red-700">{error}{needsReload && ' Vui lòng tải lại trước khi sửa tiếp.'}</p>}
    {message && <p role="status" className="text-sm text-green-700">{message}</p>}
    <div className="flex flex-wrap items-center gap-2">
      {!editing && <button type="button" onClick={() => setEditing(true)} className="min-h-11 rounded-xl border border-brk-outline px-3 text-sm font-semibold text-brk-primary">Thay đổi liên kết</button>}
      {projects && editing && <button type="button" disabled={busy || needsReload} onClick={() => void save()} className="min-h-11 rounded-xl bg-brk-primary px-4 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Đang xử lý…' : 'Lưu liên kết'}</button>}
      <button type="button" disabled={busy} onClick={() => void reload()} className="min-h-11 rounded-xl px-3 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50">Tải lại</button>
    </div>
  </section>
}
