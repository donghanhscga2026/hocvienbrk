'use client'
import { useEffect, useState } from 'react'

type Option = { slug: string; name: string; revision: number; selected: boolean }
export default function WiCourseProjects({ courseId }: { courseId: string }) {
  const [projects, setProjects] = useState<Option[] | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [enabled, setEnabled] = useState(true)
  const url = `/api/wi300/project-content?course=${encodeURIComponent(courseId)}`
  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const response = await fetch(url, { signal: controller.signal, cache: 'no-store' })
        if (response.status === 404) { setEnabled(false); return }
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Không tải được dự án.')
        setProjects(data.projects)
      } catch (error) { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Không tải được dự án.') }
    }
    void load()
    return () => controller.abort()
  }, [url])
  async function reload() {
    setBusy(true); setError(''); setMessage('')
    try {
      const response = await fetch(url, { cache: 'no-store' }), data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Không tải được dự án.')
      setProjects(data.projects)
    } catch (error) { setError(error instanceof Error ? error.message : 'Không tải được dự án.') }
    finally { setBusy(false) }
  }
  async function save() {
    if (!projects || busy) return
    setBusy(true); setError(''); setMessage('')
    try {
      const response = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projects: projects.map(({ slug, revision, selected }) => ({ slug, revision, selected })) }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Không lưu được liên kết.')
      const fresh = await fetch(url, { cache: 'no-store' }), result = await fresh.json()
      if (!fresh.ok) throw new Error('Đã lưu liên kết nhưng chưa tải lại được. Bấm Tải lại trước khi sửa tiếp.')
      setProjects(result.projects); setMessage('Đã lưu. Hồ sơ dự án tự cập nhật khóa học liên quan.')
    } catch (error) { setError(error instanceof Error ? error.message : 'Không lưu được liên kết.') }
    finally { setBusy(false) }
  }
  if (!enabled) return null
  return <section className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5"><h2 className="text-lg font-bold">Thuộc dự án</h2><p className="text-sm text-gray-600">Chọn dự án bạn có quyền quản lý. Khóa học chỉ xuất hiện công khai khi được mở trong danh mục Wi300. Các liên kết đã có được giữ nguyên.</p>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}{message && <p role="status" className="text-sm text-green-700">{message}</p>}
    {projects ? projects.length ? <div className="space-y-2">{projects.map(project => <label key={project.slug} className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={project.selected} disabled={busy} onChange={event => setProjects(current => current!.map(item => item.slug === project.slug ? { ...item, selected: event.target.checked } : item))} />{project.name}</label>)}</div> : <p className="text-sm text-gray-600">Bạn chưa được giao quản lý dự án nào. Liên hệ chủ dự án để được thêm quyền hỗ trợ quản lý.</p> : !error && <p role="status">Đang tải dự án…</p>}
    <div className="flex flex-wrap gap-3"><button type="button" disabled={busy || !projects?.length} onClick={() => void save()} className="min-h-11 rounded-xl bg-brk-primary px-4 font-semibold text-white disabled:opacity-50">{busy ? 'Đang xử lý…' : 'Lưu liên kết dự án'}</button><button type="button" disabled={busy} onClick={() => void reload()} className="min-h-11 rounded-xl border border-gray-200 px-4">Tải lại</button></div>
  </section>
}
