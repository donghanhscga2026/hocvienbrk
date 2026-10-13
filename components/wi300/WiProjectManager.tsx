'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { PROJECT_CATEGORIES, projectCategoryLabels, type WiProject } from '@/lib/wi300/projects'
import WiProjectTeamEditor from './WiProjectTeamEditor'
import WiProjectOverview, { type ProjectCourseOption } from './WiProjectOverview'

const field = 'mt-1 min-h-11 w-full rounded-xl border border-brk-outline bg-white px-3 py-2 text-sm'
type CourseOption = ProjectCourseOption
export default function WiProjectManager({ courses, initial, initialSlug }: { courses: CourseOption[]; initial: { admin: boolean; actorId?: number; projects: WiProject[]; ownerNames?: Record<string, string> }; initialSlug?: string }) {
  const router = useRouter()
  const [view, setView] = useState<'list' | 'cards'>('list')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [detailTab, setDetailTab] = useState<'overview' | 'info' | 'members' | 'content'>('overview')
  const [contentTab, setContentTab] = useState<'courses' | 'PRODUCT' | 'SERVICE'>('courses')
  const [linking, setLinking] = useState(false)
  const [courseSearch, setCourseSearch] = useState('')
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
  const filtered = projects.filter(item => (!search.trim() || `${item.name} ${item.description} ${item.ownerId == null ? '' : ownerNames[String(item.ownerId)] || item.ownerId}`.toLocaleLowerCase('vi-VN').includes(search.trim().toLocaleLowerCase('vi-VN'))) && (status === 'all' || (status === 'public' ? item.published : !item.published)))
  const totalPages = Math.max(1, Math.ceil(filtered.length / 10))
  const currentPage = Math.min(page, totalPages)
  const visible = filtered.slice((currentPage - 1) * 10, currentPage * 10)
  // Lưu qua API hiện có: quyền admin và revision vẫn được kiểm tra ở server.
  async function toggleHomepage(item: WiProject, checked: boolean) {
    if (!admin || busy) return
    setBusy(true); setError(''); setMessage('')
    const { name, description, introduction, logo, website, courseIds, offerings } = item
    try {
      const response = await fetch(`/api/wi300/projects?slug=${encodeURIComponent(item.slug)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revision: item.revision, content: { name, description, introduction, logo, website, courseIds, offerings }, controls: { ownerId: item.ownerId, published: item.published, featured: item.featured, order: item.order, showOnHomepage: checked } }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Không cập nhật được hiển thị.')
      setProjects(current => current.map(project => project.slug === item.slug ? result.project : project))
      setMessage(checked ? 'Đã chọn hiển thị trên trang chủ. Dự án cần được công khai; trang chủ hiện tối đa 8 dự án.' : 'Đã bỏ hiển thị trên trang chủ.')
      router.refresh()
    } catch (error) { setError(error instanceof Error ? error.message : 'Không cập nhật được hiển thị.') }
    finally { setBusy(false) }
  }
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!admin || busy) return
    const data = new FormData(event.currentTarget)
    const text = (key: string) => String(data.get(key) || '').trim()
    setBusy(true); setError(''); setMessage('')
    try {
      const response = await fetch('/api/wi300/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        slug: text('slug'), category: text('category'), name: text('name'), description: text('description'), introduction: text('introduction'), logo: text('logo'), website: text('website'),
        ownerId: text('ownerId') === '' ? null : Number(text('ownerId')), order: Number(text('order')),
        published: data.has('published'), featured: data.has('featured'), showOnHomepage: data.has('showOnHomepage'), members: JSON.parse(String(data.get('members') || '[]')),
      }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Không tạo được dự án.')
      setProjects(current => [...current, result.project]); setCreating(false); setConfirmDelete(false)
      setMessage('Đã tạo dự án mới. Bạn có thể tiếp tục chỉnh sửa khi cần.')
      router.refresh()
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
    const content = { category: text('category'), name: text('name'), description: text('description'), introduction: text('introduction'), logo: text('logo'), website: text('website'), offerings,
      // Checkbox nằm trong form chung; dữ liệu liên kết giữ nguyên khi đổi tab.
      courseIds: data.has('courseLinksPresent') ? [...new Set(data.getAll('courseIds').map(Number))] : project.courseIds,
    }
    const controls = admin ? { ownerId: text('ownerId') === '' ? null : Number(text('ownerId')), published: data.has('published'), featured: data.has('featured'), showOnHomepage: data.has('showOnHomepage'), order: Number(text('order')) } : undefined
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
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="max-w-2xl text-sm leading-6 text-brk-muted">{selected ? 'Quản lý nội dung, thành viên và hiển thị dự án.' : admin ? 'Chọn dự án để quản lý nội dung và thành viên.' : 'Các dự án bạn được giao quản lý.'}</p><button type="button" disabled={busy || loading} onClick={() => void load()} className="min-h-11 rounded-xl border border-brk-outline bg-white px-4 disabled:opacity-50">Tải lại dữ liệu</button></div>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
    {message && <p role="status" className="rounded-xl bg-green-50 p-4 text-green-800">{message}</p>}
    {!selected && admin && <div className="space-y-3">
      <button type="button" disabled={busy || loading} onClick={() => setCreating(value => !value)} className="min-h-11 rounded-xl bg-brk-primary px-4 font-semibold text-white disabled:opacity-50">{creating ? 'Đóng form thêm dự án' : '+ Thêm dự án'}</button>
      {creating && <form onSubmit={create} className="rounded-2xl border border-brk-outline bg-white p-4 sm:p-6"><fieldset disabled={busy} className="space-y-4">
        <h2 className="text-xl font-bold">Thêm dự án mới</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold">Tên dự án<input name="name" required minLength={2} maxLength={100} className={field} /></label>
          <label className="text-sm font-semibold">Đường dẫn dự án<input name="slug" required minLength={2} maxLength={80} pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="wi-du-an-moi" className={field} /><span className="text-xs font-normal text-brk-muted">Chữ thường không dấu, số và dấu gạch ngang. Giữ cố định sau khi tạo.</span></label>
        </div>
        <label className="block text-sm font-semibold">Mô tả ngắn<input name="description" required minLength={3} maxLength={300} className={field} /></label>
        <label className="block text-sm font-semibold">Giới thiệu chi tiết<textarea name="introduction" rows={4} maxLength={10000} className={field} /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold">Đường dẫn ảnh logo<input name="logo" maxLength={1000} placeholder="https://…" className={field} /></label>
          <label className="text-sm font-semibold">Website / liên hệ<input name="website" maxLength={1000} placeholder="https://…" className={field} /></label>
          <label className="text-sm font-semibold">Mã thành viên chủ dự án<input name="ownerId" type="number" min={0} step={1} placeholder="Để trống nếu chưa giao chủ" className={field} /></label>
          <label className="text-sm font-semibold">Thứ tự (số nhỏ đứng trước)<input name="order" type="number" required min={0} max={999} step={1} defaultValue={100} className={field} /></label>
        </div>
        <label className="block text-sm font-semibold">Lĩnh vực dự án<select name="category" defaultValue="OTHER" className={field}>{PROJECT_CATEGORIES.map(value => <option key={value} value={value}>{projectCategoryLabels[value]}</option>)}</select></label>
        <WiProjectTeamEditor members={[]} names={ownerNames} editable />
        <div className="flex flex-wrap gap-4">
          <label className="flex min-h-11 items-center gap-2"><input type="checkbox" name="published" defaultChecked />Công khai hồ sơ</label>
          <label className="flex min-h-11 items-center gap-2"><input type="checkbox" name="featured" />Tiêu biểu</label><label className="flex min-h-11 items-center gap-2"><input type="checkbox" name="showOnHomepage" />Hiển thị trên trang chủ</label>
        </div>
        <button type="submit" className="min-h-11 rounded-xl bg-brk-primary px-5 font-semibold text-white">{busy ? 'Đang tạo…' : 'Tạo dự án'}</button>
      </fieldset></form>}
    </div>}
    {loading ? <p role="status">Đang tải dự án…</p> : !projects.length ? <p className="rounded-2xl border border-brk-outline bg-white p-6">{admin ? 'Chưa có dự án. Bấm Thêm dự án để tạo mới.' : 'Bạn chưa được giao quản lý dự án. Vui lòng liên hệ ban điều phối để gắn tài khoản với dự án của bạn.'}</p> : <>
      {!selected && <><div className="flex flex-wrap items-center gap-3 rounded-2xl border border-brk-outline bg-white p-3"><input aria-label="Tìm dự án hoặc chủ dự án" value={search} onChange={event => { setSearch(event.target.value); setPage(1) }} placeholder="Tìm dự án, chủ dự án…" className="min-h-11 min-w-0 flex-1 rounded-xl border px-3 text-sm" /><select aria-label="Trạng thái dự án" value={status} onChange={event => { setStatus(event.target.value); setPage(1) }} className="min-h-11 rounded-xl border px-3 text-sm"><option value="all">Tất cả trạng thái</option><option value="public">Công khai</option><option value="hidden">Đang ẩn</option></select>{(['list', 'cards'] as const).map(value => <button key={value} type="button" aria-pressed={view === value} onClick={() => setView(value)} className={`min-h-11 rounded-xl px-3 text-sm font-semibold ${view === value ? 'bg-brk-primary text-white' : 'border border-brk-outline'}`}>{value === 'list' ? 'Danh sách' : 'Dạng thẻ'}</button>)}</div><div className={view === 'cards' ? 'grid gap-5 sm:grid-cols-2 lg:grid-cols-3' : 'space-y-3'}>{visible.map(item => <article key={item.slug} className={`min-w-0 gap-3 rounded-2xl border border-brk-outline bg-white p-4 shadow-sm ${view === 'cards' ? 'flex flex-col' : 'grid md:grid-cols-[minmax(160px,1.2fr)_minmax(120px,1fr)_minmax(160px,1fr)_auto] md:items-center'}`}>
        <div className="flex items-center gap-4">{item.logo ? <Image src={item.logo} alt={`Logo ${item.name}`} width={72} height={72} className="h-18 w-18 shrink-0 rounded-full border border-brk-outline bg-white object-contain p-1" /> : <span className="flex h-18 w-18 shrink-0 items-center justify-center rounded-full bg-brk-background text-2xl font-bold text-brk-primary" aria-hidden="true">{item.name.slice(0, 2)}</span>}<h2 className="min-w-0 break-words text-xl font-bold">{item.name}</h2></div>
        {view === 'cards' && <p className="line-clamp-3 text-sm leading-6 text-brk-muted">{item.description}</p>}
        <p className="text-sm">Chủ dự án: <span className="font-semibold">{item.ownerId == null ? 'Chưa được giao' : ownerNames[String(item.ownerId)] || `Thành viên #${item.ownerId}`}</span></p>
        <div className="space-y-2"><div className="flex flex-wrap gap-2 text-xs font-semibold"><span className={`rounded-full px-3 py-1 ${item.published ? 'bg-green-50 text-green-800' : 'bg-slate-100 text-slate-700'}`}>{item.published ? 'Công khai' : 'Bản nháp / đang ẩn'}</span><span className="rounded-full bg-brk-background px-3 py-1 text-brk-primary">{item.featured ? 'Tiêu biểu' : 'Không tiêu biểu'}</span></div>
        {admin && <label className="flex min-h-11 items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={item.showOnHomepage} disabled={busy || loading} onChange={event => void toggleHomepage(item, event.target.checked)} />Hiển thị trên trang chủ</label>}
        </div><Link href={`/du-an/quan-ly?project=${encodeURIComponent(item.slug)}`} aria-label={`Quản lý ${item.name}`} className="mt-auto inline-flex min-h-11 items-center justify-center rounded-xl bg-brk-primary px-4 font-semibold text-white">Quản lý →</Link>
      </article>)}</div>{!filtered.length && <p className="rounded-xl bg-white p-5 text-sm text-brk-muted">Không có dự án phù hợp.</p>}<div className="flex flex-wrap items-center justify-between gap-3 text-sm"><p>{filtered.length} dự án · Trang {currentPage}/{totalPages}</p><div className="flex gap-2"><button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} className="min-h-11 rounded-xl border px-4 disabled:opacity-40">Trước</button><button type="button" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)} className="min-h-11 rounded-xl border px-4 disabled:opacity-40">Sau</button></div></div></>}
      {selected && <Link href="/du-an/quan-ly" className="inline-flex min-h-11 items-center font-semibold text-brk-primary">← Danh sách dự án</Link>}
      {project && <><div className="p-1"><div className="flex items-center gap-4">{project.logo && <Image src={project.logo} alt={project.name} width={84} height={84} className="h-20 w-20 rounded-full border border-brk-outline bg-white object-contain p-2" />}<div><h1 className="text-3xl font-bold">{project.name}</h1><p className="mt-2 text-sm text-brk-muted">{project.description}</p></div></div><p className="mt-2 text-sm text-brk-muted">Chủ dự án: {project.ownerId == null ? 'Chưa được giao' : ownerNames[String(project.ownerId)] || `#${project.ownerId}`}</p><div className="mt-4 flex flex-wrap gap-2">{([{ id: 'overview', label: 'Tổng quan' }, { id: 'info', label: 'Thông tin' }, { id: 'members', label: 'Thành viên' }, { id: 'content', label: 'Nội dung liên kết' }] as const).map(tab => <button key={tab.id} type="button" aria-pressed={detailTab === tab.id} onClick={() => setDetailTab(tab.id)} className={`min-h-12 shrink-0 border-b-2 px-4 text-sm ${detailTab === tab.id ? 'border-brk-primary font-bold text-brk-primary' : 'border-transparent text-brk-muted'}`}>{tab.label}</button>)}</div></div><section className="grid grid-cols-2 gap-3 rounded-xl border border-brk-outline bg-white p-4 sm:grid-cols-4">{[['Khóa học', project.courseIds.length], ['Sản phẩm', project.offerings.filter(item => item.kind === 'PRODUCT').length], ['Dịch vụ', project.offerings.filter(item => item.kind === 'SERVICE').length], ['Thành viên', project.members?.length || 0]].map(([label, count]) => <div key={label} className="px-4"><p className="text-sm text-brk-muted">{label}</p><p className="mt-1 text-2xl font-bold text-brk-primary">{count}</p></div>)}</section><form key={`${project.slug}:${project.revision}:${formVersion}`} onSubmit={save} onInvalid={() => setDetailTab('info')} className="space-y-5">
        <fieldset disabled={busy} className="space-y-5 disabled:opacity-60">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]"><div className="min-w-0 space-y-5">{detailTab === 'overview' && <WiProjectOverview project={project} courses={courses} onLink={() => { setDetailTab('content'); setContentTab('courses'); setLinking(true) }} onInfo={() => setDetailTab('info')} />}<div hidden={detailTab !== 'info'} className="space-y-4 rounded-xl border border-brk-outline bg-white p-5"><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Tên dự án<input name="name" required minLength={2} maxLength={100} defaultValue={project.name} className={field} /></label><label className="text-sm font-semibold">Mô tả ngắn<input name="description" required minLength={3} maxLength={300} defaultValue={project.description} className={field} /></label></div>
          <label className="block text-sm font-semibold">Giới thiệu chi tiết<textarea name="introduction" rows={7} maxLength={10000} defaultValue={project.introduction} className={field} /><span className="text-xs font-normal text-brk-muted">Nhập văn bản, xuống dòng để chia đoạn.</span></label>
          <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Đường dẫn ảnh logo<input name="logo" maxLength={1000} defaultValue={project.logo} placeholder="https://…" className={field} /></label><label className="text-sm font-semibold">Website / liên hệ<input name="website" maxLength={1000} defaultValue={project.website} placeholder="https://…" className={field} /></label></div>
          <label className="block text-sm font-semibold">Lĩnh vực dự án<select name="category" defaultValue={project.category || "OTHER"} className={field}>{PROJECT_CATEGORIES.map(value => <option key={value} value={value}>{projectCategoryLabels[value]}</option>)}</select></label>
          </div><div hidden={detailTab !== 'members'} className="rounded-xl border border-brk-outline bg-white p-5"><WiProjectTeamEditor members={project.members || []} names={ownerNames} editable={admin || project.ownerId === initial.actorId} /></div>

          <section hidden={detailTab !== 'content'} className="space-y-4 rounded-xl border border-brk-outline bg-white p-5">
            <div className="flex flex-wrap gap-2">{([{ id: 'courses', label: 'Khóa học' }, { id: 'PRODUCT', label: 'Sản phẩm' }, { id: 'SERVICE', label: 'Dịch vụ' }] as const).map(tab => <button key={tab.id} type="button" aria-pressed={contentTab === tab.id} onClick={() => setContentTab(tab.id)} className={`min-h-11 rounded-xl border border-brk-outline px-4 text-sm ${contentTab === tab.id ? 'bg-brk-background font-bold text-brk-primary' : ''}`}>{tab.label}</button>)}</div>
            <div hidden={contentTab !== 'courses'} className="space-y-3"><h3 className="font-bold">Khóa học liên kết</h3><div className="flex flex-wrap gap-3">{courses.filter(course => project.courseIds.includes(course.id)).map(course => <Link key={course.id} href={`/tools/courses/new?id=${course.id}`} className="inline-flex min-h-11 items-center rounded-xl border border-brk-outline px-3 text-sm text-brk-primary">{course.name_lop} →</Link>)}</div>
            <button type="button" onClick={() => setLinking(value => !value)} className="min-h-11 rounded-xl border border-brk-outline px-4 font-semibold text-brk-primary">{linking ? 'Đóng lựa chọn' : 'Liên kết nội dung có sẵn'}</button>
            <input type="hidden" name="courseLinksPresent" value="1" /><div hidden={!linking} className="space-y-3 rounded-xl bg-brk-background p-4"><p className="text-sm text-brk-muted">Chọn hoặc bỏ chọn khóa rồi bấm Lưu dự án. Chỉ thêm khóa bạn có quyền quản lý; gỡ liên kết không xóa khóa học.</p><input aria-label="Tìm khóa để liên kết" value={courseSearch} onChange={event => setCourseSearch(event.target.value)} placeholder="Tìm tên hoặc mã khóa…" className={field} />
            {courses.map(course => <div key={course.id} hidden={! `${course.name_lop} ${course.id_khoa}`.toLowerCase().includes(courseSearch.trim().toLowerCase())}><label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" name="courseIds" value={course.id} defaultChecked={project.courseIds.includes(course.id)} disabled={course.canLink === false} />{course.name_lop} · {course.id_khoa}{course.canLink === false && <span className="text-xs text-brk-muted">Liên kết hiện có</span>}</label>{course.canLink === false && project.courseIds.includes(course.id) && <input type="hidden" name="courseIds" value={course.id} />}</div>)}
            {project.courseIds.filter(id => !courses.some(course => course.id === id)).map(id => <input key={id} type="hidden" name="courseIds" value={id} />)}</div></div>
            {contentTab !== 'courses' && <div className="space-y-3"><h3 className="font-bold">{contentTab === 'PRODUCT' ? 'Sản phẩm' : 'Dịch vụ'}</h3>{project.offerings.filter(item => item.kind === contentTab).map((item, index) => <article key={index} className="rounded-xl border border-brk-outline p-4"><p className="font-semibold">{item.name}</p><p className="mt-1 text-sm text-brk-muted">{item.description}</p></article>)}<Link href={`/du-an/noi-dung?project=${encodeURIComponent(project.slug)}&kind=${contentTab}`} className="inline-flex min-h-11 items-center font-semibold text-brk-primary">Liên kết / quản lý {contentTab === 'PRODUCT' ? 'sản phẩm' : 'dịch vụ'} →</Link></div>}
          </section>
          </div><aside className="space-y-4"><div className="rounded-xl border border-brk-outline bg-white p-5"><h3 className="font-bold">Chủ dự án</h3><p className="mt-2 text-sm">{project.ownerId == null ? 'Chưa được giao' : ownerNames[String(project.ownerId)] || `#${project.ownerId}`}</p><p className="mt-2 text-sm text-brk-muted">{project.published ? 'Công khai' : 'Đang ẩn'} · {project.featured ? 'Tiêu biểu' : 'Không tiêu biểu'}</p></div>          {admin && <div className="space-y-4 rounded-xl border border-brk-outline bg-white p-5"><h3 className="font-bold">Hiển thị dự án</h3><div hidden={detailTab !== 'info'} className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Mã thành viên chủ dự án<input name="ownerId" type="number" min={0} step={1} defaultValue={project.ownerId ?? ''} placeholder="Để trống nếu chưa giao chủ" className={field} /></label><label className="text-sm font-semibold">Thứ tự (số nhỏ đứng trước)<input name="order" type="number" required min={0} max={999} step={1} defaultValue={project.order} className={field} /></label></div><div className="flex flex-wrap gap-5"><label className="flex min-h-11 items-center gap-2"><input type="checkbox" name="published" defaultChecked={project.published} />Công khai hồ sơ</label><label className="flex min-h-11 items-center gap-2"><input type="checkbox" name="featured" defaultChecked={project.featured} />Tiêu biểu</label><label className="flex min-h-11 items-center gap-2"><input type="checkbox" name="showOnHomepage" defaultChecked={project.showOnHomepage} />Hiển thị trên trang chủ</label></div><p className="text-xs leading-5 text-brk-muted">Công khai cho phép xem hồ sơ. Trang chủ và Tiêu biểu là hai lựa chọn riêng. Bấm Lưu dự án để áp dụng.</p></div>}<section className="rounded-xl border border-brk-outline bg-white p-5"><h3 className="font-bold">Thành viên dự án</h3><p className="mt-2 text-sm text-brk-muted">{project.members?.length || 0} thành viên</p><button type="button" onClick={() => setDetailTab('members')} className="mt-3 min-h-11 rounded-lg border border-brk-outline px-3 text-sm font-semibold text-brk-primary">Quản lý thành viên →</button></section></aside></div>
          <button type="submit" className="min-h-12 rounded-xl bg-brk-primary px-6 font-semibold text-white">{busy ? 'Đang lưu…' : 'Lưu dự án'}</button>
          {admin && <div className="space-y-3 border-t border-brk-outline pt-5"><p className="text-sm text-brk-muted">Muốn tạm ẩn? Bỏ tick Công khai hồ sơ rồi lưu. Xóa chỉ gỡ hồ sơ dự án, không xóa khóa học liên quan.</p>{confirmDelete ? <div className="space-y-3 rounded-xl bg-red-50 p-4"><p className="font-semibold text-red-800">Xác nhận xóa dự án “{project.name}”?</p><div className="flex flex-wrap gap-3"><button type="button" onClick={() => void remove()} className="min-h-11 rounded-xl bg-red-700 px-4 font-semibold text-white">Xác nhận xóa</button><button type="button" onClick={() => setConfirmDelete(false)} className="min-h-11 rounded-xl border border-brk-outline bg-white px-4">Hủy</button></div></div> : <button type="button" onClick={() => setConfirmDelete(true)} className="min-h-11 rounded-xl border border-red-300 px-4 text-red-700">Xóa dự án</button>}</div>}
        </fieldset>
      </form></>}
    </>}
  </section>
}
