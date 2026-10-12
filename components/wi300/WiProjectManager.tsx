'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import type { WiProject } from '@/lib/wi300/projects'
import WiProjectTeamEditor from './WiProjectTeamEditor'

const field = 'mt-1 min-h-11 w-full rounded-xl border border-brk-outline bg-white px-3 py-2 text-sm'
type CourseOption = { id: number; name_lop: string; id_khoa: string }
export default function WiProjectManager({ courses, initial, initialSlug }: { courses: CourseOption[]; initial: { admin: boolean; actorId?: number; projects: WiProject[]; ownerNames?: Record<string, string> }; initialSlug?: string }) {
  const router = useRouter()
  const [projects, setProjects] = useState<WiProject[]>(initial.projects)
  const [admin, setAdmin] = useState(initial.admin)
  const first = initial.projects.find(item => item.slug === initialSlug)
  const [selected, setSelected] = useState(first?.slug || '')
  const [loading, setLoading] = useState(false)
  const [formVersion, setFormVersion] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [creating, setCreating] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [ownerNames, setOwnerNames] = useState(initial.ownerNames || {})
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
      setProjects(current => [...current, result.project]); setCreating(false); setConfirmDelete(false)
      setMessage('Đã tạo bản nháp. Nhập thông tin, gán chủ và chọn công khai khi sẵn sàng.')
      router.push(`/du-an/quan-ly?project=${encodeURIComponent(result.project.slug)}`)
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
      setProjects(remaining); setSelected(''); setConfirmDelete(false)
      setMessage('Đã xóa hồ sơ dự án. Các khóa học và tài khoản liên quan vẫn được giữ nguyên.')
      router.replace('/du-an/quan-ly')
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
      setProjects(data.projects); setAdmin(data.admin); setOwnerNames(data.ownerNames || {})
      const next = data.projects.find((item: WiProject) => item.slug === selected)
      setSelected(next?.slug || ''); setFormVersion(value => value + 1)
    } catch (error) { setError(error instanceof Error ? error.message : 'Không tải được dự án.') }
    finally { setLoading(false) }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!project || busy) return
    const data = new FormData(event.currentTarget)
    const text = (key: string) => String(data.get(key) || '').trim()
    const offerings = project.offerings
    const content = { name: text('name'), description: text('description'), introduction: text('introduction'), logo: text('logo'), website: text('website'), offerings,
      // Giữ liên kết; chỉ màn quản lý nội dung mới thay đổi liên kết khóa học.
      courseIds: project.courseIds,
    }
    const controls = admin ? { ownerId: text('ownerId') === '' ? null : Number(text('ownerId')), published: data.has('published'), featured: data.has('featured'), order: Number(text('order')) } : undefined
    setBusy(true); setError(''); setMessage('')
    try {
      const response = await fetch(`/api/wi300/projects?slug=${encodeURIComponent(project.slug)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revision: project.revision, content, ...(controls ? { controls } : {}), ...(data.has('members') ? { members: JSON.parse(String(data.get('members'))) } : {}) }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Không lưu được dự án.')
      setProjects(current => current.map(item => item.slug === project.slug ? result.project : item))
      setMessage('Đã lưu. Trang chủ và hồ sơ dự án sẽ dùng thông tin mới khi tải lại.')
    } catch (error) { setError(error instanceof Error ? error.message : 'Không lưu được dự án.') }
    finally { setBusy(false) }
  }
  return <section className="space-y-5">
    <Link href="/du-an/noi-dung" className="inline-flex min-h-11 items-center rounded-xl border border-brk-outline px-4 font-semibold text-brk-primary">Quản lý sản phẩm & dịch vụ →</Link>
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="max-w-2xl text-sm leading-6 text-brk-muted">{admin ? 'Chọn dự án, gán chủ bằng mã thành viên và kiểm soát hiển thị trên trang chủ.' : 'Bạn chỉ được sửa những dự án đã được quản trị viên giao cho mình.'}</p><button type="button" disabled={busy || loading} onClick={() => void load()} className="min-h-11 rounded-xl border border-brk-outline bg-white px-4 disabled:opacity-50">Tải lại dữ liệu</button></div>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
    {message && <p role="status" className="rounded-xl bg-green-50 p-4 text-green-800">{message}</p>}
    {!selected && admin && <div className="space-y-3"><button type="button" disabled={busy || loading} onClick={() => setCreating(value => !value)} className="min-h-11 rounded-xl bg-brk-primary px-4 font-semibold text-white disabled:opacity-50">{creating ? 'Đóng form thêm dự án' : '+ Thêm dự án'}</button>{creating && <form onSubmit={create} className="space-y-4 rounded-2xl border border-brk-outline bg-white p-4 sm:p-6"><fieldset disabled={busy} className="space-y-4"><h2 className="text-xl font-bold">Thêm dự án mới</h2><label className="block text-sm font-semibold">Tên dự án<input name="name" required minLength={2} maxLength={100} className={field} /></label><label className="block text-sm font-semibold">Đường dẫn dự án<input name="slug" required minLength={2} maxLength={80} pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="wi-du-an-moi" className={field} /><span className="text-xs font-normal text-brk-muted">Chữ thường không dấu, số và dấu gạch ngang. Đường dẫn được giữ cố định sau khi tạo.</span></label><label className="block text-sm font-semibold">Mô tả ngắn<input name="description" required minLength={3} maxLength={300} className={field} /></label><button type="submit" className="min-h-11 rounded-xl bg-brk-primary px-5 font-semibold text-white">{busy ? 'Đang tạo…' : 'Tạo bản nháp'}</button></fieldset></form>}</div>}
    {loading ? <p role="status">Đang tải dự án…</p> : !projects.length ? <p className="rounded-2xl border border-brk-outline bg-white p-6">{admin ? 'Chưa có dự án. Bấm Thêm dự án để tạo bản nháp mới.' : 'Bạn chưa được giao quản lý dự án. Vui lòng liên hệ ban điều phối để gắn tài khoản với dự án của bạn.'}</p> : <>
      {!selected && <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{projects.map(item => <article key={item.slug} className="flex min-w-0 flex-col gap-4 rounded-2xl border border-brk-outline bg-white p-5 shadow-sm">
        <div className="flex items-center gap-4">{item.logo ? <Image src={item.logo} alt={`Logo ${item.name}`} width={72} height={72} className="h-18 w-18 shrink-0 rounded-full border border-brk-outline bg-white object-contain p-1" /> : <span className="flex h-18 w-18 shrink-0 items-center justify-center rounded-full bg-brk-background text-2xl font-bold text-brk-primary" aria-hidden="true">{item.name.slice(0, 2)}</span>}<h2 className="min-w-0 break-words text-xl font-bold">{item.name}</h2></div>
        <p className="line-clamp-3 text-sm leading-6 text-brk-muted">{item.description}</p>
        <p className="text-sm">Chủ dự án: <span className="font-semibold">{item.ownerId == null ? 'Chưa được giao' : ownerNames[String(item.ownerId)] || `Thành viên #${item.ownerId}`}</span></p>
        <div className="flex flex-wrap gap-2 text-xs font-semibold"><span className={`rounded-full px-3 py-1 ${item.published ? 'bg-green-50 text-green-800' : 'bg-slate-100 text-slate-700'}`}>{item.published ? 'Công khai' : 'Bản nháp / đang ẩn'}</span><span className="rounded-full bg-brk-background px-3 py-1 text-brk-primary">{item.published && item.featured ? 'Tiêu biểu' : 'Không lên tiêu biểu'}</span></div>
        <Link href={`/du-an/quan-ly?project=${encodeURIComponent(item.slug)}`} aria-label={`Quản lý ${item.name}`} className="mt-auto inline-flex min-h-11 items-center justify-center rounded-xl bg-brk-primary px-4 font-semibold text-white">Quản lý →</Link>
      </article>)}</div>}
      {selected && <Link href="/du-an/quan-ly" className="inline-flex min-h-11 items-center font-semibold text-brk-primary">← Danh sách dự án</Link>}
      {project && <form key={`${project.slug}:${project.revision}:${formVersion}`} onSubmit={save} className="rounded-2xl border border-brk-outline bg-white p-4 sm:p-6">
        <fieldset disabled={busy} className="space-y-5 disabled:opacity-60">
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">Thông tin dự án</h2>{project.published && <Link href={`/du-an/${project.slug}`} target="_blank" rel="noopener noreferrer" className="min-h-11 py-3 text-sm font-semibold text-brk-primary">Xem hồ sơ ↗</Link>}</div>
          <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Tên dự án<input name="name" required minLength={2} maxLength={100} defaultValue={project.name} className={field} /></label><label className="text-sm font-semibold">Mô tả ngắn<input name="description" required minLength={3} maxLength={300} defaultValue={project.description} className={field} /></label></div>
          <label className="block text-sm font-semibold">Giới thiệu chi tiết<textarea name="introduction" rows={7} maxLength={10000} defaultValue={project.introduction} className={field} /><span className="text-xs font-normal text-brk-muted">Nhập văn bản, xuống dòng để chia đoạn.</span></label>
          <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Đường dẫn ảnh logo<input name="logo" maxLength={1000} defaultValue={project.logo} placeholder="https://…" className={field} /></label><label className="text-sm font-semibold">Website / liên hệ<input name="website" maxLength={1000} defaultValue={project.website} placeholder="https://…" className={field} /></label></div>
          <WiProjectTeamEditor members={project.members || []} names={ownerNames} editable={admin || project.ownerId === initial.actorId} />
          {admin && <div className="space-y-4 rounded-xl bg-brk-background p-4"><h3 className="font-bold">Quyền quản lý & hiển thị</h3><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Mã thành viên chủ dự án<input name="ownerId" type="number" min={0} step={1} defaultValue={project.ownerId ?? ''} placeholder="Để trống nếu chưa giao chủ" className={field} /></label><label className="text-sm font-semibold">Thứ tự (số nhỏ đứng trước)<input name="order" type="number" required min={0} max={999} step={1} defaultValue={project.order} className={field} /></label></div><div className="flex flex-wrap gap-5"><label className="flex min-h-11 items-center gap-2"><input type="checkbox" name="published" defaultChecked={project.published} />Công khai hồ sơ</label><label className="flex min-h-11 items-center gap-2"><input type="checkbox" name="featured" defaultChecked={project.featured} />Hiện ở mục tiêu biểu</label></div><p className="text-xs leading-5 text-brk-muted">Chủ dự án không được đổi quyền hoặc chế độ hiển thị. Mục tiêu biểu chỉ hiện khi hồ sơ được công khai.</p></div>}
          <section className="space-y-3"><h3 className="font-bold">Khóa học liên quan</h3><p className="text-sm text-brk-muted">Mở màn sửa khóa học → Thuộc dự án để gắn hoặc gỡ liên kết. Khóa bị ẩn trong danh mục vẫn giữ liên kết cũ.</p><div className="flex flex-wrap gap-3">{courses.filter(course => project.courseIds.includes(course.id)).map(course => <Link key={course.id} href={`/tools/courses/new?id=${course.id}`} className="inline-flex min-h-11 items-center rounded-xl border border-brk-outline px-3 text-sm text-brk-primary">{course.name_lop} →</Link>)}</div><Link href="/tools/courses" className="inline-flex min-h-11 items-center font-semibold text-brk-primary">Đến quản lý khóa học →</Link></section>
          <section className="space-y-3"><h3 className="font-bold">Sản phẩm & dịch vụ</h3><p className="text-sm text-brk-muted">Dự án đang có {project.offerings.length} nội dung. Quản lý từng nội dung và chọn dự án tại màn Sản phẩm & dịch vụ.</p><Link href="/du-an/noi-dung" className="inline-flex min-h-11 items-center font-semibold text-brk-primary">Quản lý sản phẩm & dịch vụ →</Link></section>
          <button type="submit" className="min-h-12 rounded-xl bg-brk-primary px-6 font-semibold text-white">{busy ? 'Đang lưu…' : 'Lưu dự án'}</button>
          {admin && <div className="space-y-3 border-t border-brk-outline pt-5"><p className="text-sm text-brk-muted">Muốn tạm ẩn? Bỏ tick Công khai hồ sơ rồi lưu. Xóa chỉ gỡ hồ sơ dự án, không xóa khóa học liên quan.</p>{confirmDelete ? <div className="space-y-3 rounded-xl bg-red-50 p-4"><p className="font-semibold text-red-800">Xác nhận xóa dự án “{project.name}”?</p><div className="flex flex-wrap gap-3"><button type="button" onClick={() => void remove()} className="min-h-11 rounded-xl bg-red-700 px-4 font-semibold text-white">Xác nhận xóa</button><button type="button" onClick={() => setConfirmDelete(false)} className="min-h-11 rounded-xl border border-brk-outline bg-white px-4">Hủy</button></div></div> : <button type="button" onClick={() => setConfirmDelete(true)} className="min-h-11 rounded-xl border border-red-300 px-4 text-red-700">Xóa dự án</button>}</div>}
        </fieldset>
      </form>}
    </>}
  </section>
}
