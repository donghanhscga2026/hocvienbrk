'use client'
import { useState, type FormEvent } from 'react'
import type { WiProject } from '@/lib/wi300/projects'

const field = 'mt-1 min-h-11 w-full rounded-xl border border-brk-outline bg-white px-3 py-2'
type Selection = { slug: string; index: number }
export default function WiOfferingManager({ initial, initialSlug, initialKind }: { initial: WiProject[]; initialSlug?: string; initialKind?: string }) {
  const [projects, setProjects] = useState(initial)
  const [projectFilter, setProjectFilter] = useState(initialSlug || 'ALL')
  const [kindFilter, setKindFilter] = useState(['PRODUCT', 'SERVICE'].includes(initialKind || '') ? initialKind! : 'ALL')
  const [selected, setSelected] = useState<Selection | null>(null)
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [confirm, setConfirm] = useState(false)
  const source = selected ? projects.find(project => project.slug === selected.slug) : null
  const item = source && selected ? source.offerings[selected.index] : null
  async function reload() {
    setBusy(true); setError(''); setMessage('')
    try {
      const response = await fetch('/api/wi300/projects', { cache: 'no-store' }), data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Không tải được nội dung.')
      setProjects(data.projects); setSelected(null); setEditing(false); setConfirm(false)
    } catch (error) { setError(error instanceof Error ? error.message : 'Không tải được nội dung.') }
    finally { setBusy(false) }
  }
  async function submit(event?: FormEvent<HTMLFormElement>, remove = false) {
    event?.preventDefault()
    if (busy) return
    const data = event ? new FormData(event.currentTarget) : null
    const target = data ? projects.find(project => project.slug === data.get('project')) : null
    const text = (name: string) => String(data?.get(name) || '').trim()
    setBusy(true); setError(''); setMessage('')
    try {
      const response = await fetch('/api/wi300/project-content', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...(source && selected ? { source: { ...selected, revision: source.revision } } : {}), ...(remove ? { remove: true } : { target: target && { slug: target.slug, revision: target.revision }, offering: { kind: text('kind'), name: text('name'), description: text('description'), url: text('url') } }) }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Không lưu được nội dung.')
      const fresh = await fetch('/api/wi300/projects', { cache: 'no-store' }), state = await fresh.json()
      if (!fresh.ok) { setEditing(false); setSelected(null); throw new Error('Đã lưu nhưng chưa tải lại được. Bấm Tải lại dữ liệu trước khi sửa tiếp.') }
      setProjects(state.projects); setSelected(null); setEditing(false); setConfirm(false); setMessage(remove ? 'Đã gỡ nội dung.' : 'Đã lưu. Hồ sơ dự án tự cập nhật nội dung liên quan.')
    } catch (error) { setError(error instanceof Error ? error.message : 'Không lưu được nội dung.') }
    finally { setBusy(false) }
  }
  return <section className="space-y-5"><p className="text-sm leading-6 text-brk-muted">Thêm hoặc sửa từng sản phẩm, dịch vụ rồi chọn “Thuộc dự án”. Chuyển dự án sẽ tự cập nhật cả hai hồ sơ. Nội dung cũ đã nhập vẫn có trong danh sách này.</p>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}{message && <p role="status" className="rounded-xl bg-green-50 p-4 text-green-800">{message}</p>}
    <div className="flex flex-wrap gap-3"><button type="button" disabled={busy || !projects.length} onClick={() => { setSelected(null); setEditing(true); setConfirm(false); setError('') }} className="min-h-11 rounded-xl bg-brk-primary px-4 text-white">+ Thêm sản phẩm / dịch vụ</button><button type="button" disabled={busy} onClick={() => void reload()} className="min-h-11 rounded-xl border border-brk-outline px-4">Tải lại dữ liệu</button></div>
    <div className="flex flex-wrap gap-3"><select aria-label="Lọc nội dung theo dự án" value={projectFilter} onChange={event => setProjectFilter(event.target.value)} className={field + ' sm:w-auto'}><option value="ALL">Tất cả dự án</option>{projects.map(project => <option key={project.slug} value={project.slug}>{project.name}</option>)}</select><select aria-label="Loại nội dung" value={kindFilter} onChange={event => setKindFilter(event.target.value)} className={field + ' sm:w-auto'}><option value="ALL">Sản phẩm & dịch vụ</option><option value="PRODUCT">Sản phẩm</option><option value="SERVICE">Dịch vụ</option></select></div>
    {!projects.length && <p>Bạn chưa được giao quản lý dự án nào.</p>}
    {editing && <form key={selected ? `${selected.slug}:${selected.index}` : 'new'} onSubmit={event => void submit(event)} className="rounded-2xl border border-brk-outline bg-white p-5"><fieldset disabled={busy} className="space-y-4"><h2 className="text-xl font-bold">{item ? 'Sửa nội dung' : 'Thêm nội dung'}</h2><div className="grid gap-4 sm:grid-cols-2"><label>Loại<select name="kind" defaultValue={item?.kind || (kindFilter === 'SERVICE' ? 'SERVICE' : 'PRODUCT')} className={field}><option value="PRODUCT">Sản phẩm</option><option value="SERVICE">Dịch vụ</option></select></label><label>Thuộc dự án<select name="project" required defaultValue={source?.slug || (projectFilter === 'ALL' ? projects[0]?.slug : projectFilter)} className={field}>{projects.map(project => <option key={project.slug} value={project.slug}>{project.name}</option>)}</select></label></div><label className="block">Tên<input name="name" required minLength={2} maxLength={150} defaultValue={item?.name || ''} className={field} /></label><label className="block">Mô tả<textarea name="description" maxLength={500} rows={4} defaultValue={item?.description || ''} className={field} /></label><label className="block">Đường dẫn chi tiết / liên hệ<input name="url" required maxLength={1000} defaultValue={item?.url || ''} placeholder="https://… hoặc /đường-dẫn" className={field} /></label><p className="text-sm text-brk-muted">Nội dung xuất hiện khi dự án được công khai. Đây là hồ sơ giới thiệu, khách bấm đường dẫn để xem chi tiết hoặc liên hệ.</p><div className="flex flex-wrap gap-3"><button type="submit" className="min-h-11 rounded-xl bg-brk-primary px-5 text-white">Lưu nội dung</button><button type="button" onClick={() => { setEditing(false); setConfirm(false) }} className="min-h-11 rounded-xl border border-brk-outline px-4">Đóng</button>{item && <button type="button" onClick={() => setConfirm(true)} className="min-h-11 px-4 text-red-700">Gỡ nội dung</button>}</div>{confirm && <div className="rounded-xl bg-red-50 p-4"><p>Gỡ “{item?.name}” khỏi hồ sơ dự án?</p><div className="mt-3 flex gap-3"><button type="button" onClick={() => void submit(undefined, true)} className="min-h-11 rounded-xl bg-red-700 px-4 text-white">Xác nhận gỡ</button><button type="button" onClick={() => setConfirm(false)} className="min-h-11 px-4">Hủy</button></div></div>}</fieldset></form>}
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{projects.filter(project => projectFilter === 'ALL' || project.slug === projectFilter).flatMap(project => project.offerings.map((offering, index) => <article hidden={kindFilter !== 'ALL' && offering.kind !== kindFilter} key={`${project.slug}:${index}`} className="space-y-3 rounded-2xl border border-brk-outline bg-white p-5"><p className="text-sm text-brk-primary">{offering.kind === 'PRODUCT' ? 'Sản phẩm' : 'Dịch vụ'} · {project.name}</p><h2 className="break-words text-lg font-bold">{offering.name}</h2><p className="line-clamp-3 text-sm text-brk-muted">{offering.description}</p><button type="button" disabled={busy} onClick={() => { setSelected({ slug: project.slug, index }); setEditing(true); setConfirm(false); setError('') }} className="min-h-11 font-semibold text-brk-primary">Chỉnh sửa →</button></article>))}</div>
  </section>
}
