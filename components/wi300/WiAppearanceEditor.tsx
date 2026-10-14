'use client'

import Image from 'next/image'
import { safeProjectUrl } from '@/lib/wi300/projects'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowUp, ArrowDown, Monitor, Tablet, Smartphone } from 'lucide-react'
import { appearanceSchema, defaultAppearance as baselineAppearance, homeSectionLabels } from '@/lib/wi300/appearance'
import type { AppearanceState } from '@/lib/wi300/appearance-service'
import type { Wi300HomeClientProps } from './Wi300HomeClient'
import WiAppearancePreview from './WiAppearancePreview'
import { WEBSITE_PAGES, type WebsitePage } from '@/lib/wi300/website-config'

const fieldClass = 'mt-1 min-h-11 w-full rounded-xl border border-brk-outline bg-white px-3 py-2 text-sm'
const tabs = [{ id: 'common', label: 'Cấu hình chung' }, { id: 'seo', label: 'SEO website' }, { id: 'footer', label: 'Footer' }, { id: 'menu', label: 'Menu website' }, { id: 'home', label: 'Trang chủ' }, { id: 'courses', label: 'Khóa học' }, { id: 'projects', label: 'Dự án' }, { id: 'teachers', label: 'Giảng viên' }] as const
type EditorTab = (typeof tabs)[number]['id']

