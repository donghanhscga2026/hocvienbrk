'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import type { WiProject } from '@/lib/wi300/projects'

const field = 'mt-1 min-h-11 w-full rounded-xl border border-brk-outline bg-white px-3 py-2 text-sm'
type CourseOption = { id: number; name_lop: string; id_khoa: string }
export default function WiProjectManager({ courses, initial, initialSlug }: { courses: CourseOption[]; initial: { admin: boolean; projects: WiProject[] }; initialSlug?: string }) {
  const [projects, setProjects] = useState<WiProject[]>(initial.projects)
  const [admin, setAdmin] = useState(initial.admin)
  const first = initial.projects.find(item => item.slug === initialSlug) || initial.projects[0]
  const [selected, setSelected] = useState(first?.slug || '')
  const [loading, setLoading] = useState(false)
  const [formVersion, setFormVersion] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [offeringCount, setOfferingCount] = useState(first?.offerings.length || 0)
  const [creating, setCreating] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const project = projects.find(item => item.slug === selected)
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!admin || busy) return
    const data = new FormData(event.currentTarget)
    setBusy(true); setError(''); setMessage('')
    try {
      const response = await fetch('/api/wi300/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug: String(data.get('slug') || '').trim(), name: String(data.get('name') || '').trim(), description: String(data.get('description') || '').trim() }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Không tạo được dự án.')
      setProjects(current => [...current, result.project]); setSelected(result.project.slug); setOfferingCount(0); setCreating(false); setConfirmDelete(false)
      setMessage('Đã tạo bản nháp. Nhập thông tin, gán chủ và chọn công khai khi sẵn sàng.')
    } catch (error) { setError(error instanceof Error ? error.message : 'Không tạo được dự án.') }
    finally { setBusy(false) }
  }
  async function remove() {
    if (!admin || !project || busy) return
    setBusy(true); setError(''); setMessage('')
    try {
      const response = await fetch(`/api/wi300/projects?slug=${encodeURIComponent(project.slug)}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revision: project.revision }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Không xóa được dự án.')
      const remaining = projects.filter(item => item.slug !== project.slug)
      setProjects(remaining); setSelected(remaining[0]?.slug || ''); setOfferingCount(remaining[0]?.offerings.length || 0); setConfirmDelete(false)
      setMessage('Đã xóa hồ sơ dự án. Các khóa học và tài khoản liên quan vẫn được giữ nguyên.')
    } catch (error) { setError(error instanceof Error ? error.message : 'Không xóa được dự án.') }
    finally { setBusy(false) }
  }
  async function load() {
    setConfirmDelete(false)
    setLoading(true); setError(''); setMessage('')
    try {
      const response = await fetch('/api/wi300/projects', { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Không tải được dự án.')
      setProjects(data.projects); setAdmin(data.admin)
      const next = data.projects.find((item: WiProject) => item.slug === selected) || data.projects[0]
      setSelected(next?.slug || ''); setOfferingCount(next?.offerings.length || 0); setFormVersion(value => value + 1)
    } catch (error) { setError(error instanceof Error ? error.message : 'Không tải được dự án.') }
    finally { setLoading(false) }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!project || busy) return
    const data = new FormData(event.currentTarget)
    const text = (key: string) => String(data.get(key) || '').trim()
    const offerings = Array.from({ length: offeringCount }, (_, index) => ({ kind: text(`kind-${index}`), name: text(`name-${index}`), description: text(`description-${index}`), url: text(`url-${index}`) })).filter(item => item.name || item.description || item.url)
    const content = { name: text('name'), description: text('description'), introduction: text('introduction'), logo: text('logo'), website: text('website'), offerings,
      // Giữ liên kết khóa đã chọn nếu tạm bị ẩn trong danh mục; trang công khai vẫn lọc quyền.
      courseIds: [...new Set([...data.getAll('courseIds').map(Number), ...project.courseIds.filter(id => !courses.some(course => course.id === id))])],
    }
    const controls = admin ? { ownerId: text('ownerId') === '' ? null : Number(text('ownerId')), published: data.has('published'), featured: data.has('featured'), order: Number(text('order')) } : undefined
    setBusy(true); setError(''); setMessage('')
    try {
      const response = await fetch(`/api/wi300/projects?slug=${encodeURIComponent(project.slug)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revision: project.revision, content, ...(controls ? { controls } : {}) }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Không lưu được dự án.')
      setProjects(current => current.map(item => item.slug === project.slug ? result.project : item))
      setOfferingCount(result.project.offerings.length)
      setMessage('Đã lưu. Trang chủ và hồ sơ dự án sẽ dùng thông tin mới khi tải lại.')
    } catch (error) { setError(error instanceof Error ? error.message : 'Không lưu được dự án.') }
    finally { setBusy(false) }
  }
  return <section className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="max-w-2xl text-sm leading-6 text-brk-muted">{admin ? 'Chọn dự án, gán chủ bằng mã thành viên và kiểm soát hiển thị trên trang chủ.' : 'Bạn chỉ được sửa những dự án đã được quản trị viên giao cho mình.'}</p><button type="button" disabled={busy || loading} onClick={() => void load()} className="min-h-11 rounded-xl border border-brk-outline bg-white px-4 disabled:opacity-50">Tải lại dữ liệu</button></div>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
    {message && <p role="status" className="rounded-xl bg-green-50 p-4 text-green-800">{message}</p>}
    {admin && <div className="space-y-3"><button type="button" disabled={busy || loading} onClick={() => setCreating(value => !value)} className="min-h-11 rounded-xl bg-brk-primary px-4 font-semibold text-white disabled:opacity-50">{creating ? 'Đóng form thêm dự án' : '+ Thêm dự án'}</button>{creating && <form onSubmit={create} className="space-y-4 rounded-2xl border border-brk-outline bg-white p-4 sm:p-6"><fieldset disabled={busy} className="space-y-4"><h2 className="text-xl font-bold">Thêm dự án mới</h2><label className="block text-sm font-semibold">Tên dự án<input name="name" required minLength={2} maxLength={100} className={field} /></label><label className="block text-sm font-semibold">Đường dẫn dự án<input name="slug" required minLength={2} maxLength={80} pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="wi-du-an-moi" className={field} /><span className="text-xs font-normal text-brk-muted">Chữ thường không dấu, số và dấu gạch ngang. Đường dẫn được giữ cố định sau khi tạo.</span></label><label className="block text-sm font-semibold">Mô tả ngắn<input name="description" required minLength={3} maxLength={300} className={field} /></label><button type="submit" className="min-h-11 rounded-xl bg-brk-primary px-5 font-semibold text-white">{busy ? 'Đang tạo…' : 'Tạo bản nháp'}</button></fieldset></form>}</div>}
    {loading ? <p role="status">Đang tải dự án…</p> : !projects.length ? <p className="rounded-2xl border border-brk-outline bg-white p-6">{admin ? 'Chưa có dự án. Bấm Thêm dự án để tạo bản nháp mới.' : 'Bạn chưa được giao quản lý dự án. Vui lòng liên hệ ban điều phối để gắn tài khoản với dự án của bạn.'}</p> : <>
      <label className="block text-sm font-semibold">Dự án<select value={selected} disabled={busy} onChange={event => { setConfirmDelete(false); setSelected(event.target.value); setOfferingCount(projects.find(item => item.slug === event.target.value)?.offerings.length || 0); setError(''); setMessage('') }} className={field}>{projects.map(item => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select></label>
      {project && <form key={`${project.slug}:${project.revision}:${formVersion}`} onSubmit={save} className="rounded-2xl border border-brk-outline bg-white p-4 sm:p-6">
        <fieldset disabled={busy} className="space-y-5 disabled:opacity-60">
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">Thông tin dự án</h2>{project.published && <Link href={`/du-an/${project.slug}`} target="_blank" rel="noopener noreferrer" className="min-h-11 py-3 text-sm font-semibold text-brk-primary">Xem hồ sơ ↗</Link>}</div>
          <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Tên dự án<input name="name" required minLength={2} maxLength={100} defaultValue={project.name} className={field} /></label><label className="text-sm font-semibold">Mô tả ngắn<input name="description" required minLength={3} maxLength={300} defaultValue={project.description} className={field} /></label></div>
          <label className="block text-sm font-semibold">Giới thiệu chi tiết<textarea name="introduction" rows={7} maxLength={10000} defaultValue={project.introduction} className={field} /><span className="text-xs font-normal text-brk-muted">Nhập văn bản, xuống dòng để chia đoạn.</span></label>
          <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Đường dẫn ảnh logo<input name="logo" maxLength={1000} defaultValue={project.logo} placeholder="https://…" className={field} /></label><label className="text-sm font-semibold">Website / liên hệ<input name="website" maxLength={1000} defaultValue={project.website} placeholder="https://…" className={field} /></label></div>
          {admin && <div className="space-y-4 rounded-xl bg-brk-background p-4"><h3 className="font-bold">Quyền quản lý & hiển thị</h3><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Mã thành viên chủ dự án<input name="ownerId" type="number" min={0} step={1} defaultValue={project.ownerId ?? ''} placeholder="Để trống nếu chưa giao chủ" className={field} /></label><label className="text-sm font-semibold">Thứ tự (số nhỏ đứng trước)<input name="order" type="number" required min={0} max={999} step={1} defaultValue={project.order} className={field} /></label></div><div className="flex flex-wrap gap-5"><label className="flex min-h-11 items-center gap-2"><input type="checkbox" name="published" defaultChecked={project.published} />Công khai hồ sơ</label><label className="flex min-h-11 items-center gap-2"><input type="checkbox" name="featured" defaultChecked={project.featured} />Hiện ở mục tiêu biểu</label></div><p className="text-xs leading-5 text-brk-muted">Chủ dự án không được đổi quyền hoặc chế độ hiển thị. Mục tiêu biểu chỉ hiện khi hồ sơ được công khai.</p></div>}
          <section className="space-y-3"><h3 className="font-bold">Khóa học liên quan</h3><p className="text-sm text-brk-muted">Chọn khóa thực sự thuộc hoặc hợp tác với dự án. Khi khóa bị ẩn khỏi danh mục Wi300, hồ sơ cũng tự ẩn khóa đó.</p><div className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-brk-outline p-3">{courses.length ? courses.map(course => <label key={course.id} className="flex min-h-11 items-center gap-3 text-sm"><input name="courseIds" type="checkbox" value={course.id} defaultChecked={project.courseIds.includes(course.id)} /><span>{course.name_lop} · {course.id_khoa}</span></label>) : <p className="text-sm">Chưa có khóa học công khai.</p>}</div>{project.courseIds.some(id => !courses.some(course => course.id === id)) && <p className="text-xs text-brk-muted">Có khóa đã liên kết nhưng hiện không công khai. Liên kết được giữ để hiển thị lại khi khóa được mở.</p>}</section>
          <section className="space-y-3"><h3 className="font-bold">Sản phẩm & dịch vụ</h3><p className="text-sm text-brk-muted">Thêm tên, mô tả và đường dẫn để khách xem thông tin hoặc liên hệ.</p>{Array.from({ length: offeringCount }, (_, index) => <div key={index} className="space-y-3 rounded-xl border border-brk-outline p-4"><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Loại<select name={`kind-${index}`} defaultValue={project.offerings[index]?.kind || 'PRODUCT'} className={field}><option value="PRODUCT">Sản phẩm</option><option value="SERVICE">Dịch vụ</option></select></label><label className="text-sm">Tên<input name={`name-${index}`} maxLength={150} defaultValue={project.offerings[index]?.name || ''} className={field} /></label></div><label className="block text-sm">Mô tả<input name={`description-${index}`} maxLength={500} defaultValue={project.offerings[index]?.description || ''} className={field} /></label><label className="block text-sm">Đường dẫn<input name={`url-${index}`} maxLength={1000} defaultValue={project.offerings[index]?.url || ''} className={field} /></label><p className="text-xs text-brk-muted">Xóa nội dung tên, mô tả và đường dẫn để bỏ mục này khi lưu.</p></div>)}<button type="button" disabled={offeringCount >= 30} onClick={() => setOfferingCount(value => value + 1)} className="min-h-11 rounded-xl border border-brk-outline px-4 disabled:opacity-50">+ Thêm sản phẩm / dịch vụ</button></section>
          <button type="submit" className="min-h-12 rounded-xl bg-brk-primary px-6 font-semibold text-white">{busy ? 'Đang lưu…' : 'Lưu dự án'}</button>
          {admin && <div className="space-y-3 border-t border-brk-outline pt-5"><p className="text-sm text-brk-muted">Muốn tạm ẩn? Bỏ tick Công khai hồ sơ rồi lưu. Xóa chỉ gỡ hồ sơ dự án, không xóa khóa học liên quan.</p>{confirmDelete ? <div className="space-y-3 rounded-xl bg-red-50 p-4"><p className="font-semibold text-red-800">Xác nhận xóa dự án “{project.name}”?</p><div className="flex flex-wrap gap-3"><button type="button" onClick={() => void remove()} className="min-h-11 rounded-xl bg-red-700 px-4 font-semibold text-white">Xác nhận xóa</button><button type="button" onClick={() => setConfirmDelete(false)} className="min-h-11 rounded-xl border border-brk-outline bg-white px-4">Hủy</button></div></div> : <button type="button" onClick={() => setConfirmDelete(true)} className="min-h-11 rounded-xl border border-red-300 px-4 text-red-700">Xóa dự án</button>}</div>}
        </fieldset>
      </form>}
    </>}
  </section>
}
