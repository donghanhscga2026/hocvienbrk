'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Globe2, Save, SlidersHorizontal } from 'lucide-react'
import { isPlatformHost, requestHostname } from '@/lib/website/domain-shared'
import { updateSiteProfileRuntime } from '@/app/actions/site-profile-actions'

type ProfileLike = {
  id: number
  userId?: number | null
  themeId?: string | null
  siteConfig?: unknown
  websiteAccessConfigured?:boolean
  verifiedDomains?: Array<{hostname:string}>
  domains?: Array<{ hostname: string; isPrimary: boolean; isActive: boolean }>
}

type Props = {
  profile: ProfileLike
  onSaved?: () => void | Promise<void>
}

function record(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function intList(value: string) {
  return Array.from(new Set(
    value
      .split(',')
      .map(item => Number(item.trim()))
      .filter(item => Number.isInteger(item) && item > 0),
  ))
}

function listText(value: unknown) {
  return Array.isArray(value)
    ? value.filter(item => Number.isInteger(Number(item))).join(', ')
    : ''
}

export default function SiteRuntimeConfigEditor({ profile, onSaved }: Props) {
  const initial = useMemo(() => {
    const config = record(profile.siteConfig)
    const branding = record(config.branding)
    const homepage = record(config.homepage)
    const modules = record(config.modules)
    const courseScope = record(config.courseScope)
    const theme = record(config.theme)
    const primary = profile.domains?.find(item => item.isPrimary) || profile.domains?.[0]
    const additional = (profile.domains || []).filter(item => item.hostname !== primary?.hostname)

    return {
      primaryDomain: primary?.hostname || '',
      additionalDomains: additional.map(item => item.hostname).join(', '),
      brandName: String(branding.name || ''),
      logoUrl: String(branding.logoUrl || ''),
      faviconUrl: String(branding.faviconUrl || ''),
      homepageType: String(homepage.type || 'community'),
      landingSlug: String(homepage.landingSlug || ''),
      courseScopeMode: String(courseScope.mode || (profile.userId != null && profile.userId !== 0 ? 'profile' : 'all')),
      teacherIds: listText(courseScope.teacherIds),
      courseIds: listText(courseScope.courseIds),
      categoryIds: listText(courseScope.categoryIds),
      modules: {
        courses: modules.courses !== false,
        community: modules.community !== false,
        affiliate: modules.affiliate !== false,
        tools: modules.tools !== false,
        surveys: modules.surveys !== false,
        roadmap: modules.roadmap !== false,
      },
      allowUserOverride: theme.allowUserOverride === true,
      themeId: profile.themeId || '',
    }
  }, [profile])

  const [primaryDomain, setPrimaryDomain] = useState(initial.primaryDomain)
  const [additionalDomains, setAdditionalDomains] = useState(initial.additionalDomains)
  const [brandName, setBrandName] = useState(initial.brandName)
  const [logoUrl, setLogoUrl] = useState(initial.logoUrl)
  const [faviconUrl, setFaviconUrl] = useState(initial.faviconUrl)
  const [homepageType, setHomepageType] = useState(initial.homepageType)
  const [landingSlug, setLandingSlug] = useState(initial.landingSlug)
  const [courseScopeMode, setCourseScopeMode] = useState(initial.courseScopeMode)
  const [teacherIds, setTeacherIds] = useState(initial.teacherIds)
  const [courseIds, setCourseIds] = useState(initial.courseIds)
  const [categoryIds, setCategoryIds] = useState(initial.categoryIds)
  const [modules, setModules] = useState(initial.modules)
  const [allowUserOverride, setAllowUserOverride] = useState(initial.allowUserOverride)
  const [themeId, setThemeId] = useState(initial.themeId)
  const [themes, setThemes] = useState<Array<{ id: string; name: string }>>([])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetch('/api/admin/theme')
      .then(response => response.ok ? response.json() : Promise.reject(new Error('Không tải được theme')))
      .then(data => setThemes(Array.isArray(data.themes) ? data.themes : []))
      .catch(() => setThemes([]))
  }, [])

  async function saveRuntime() {
    setSaving(true)
    setMessage(null)
    try {
    const result = await updateSiteProfileRuntime(profile.id, {
      primaryDomain,
      additionalDomains: additionalDomains.split(',').map(item => item.trim()).filter(Boolean),
      themeId: themeId || null,
      siteConfig: {
        branding: {
          ...(brandName.trim() ? { name: brandName.trim() } : {}),
          ...(logoUrl.trim() ? { logoUrl: logoUrl.trim() } : {}),
          ...(faviconUrl.trim() ? { faviconUrl: faviconUrl.trim() } : {}),
        },
        homepage: {
          type: homepageType,
          ...(landingSlug.trim() ? { landingSlug: landingSlug.trim() } : {}),
        },
        modules,
        courseScope: {
          mode: courseScopeMode,
          ...(teacherIds.trim() ? { teacherIds: intList(teacherIds) } : {}),
          ...(courseIds.trim() ? { courseIds: intList(courseIds) } : {}),
          ...(categoryIds.trim() ? { categoryIds: intList(categoryIds) } : {}),
        },
        theme: { allowUserOverride },
      },
    })

    if (result.error) {
      setMessage({ type: 'error', text: result.error })
    } else {
      setMessage({ type: 'success', text: 'Đã lưu cấu hình website.' })
      await onSaved?.()
    }
    } catch (error) {
      setMessage({type:'error',text:error instanceof Error ? error.message : 'Không thể lưu cấu hình. Vui lòng thử lại.'})
    } finally {
      setSaving(false)
    }
  }

  // Giữ các thiết lập của hệ thống chính khi lưu, dù không hiện trên domain riêng.
  const customDomainConfigured = [primaryDomain, ...additionalDomains.split(','), ...(profile.verifiedDomains || []).map(domain => domain.hostname)]
    .some(host => host.trim() && !isPlatformHost(requestHostname(host.trim())))

  const moduleLabels: Array<[keyof typeof modules, string]> = [
    ['courses', 'Khóa học'],
    ['community', 'Cộng đồng'],
    ['affiliate', 'Affiliate'],
    ['tools', 'Công cụ'],
    ['surveys', 'Khảo sát'],
    ['roadmap', 'Lộ trình'],
  ]

  return (
    <section className="bg-white rounded-2xl border border-emerald-100 p-6 space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
          <Globe2 className="h-5 w-5 text-emerald-600" />
          Cấu hình website nâng cao
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Thiết lập dành cho quản trị viên. Chủ website quản lý giao diện, dữ liệu và kết nối ứng dụng tại Quản lý website của tôi.
        </p>
      </div>

      <Link href="/tools/my-site/manage" className="inline-flex min-h-11 items-center text-sm font-semibold text-violet-700 underline">Mở quản lý website của tôi →</Link>
      <p className="text-sm text-gray-500">Liên kết trên mở website của tài khoản đang đăng nhập. Các thiết lập bên dưới áp dụng cho hồ sơ đang chỉnh sửa.</p>
      {message && (
        <div className={`rounded-xl border p-3 text-sm ${message.type === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-gray-700">
          Tên miền chính
          <input value={primaryDomain} onChange={e => setPrimaryDomain(e.target.value)} placeholder="example.com" className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 font-mono text-sm" />
        </label>
        <label className="text-sm font-medium text-gray-700">
          Tên miền phụ
          <input value={additionalDomains} onChange={e => setAdditionalDomains(e.target.value)} placeholder="www.example.com, alias.example.com" className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 font-mono text-sm" />
        </label>
      </div>

      <p className="text-sm text-gray-500">Lưu tên miền tại đây chưa tự kết nối DNS hoặc kích hoạt HTTPS. Cần hoàn tất cấu hình tên miền trên nơi triển khai.</p>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="text-sm font-medium text-gray-700">
          Tên thương hiệu
          <input value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="Tên hiển thị của website" className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm" />
        </label>
        <label className="text-sm font-medium text-gray-700">
          Logo URL
          <input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://..." className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 font-mono text-sm" />
        </label>
        <label className="text-sm font-medium text-gray-700">
          Favicon URL
          <input value={faviconUrl} onChange={e => setFaviconUrl(e.target.value)} placeholder="https://..." className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 font-mono text-sm" />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="text-sm font-medium text-gray-700">
          Loại trang chủ
          <select value={homepageType} onChange={e => setHomepageType(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3">
            <option value="community">Trang cộng đồng</option>
            <option value="profile">Trang cá nhân / chuyên gia</option>
            <option value="website">Thiết kế tự do đã xuất bản</option>
            <option value="landing">Landing Page</option>
          </select>
        </label>

        <label className="text-sm font-medium text-gray-700">
          Mã đường dẫn landing page
          <input value={landingSlug} disabled={homepageType !== 'landing'} onChange={e => setLandingSlug(e.target.value)} placeholder="landing-slug" className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 font-mono text-sm disabled:bg-gray-100" />
        </label>

        <label className="text-sm font-medium text-gray-700">
          Bộ màu website
          <select value={themeId} onChange={e => setThemeId(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3">
            <option value="">Không gán theme</option>
            {themes.map(theme => <option key={theme.id} value={theme.id}>{theme.name}</option>)}
          </select>
        </label>
      </div>

      {(homepageType === 'community' || homepageType === 'profile') && <p className="rounded-xl bg-slate-50 p-3 text-sm text-gray-600">Trang cộng đồng và trang cá nhân hiện dùng chung bố cục có sẵn. Bảng tin được điều khiển bằng mục Cộng đồng bên dưới; đây chưa phải hai mẫu bố cục riêng.</p>}
      <div className="space-y-3">
        <div className="flex items-center gap-2 font-bold text-gray-800">
          <SlidersHorizontal className="h-4 w-4" /> Phạm vi khóa học
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-gray-700">Nguồn khóa học
            <select value={courseScopeMode} onChange={e => setCourseScopeMode(e.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm">
              <option value="all">Tất cả khóa học</option>
              <option value="profile">Chủ website và giáo viên liên kết</option>
              <option value="teacher">Giáo viên được chỉ định</option>
              <option value="ids">Khóa học được chỉ định</option>
              <option value="category">Danh mục được chỉ định</option>
            </select>
          </label>
          {courseScopeMode === 'teacher' && <label className="text-sm font-medium text-gray-700">Mã giáo viên
            <input value={teacherIds} onChange={e => setTeacherIds(e.target.value)} placeholder="Ví dụ: 1622, 1675" className="mt-1 min-h-11 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm" />
          </label>}
          {courseScopeMode === 'ids' && <label className="text-sm font-medium text-gray-700">Mã khóa học
            <input value={courseIds} onChange={e => setCourseIds(e.target.value)} placeholder="Ví dụ: 12, 35" className="mt-1 min-h-11 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm" />
          </label>}
          {courseScopeMode === 'category' && <label className="text-sm font-medium text-gray-700">Mã danh mục
            <input value={categoryIds} onChange={e => setCategoryIds(e.target.value)} placeholder="Ví dụ: 1, 4" className="mt-1 min-h-11 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm" />
          </label>}
        </div>
        <p className="text-sm text-gray-500">{courseScopeMode === 'profile'
          ? 'Tự lấy khóa học của chủ website và giáo viên đã liên kết. Không cần nhập mã.'
          : courseScopeMode === 'all' ? 'Hiển thị tất cả khóa học được công bố. Quyền học bài vẫn theo đăng ký của từng tài khoản.'
          : 'Nhập các mã cách nhau bằng dấu phẩy. Để trống sẽ không chọn khóa học nào; các ô của kiểu lọc khác không được áp dụng.'}</p>
      </div>

      <div>
        <div className="mb-2 text-sm font-bold text-gray-800">Nội dung và điều hướng</div>
        <div className="flex flex-wrap gap-3">
          <p className="w-full text-sm text-gray-500">Khi website đã có gói quyền, Khóa học và Affiliate được quản lý tại phần kết nối ứng dụng. Các tùy chọn nội dung khác vẫn chỉnh tại đây. Ẩn mục Công cụ chỉ ẩn menu, không thu hồi quyền ứng dụng.</p>
          {moduleLabels.filter(([key])=>(!profile.websiteAccessConfigured || !['courses','affiliate'].includes(key)) && (!customDomainConfigured || !['surveys','roadmap'].includes(key))).map(([key, label]) => (
            <label key={key} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm">
              <input type="checkbox" checked={modules[key]} onChange={e => setModules(prev => ({ ...prev, [key]: e.target.checked }))} />
              {label}
            </label>
          ))}
          {!customDomainConfigured && <label className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm">
            <input type="checkbox" checked={allowUserOverride} onChange={e => setAllowUserOverride(e.target.checked)} />
            Cho phép người dùng tự đổi bộ màu
          </label>}
          {customDomainConfigured && <p className="w-full rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Khảo sát, lộ trình và tự đổi bộ màu hiện chỉ hỗ trợ trên hệ thống chính. Các giá trị cũ được giữ nguyên, không có tác dụng trên tên miền riêng.</p>}
        </div>
      </div>

      <button type="button" onClick={saveRuntime} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white disabled:opacity-50">
        <Save className="h-4 w-4" /> {saving ? 'Đang lưu...' : 'Lưu cấu hình website'}
      </button>
    </section>
  )
}