export default function WiAppearanceEditor({ initial, previewData, previewOnly = false, mode = 'all', initialTab = 'common', pageOnly }: { initial: AppearanceState; previewData: Wi300HomeClientProps; previewOnly?: boolean; mode?: 'all' | 'website' | 'pages'; initialTab?: EditorTab; pageOnly?: WebsitePage }) {
  const router = useRouter()
  const [state, setState] = useState(initial)
  const [settings, setSettings] = useState(initial.draft)
  // Reset mẫu giao diện giữ nguyên các trang đã tạo và dữ liệu CMS.
  const defaultAppearance = pageOnly ? { ...settings, [pageOnly]: baselineAppearance[pageOnly], pageSeo: { ...settings.pageSeo, [pageOnly]: baselineAppearance.pageSeo[pageOnly] } }
    : mode === 'website' ? { ...settings, common: baselineAppearance.common, seo: baselineAppearance.seo, footer: baselineAppearance.footer, headerMenu: baselineAppearance.headerMenu }
    : { ...baselineAppearance, customPages: settings.customPages, pageContent: settings.pageContent, hiddenPages: settings.hiddenPages }
  const [tab, setTab] = useState<EditorTab>(initialTab)
  const [pagePanel, setPagePanel] = useState<'design' | 'seo'>('design')
  const pageLabel = WEBSITE_PAGES.find(item => item.id === pageOnly)?.label
  const visibleTabs = tabs.filter(item => mode === 'all' || (mode === 'website' ? ['common', 'seo', 'footer', 'menu'].includes(item.id) : !['common', 'seo', 'footer', 'menu'].includes(item.id)))
  useEffect(() => { setTab(initialTab) }, [initialTab])
  const [width, setWidth] = useState(1440)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const dirty = JSON.stringify(settings) !== JSON.stringify(state.draft)
  const unpublished = JSON.stringify(settings) !== JSON.stringify(state.published)
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = '' } }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  function value(path: string): unknown { return path.split('.').reduce<unknown>((current, key) => (current as Record<string, unknown>)[key], settings) }
  function change(path: string, next: unknown) {
    setSettings(current => {
      const copy = structuredClone(current)
      const keys = path.split('.')
      let target = copy as unknown as Record<string, unknown>
      for (const key of keys.slice(0, -1)) target = target[key] as Record<string, unknown>
      target[keys[keys.length - 1]] = next
      return copy
    })
    setMessage('')
  }
  // Các helper chỉ tạo form; trường hợp lỗi lưu vẫn giữ nguyên nội dung đang chỉnh.
  function input(path: string, label: string, multiline = false) {
    return <label key={path} className="block text-sm font-semibold">{label}{multiline ? <textarea rows={3} className={fieldClass} value={String(value(path))} onChange={event => change(path, event.target.value)} /> : <input className={fieldClass} value={String(value(path))} onChange={event => change(path, event.target.value)} />}</label>
  }
  function toggle(path: string, label: string) {
    return <label key={path} className="flex min-h-11 items-center gap-3 text-sm"><input className="h-5 w-5 accent-brk-primary" type="checkbox" checked={Boolean(value(path))} onChange={event => change(path, event.target.checked)} />{label}</label>
  }
  function select(path: string, label: string, options: { value: string | number; label: string }[]) {
    return <label key={path} className="block text-sm font-semibold">{label}<select value={String(value(path))} className={fieldClass} onChange={event => change(path, typeof value(path) === 'number' ? Number(event.target.value) : event.target.value)}>{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
  }
  function number(path: string, label: string, min: number, max: number) {
    return <label key={path} className="block text-sm font-semibold">{label}<input type="number" min={min} max={max} step={1} value={Number(value(path))} className={fieldClass} onChange={event => change(path, Number(event.target.value))} /></label>
  }
  function image(path: string) {
    const src = String(value(path))
    return <div className="space-y-2">{input(path, 'Đường dẫn ảnh (https:// hoặc ảnh có sẵn)')}{src && safeProjectUrl(src) && <Image unoptimized width={320} height={112} src={src} alt="Ảnh đang chọn" className="h-28 max-w-full rounded-xl border border-brk-outline object-contain" />}<p className="text-xs leading-5 text-brk-muted">Để trống để dùng ảnh hoặc minh họa mặc định. Dán link ảnh đã tải lên kho ảnh của bạn.</p></div>
  }
  function cta(page: 'courses' | 'projects' | 'teachers') {
    return <details open className="border-t border-brk-outline pt-4"><summary className="cursor-pointer font-bold">CTA cuối trang</summary><div className="mt-3 space-y-3">{toggle(`${page}.showCTA`, 'Hiển thị CTA')}{input(`${page}.cta.title`, 'Tiêu đề')}{input(`${page}.cta.description`, 'Mô tả', true)}{input(`${page}.cta.label`, 'Nhãn nút')}{input(`${page}.cta.url`, 'Đường dẫn nút')}</div></details>
  }
  function links(path: string, limit: number) {
    const items = value(path) as { label: string; url: string }[]
    return <div className="space-y-3">{items.map((item, index) => <div key={index} className="space-y-2 rounded-xl border border-brk-outline p-3">{input(`${path}.${index}.label`, 'Tên liên kết')}{input(`${path}.${index}.url`, 'Đường dẫn liên kết')}<button type="button" onClick={() => change(path, items.filter((_, i) => i !== index))} className="min-h-11 text-sm text-red-700">Xóa liên kết {index + 1}</button></div>)}<button type="button" disabled={items.length >= limit} onClick={() => change(path, [...items, { label: 'Liên kết mới', url: '/' }])} className="min-h-11 rounded-xl border px-3 text-sm disabled:opacity-40">Thêm liên kết</button></div>
  }
  async function save(action: 'draft' | 'publish' | 'restore') {
    if (busy) return
    if (action !== 'restore') {
      const parsed = appearanceSchema.safeParse(settings)
      if (!parsed.success) { setError(parsed.error.issues[0]?.message || 'Kiểm tra lại cài đặt.'); return }
    }
    setBusy(true); setError(''); setMessage('')
    try {
      const response = await fetch('/api/wi300/appearance', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, revision: state.revision, ...(pageOnly ? { page: pageOnly } : {}), ...(mode === 'website' ? { scope: 'website' } : {}), ...(action !== 'restore' ? { settings } : {}) }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Chưa lưu được giao diện.')
      setState(result); setSettings(result.draft)
      setMessage(action === 'publish' ? 'Đã áp dụng lên website.' : action === 'restore' ? 'Đã đưa bản trước vào xem trước. Bấm Áp dụng nếu muốn sử dụng.' : 'Đã lưu bản nháp. Website đang chạy không thay đổi.')
      if (action === 'publish') router.refresh()
    } catch (error) { setError(error instanceof Error ? error.message : 'Chưa lưu được giao diện.') }
    finally { setBusy(false) }
  }
  async function reload() {
    if (dirty && !window.confirm('Tải lại sẽ bỏ các chỉnh sửa chưa lưu. Tiếp tục?')) return
    setBusy(true); setError(''); setMessage('')
    try {
      const response = await fetch('/api/wi300/appearance', { cache: 'no-store' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Chưa tải được cài đặt.')
      setState(result); setSettings(result.draft)
    } catch (error) { setError(error instanceof Error ? error.message : 'Chưa tải được cài đặt.') }
    finally { setBusy(false) }
  }
  const columns = [2, 3, 4, 5].map(value => ({ value, label: `${value} cột` }))
  return <main className="mx-auto max-w-[1600px] space-y-5 px-4 py-6 text-brk-on-surface sm:px-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-3xl font-bold">{pageOnly ? 'Chỉnh sửa trang: ' + pageLabel : mode === 'pages' ? 'Trang' : mode === 'website' ? 'Cấu hình chung' : 'Quản trị website'}</h1><p className="mt-2 text-sm text-brk-muted">{pageOnly ? 'Tùy chỉnh nội dung, giao diện và SEO riêng cho trang này.' : 'Nhận diện, SEO website và footer dùng chung trên Wi300.'} Chỉ admin được áp dụng.</p></div><button type="button" disabled={busy} onClick={() => void reload()} className="min-h-11 rounded-xl border border-brk-outline bg-white px-4">Tải lại cài đặt</button></div>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}{message && <p role="status" className="rounded-xl bg-green-50 p-4 text-green-800">{message}</p>}
    {previewOnly && <p className="rounded-xl border border-brk-outline bg-brk-background p-4 text-sm">Nhánh Preview: bản nháp và Áp dụng chỉ tác động giao diện nhánh này. Website production không thay đổi.</p>}
    {pageOnly ? <div role="tablist" aria-label="Chỉnh sửa trang" className="flex flex-wrap gap-2">{([{ id: 'design', label: 'Nội dung & giao diện' }, { id: 'seo', label: 'SEO' }] as const).map(item => <button key={item.id} type="button" role="tab" aria-selected={pagePanel === item.id} onClick={() => setPagePanel(item.id)} className={`min-h-11 rounded-xl border px-4 font-semibold ${pagePanel === item.id ? 'wi300-pill-active' : 'wi300-pill'}`}>{item.label}</button>)}</div> : <div role="tablist" aria-label="Trang cần tùy chỉnh" className="flex flex-wrap gap-2">{visibleTabs.map(item => <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} onClick={() => setTab(item.id)} className={`min-h-11 rounded-xl border px-4 font-semibold ${tab === item.id ? 'wi300-pill-active' : 'wi300-pill'}`}>{item.label}</button>)}</div>}
    <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(300px,380px)_minmax(0,1fr)]">
      <fieldset hidden={!!pageOnly && pagePanel === 'seo'} disabled={busy} aria-label="Cài đặt trang" className="min-w-0 space-y-4 rounded-2xl border border-brk-outline bg-white p-4 sm:p-5">
        {tab === 'common' && <><h2 className="text-lg font-bold">Thông tin website</h2>{input('common.name', 'Tên website (để trống dùng tên mặc định)')}{input('common.tagline', 'Thông điệp thương hiệu (để trống dùng mặc định)')}</>}
        {tab === 'seo' && <><h2 className="text-lg font-bold">SEO mặc định</h2><p className="text-xs text-brk-muted">Ô trống dùng giá trị mặc định. Trang nội dung riêng vẫn giữ tiêu đề riêng.</p>{input('seo.title', 'Tiêu đề SEO mặc định')}{input('seo.description', 'Mô tả SEO mặc định', true)}{image('seo.imageUrl')}{input('seo.keywords', 'Từ khóa (phân cách bằng dấu phẩy)')}{toggle('seo.index', 'Cho phép công cụ tìm kiếm lập chỉ mục')}{toggle('seo.follow', 'Cho phép công cụ tìm kiếm theo liên kết')}<p className="text-xs text-brk-muted">Ảnh chia sẻ dùng cho Open Graph và Twitter. Từ khóa chỉ là thông tin bổ sung, không đảm bảo thứ hạng.</p></>}
        {tab === 'menu' && <section className="space-y-4">
           <h2 className="text-lg font-bold">Menu đầu trang</h2>
           <p className="text-sm text-brk-muted">Thêm, sửa, ẩn, xóa và sắp xếp menu. Menu ẩn không chặn truy cập trang. Để thay logo đầu trang, vào Cấu hình chung.</p>
           {settings.headerMenu.map((item, index) => <div key={index} className="space-y-2 rounded-xl border border-brk-outline bg-white p-3">
             <div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm">Mục {index + 1}</strong><div className="flex gap-1">
               <button type="button" aria-label="Di chuyển lên" disabled={index === 0} onClick={() => { const next = [...settings.headerMenu]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; change('headerMenu', next) }} className="rounded-lg border p-2 disabled:opacity-30"><ArrowUp className="h-4 w-4"/></button>
               <button type="button" aria-label="Di chuyển xuống" disabled={index === settings.headerMenu.length - 1} onClick={() => { const next = [...settings.headerMenu]; [next[index], next[index + 1]] = [next[index + 1], next[index]]; change('headerMenu', next) }} className="rounded-lg border p-2 disabled:opacity-30"><ArrowDown className="h-4 w-4"/></button>
               <button type="button" onClick={() => change('headerMenu', settings.headerMenu.filter((_, i) => i !== index))} className="rounded-lg border px-3 text-sm text-red-700">Xóa</button>
             </div></div>
             {input(`headerMenu.${index}.label`, 'Tên menu')}
             {input(`headerMenu.${index}.url`, 'Đường dẫn nội bộ hoặc https://')}
             {toggle(`headerMenu.${index}.visible`, 'Hiển thị trên website')}
           </div>)}
           <button type="button" disabled={settings.headerMenu.length >= 12} onClick={() => { let url = '/gioi-thieu'; let suffix = 1; while (settings.headerMenu.some(item => item.url === url)) url = `/gioi-thieu?menu=${suffix++}`; change('headerMenu', [...settings.headerMenu, { label: 'Menu mới', url, visible: true }]) }} className="min-h-11 rounded-xl border border-brk-outline bg-white px-4 text-sm font-semibold disabled:opacity-40">+ Thêm mục menu</button>
         </section>}
         {tab === 'footer' && <><h2 className="text-lg font-bold">Chân trang</h2>{toggle('common.showFooter', 'Hiển thị footer')}{image('footer.logoUrl')}{input('footer.description', 'Giới thiệu ở footer', true)}{input('footer.note', 'Ghi chú', true)}{input('footer.contact', 'Thông tin liên hệ', true)}{input('footer.copyright', 'Dòng bản quyền (để trống dùng mặc định)')}<h2 className="text-lg font-bold">Mạng xã hội</h2>{links('footer.socials', 8)}<h2 className="text-lg font-bold">Nhóm liên kết</h2>{settings.footer.groups.map((group, index) => <section key={index} className="space-y-3 border-t border-brk-outline pt-4">{input(`footer.groups.${index}.title`, 'Tên nhóm')}{links(`footer.groups.${index}.links`, 12)}<button type="button" onClick={() => change('footer.groups', settings.footer.groups.filter((_, i) => i !== index))} className="min-h-11 text-sm text-red-700">Xóa nhóm {index + 1}</button></section>)}<button type="button" disabled={settings.footer.groups.length >= 4} onClick={() => change('footer.groups', [...settings.footer.groups, { title: 'Nhóm mới', links: [] }])} className="min-h-11 rounded-xl border px-3 text-sm disabled:opacity-40">Thêm nhóm liên kết</button></>}
        {tab === 'common' && <><h2 className="text-lg font-bold">Nhận diện</h2>{image('common.logoUrl')}{input('common.iconUrl', 'Đường dẫn favicon')}<h2 className="border-t border-brk-outline pt-4 text-lg font-bold">Màu thương hiệu</h2>{[{ path: 'primary', label: 'Xanh chính' }, { path: 'accent', label: 'Đỏ điểm nhấn' }, { path: 'background', label: 'Nền website' }, { path: 'foreground', label: 'Màu chữ' }].map(item => <label key={item.path} className="flex items-center justify-between gap-3 text-sm">{item.label}<input type="color" aria-label={item.label} value={String(value(`common.${item.path}`))} onChange={event => change(`common.${item.path}`, event.target.value)} className="h-11 w-20" /><span className="font-mono text-xs">{String(value(`common.${item.path}`))}</span></label>)}{select('common.font', 'Font chữ', [{ value: 'vietnam', label: 'Be Vietnam Pro' }, { value: 'system', label: 'Font hệ thống' }])}{select('common.width', 'Chiều rộng nội dung', ['1120', '1280', '1440'].map(value => ({ value, label: `${value}px` })))}{select('common.radius', 'Độ bo góc', [{ value: 'small', label: 'Nhẹ' }, { value: 'medium', label: 'Vừa' }, { value: 'round', label: 'Tròn' }])}{toggle('common.stickyHeader', 'Menu cố định')}{toggle('common.showFooter', 'Hiển thị footer')}</>}
        {tab === 'home' && <><h2 className="text-lg font-bold">Hero trang chủ</h2>{input('home.title', 'Tiêu đề (xuống dòng theo ý muốn)', true)}{input('home.description', 'Mô tả', true)}{image('home.imageUrl')}{input('home.primaryLabel', 'Nhãn nút chính')}{input('home.primaryUrl', 'Đường dẫn nút chính')}{input('home.secondaryLabel', 'Nhãn nút phụ')}{input('home.secondaryUrl', 'Đường dẫn nút phụ')}<h2 className="border-t border-brk-outline pt-4 text-lg font-bold">Các mục hiển thị</h2>{settings.home.order.map((section, index) => <div key={section} className="flex items-center gap-2 rounded-xl border border-brk-outline px-3">{toggle(`home.sections.${section}`, homeSectionLabels[section])}<div className="ml-auto flex">{[-1, 1].map(direction => <button key={direction} type="button" disabled={index + direction < 0 || index + direction >= 4} aria-label={`${direction < 0 ? 'Đưa lên' : 'Đưa xuống'} ${homeSectionLabels[section]}`} onClick={() => { const order = [...settings.home.order]; [order[index], order[index + direction]] = [order[index + direction], order[index]]; change('home.order', order) }} className="flex h-11 w-9 items-center justify-center disabled:opacity-30">{direction < 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}</button>)}</div></div>)}{number('home.projectLimit', 'Số dự án trên trang chủ', 1, 40)}<p className="text-xs text-brk-muted">Chọn dự án lên trang chủ tại Quản lý dự án → Hiển thị trên trang chủ.</p></>}
        {tab === 'courses' && <><h2 className="text-lg font-bold">Nội dung và danh sách khóa học</h2>{input('courses.title', 'Tiêu đề')}{input('courses.description', 'Mô tả', true)}{select('courses.columns', 'Số cột khóa học', columns.filter(option => option.value <= 4))}{toggle('courses.showSearch', 'Tìm kiếm')}{toggle('courses.showCategories', 'Danh mục')}{toggle('courses.showFee', 'Học phí')}<h2 className="border-t border-brk-outline pt-4 text-lg font-bold">Đội ngũ giảng viên</h2>{toggle('courses.showTeachers', 'Hiển thị đội ngũ giảng viên')}{select('courses.teacherLayout', 'Kiểu hiển thị', [{ value: 'grid', label: 'Lưới' }, { value: 'slide', label: 'Slide' }])}{number('courses.teacherTotal', 'Tổng số giảng viên', 1, 50)}{select('courses.teacherPerView', 'Số thẻ mỗi lượt', columns.filter(option => option.value >= 3))}{toggle('courses.autoplay', 'Tự động chuyển')}{number('courses.interval', 'Thời gian chuyển (giây)', 3, 20)}{toggle('courses.arrows', 'Mũi tên hai đầu')}{cta('courses')}</>}
        {tab === 'projects' && <><h2 className="text-lg font-bold">Trang dự án</h2>{toggle('projects.showHero', 'Hiển thị hero')}{input('projects.title', 'Tiêu đề')}{input('projects.description', 'Mô tả', true)}{image('projects.imageUrl')}{select('projects.layout', 'Bố cục thẻ', [{ value: 'vertical', label: 'Thẻ dọc' }, { value: 'horizontal', label: 'Thẻ ngang' }])}{select('projects.columns', 'Số cột thẻ dọc', columns.filter(option => option.value <= 4))}{toggle('projects.showSearch', 'Tìm kiếm')}{toggle('projects.showFilter', 'Lĩnh vực dự án')}{toggle('projects.showCounts', 'Hiển thị số lượng trong bộ lọc')}{cta('projects')}</>}
        {tab === 'teachers' && <><h2 className="text-lg font-bold">Trang giảng viên</h2>{toggle('teachers.showHero', 'Hiển thị hero')}{input('teachers.title', 'Tiêu đề')}{input('teachers.description', 'Mô tả', true)}{image('teachers.imageUrl')}{select('teachers.columns', 'Số cột giảng viên', columns.filter(option => option.value >= 3))}{toggle('teachers.showSearch', 'Tìm theo tên')}{toggle('teachers.showFields', 'Lọc lĩnh vực giảng dạy')}<p className="text-xs leading-5 text-brk-muted">Lĩnh vực lấy từ danh mục khóa học công khai. Một giảng viên có thể thuộc nhiều lĩnh vực.</p>{cta('teachers')}</>}
      </fieldset>
      {pageOnly && pagePanel === 'seo' && <fieldset disabled={busy} aria-label="SEO riêng của trang" className="min-w-0 space-y-4 rounded-2xl border border-brk-outline bg-white p-4 sm:p-5"><h2 className="text-lg font-bold">SEO · {pageLabel}</h2><p className="text-xs leading-5 text-brk-muted">Để trống để kế thừa SEO website. Thay đổi chỉ có hiệu lực sau khi Áp dụng lên website.</p>{input(`pageSeo.${pageOnly}.title`, 'Tiêu đề SEO của trang')}{input(`pageSeo.${pageOnly}.description`, 'Mô tả SEO của trang', true)}{image(`pageSeo.${pageOnly}.imageUrl`)}{input(`pageSeo.${pageOnly}.keywords`, 'Từ khóa của trang')}{toggle(`pageSeo.${pageOnly}.inheritRobots`, 'Kế thừa thiết lập lập chỉ mục của website')}<fieldset disabled={settings.pageSeo[pageOnly].inheritRobots} className="space-y-2 disabled:opacity-50">{toggle(`pageSeo.${pageOnly}.index`, 'Cho phép lập chỉ mục trang này')}{toggle(`pageSeo.${pageOnly}.follow`, 'Cho phép theo liên kết trang này')}</fieldset><div aria-label="Xem trước SEO" className="space-y-2 rounded-xl border border-brk-outline p-3"><p className="break-words text-sm text-brk-muted">{WEBSITE_PAGES.find(item => item.id === pageOnly)?.url}</p><p className="break-words text-lg font-semibold text-blue-800">{settings.pageSeo[pageOnly].title || (pageOnly === 'home' ? settings.seo.title || previewData.brand?.seoTitle : settings[pageOnly].title)}</p><p className="break-words text-sm text-brk-muted">{settings.pageSeo[pageOnly].description || settings.seo.description || previewData.brand?.description}</p></div></fieldset>}
      <section aria-label="Xem trước" className="min-w-0 space-y-3 rounded-2xl border border-brk-outline bg-white p-3 sm:p-4 xl:sticky xl:top-28"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">Xem trước</h2><div className="flex flex-wrap gap-2">{[{ size: 1440, label: 'Máy tính', icon: Monitor }, { size: 768, label: 'Tablet', icon: Tablet }, { size: 390, label: 'Điện thoại', icon: Smartphone }].map(({ size, label, icon: Icon }) => <button key={size} type="button" aria-pressed={width === size} onClick={() => setWidth(size)} className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm ${width === size ? 'wi300-pill-active' : 'wi300-pill'}`}><Icon className="h-4 w-4" />{label}</button>)}</div></div><WiAppearancePreview settings={settings} tab={tab} data={previewData} width={width} /><p className="text-xs leading-5 text-brk-muted">Bản xem trước — chưa áp dụng lên website. Khu vực này chỉ xem; các liên kết và đăng ký được vô hiệu hóa.</p></section>
    </div>
    <div className="xl:sticky xl:bottom-0 z-30 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brk-outline bg-white/95 p-4 shadow-lg"><div className="flex flex-wrap gap-2"><button type="button" disabled={busy || !state.previous} onClick={() => void save('restore')} className="min-h-11 rounded-xl border border-brk-outline px-3 text-sm disabled:opacity-40">Khôi phục bản trước</button><button type="button" disabled={busy} onClick={() => { setSettings(structuredClone(defaultAppearance)); setMessage('Đã đưa mẫu mặc định vào xem trước. Website chưa thay đổi.') }} className="min-h-11 rounded-xl border border-brk-outline px-3 text-sm">Về mẫu mặc định</button></div><p className="text-xs text-brk-muted">{unpublished ? 'Có thay đổi chưa áp dụng.' : 'Giống giao diện đang chạy.'}</p><div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => void save('draft')} className="min-h-11 rounded-xl border border-brk-outline px-4 font-semibold disabled:opacity-50">Lưu bản nháp</button><button type="button" disabled={busy} onClick={() => void save('publish')} className="wi300-pill-active min-h-11 rounded-xl border px-4 font-semibold disabled:opacity-50">{busy ? 'Đang xử lý…' : 'Áp dụng lên website'}</button></div></div>
  </main>
}
