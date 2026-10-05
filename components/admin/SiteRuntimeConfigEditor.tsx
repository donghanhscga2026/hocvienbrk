'use client'

import { useEffect, useMemo, useState } from 'react'
import { Globe2, Save, SlidersHorizontal } from 'lucide-react'
import { updateSiteProfileRuntime } from '@/app/actions/site-profile-actions'

type ProfileLike = {
  id: number
  userId?: number | null
  themeId?: string | null
  siteConfig?: unknown
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
    const homepage = record(config.homepage)
    const modules = record(config.modules)
    const courseScope = record(config.courseScope)
    const theme = record(config.theme)
    const primary = profile.domains?.find(item => item.isPrimary) || profile.domains?.[0]
    const additional = (profile.domains || []).filter(item => item.hostname !== primary?.hostname)

    return {
      primaryDomain: primary?.hostname || '',
      additionalDomains: additional.map(item => item.hostname).join(', '),
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
    const result = await updateSiteProfileRuntime(profile.id, {
      primaryDomain,
      additionalDomains: additionalDomains.split(',').map(item => item.trim()).filter(Boolean),
      themeId: themeId || null,
      siteConfig: {
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
    setSaving(false)
  }

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
          Cấu hình website theo domain
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Tất cả giá trị dưới đây được lưu trong database. Không cần sửa code khi đổi domain, trang chủ, theme hoặc phạm vi khóa học.
        </p>
      </div>

      {message && (
        <div className={`rounded-xl border p-3 text-sm ${message.type === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-gray-700">
          Domain chính
          <input value={primaryDomain} onChange={e => setPrimaryDomain(e.target.value)} placeholder="example.com" className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 font-mono text-sm" />
        </label>
        <label className="text-sm font-medium text-gray-700">
          Domain phụ
          <input value={additionalDomains} onChange={e => setAdditionalDomains(e.target.value)} placeholder="www.example.com, alias.example.com" className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 font-mono text-sm" />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="text-sm font-medium text-gray-700">
          Loại trang chủ
          <select value={homepageType} onChange={e => setHomepageType(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3">
            <option value="community">Trang cộng đồng</option>
            <option value="profile">Trang profile</option>
            <option value="website">Website Builder</option>
            <option value="landing">Landing Page</option>
          </select>
        </label>

        <label className="text-sm font-medium text-gray-700">
          Landing slug
          <input value={landingSlug} disabled={homepageType !== 'landing'} onChange={e => setLandingSlug(e.target.value)} placeholder="landing-slug" className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 font-mono text-sm disabled:bg-gray-100" />
        </label>

        <label className="text-sm font-medium text-gray-700">
          Theme
          <select value={themeId} onChange={e => setThemeId(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3">
            <option value="">Không gán theme</option>
            {themes.map(theme => <option key={theme.id} value={theme.id}>{theme.name} ({theme.id})</option>)}
          </select>
        </label>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 font-bold text-gray-800">
          <SlidersHorizontal className="h-4 w-4" /> Phạm vi khóa học
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <select value={courseScopeMode} onChange={e => setCourseScopeMode(e.target.value)} className="rounded-xl border border-gray-200 px-4 py-3 text-sm">
            <option value="all">Tất cả khóa học</option>
            <option value="profile">Teacher + cộng sự của profile</option>
            <option value="teacher">Theo Teacher ID</option>
            <option value="ids">Chọn Course ID</option>
            <option value="category">Theo Category ID</option>
          </select>
          <input value={teacherIds} onChange={e => setTeacherIds(e.target.value)} placeholder="Teacher IDs: 1622, 1675" className="rounded-xl border border-gray-200 px-4 py-3 text-sm" />
          <input value={courseIds} onChange={e => setCourseIds(e.target.value)} placeholder="Course IDs: 12, 35" className="rounded-xl border border-gray-200 px-4 py-3 text-sm" />
          <input value={categoryIds} onChange={e => setCategoryIds(e.target.value)} placeholder="Category IDs: 1, 4" className="rounded-xl border border-gray-200 px-4 py-3 text-sm" />
        </div>
      </div>

      <div>
        <div className="mb-2 text-sm font-bold text-gray-800">Thành phần được phép hiển thị</div>
        <div className="flex flex-wrap gap-3">
          {moduleLabels.map(([key, label]) => (
            <label key={key} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm">
              <input type="checkbox" checked={modules[key]} onChange={e => setModules(prev => ({ ...prev, [key]: e.target.checked }))} />
              {label}
            </label>
          ))}
          <label className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm">
            <input type="checkbox" checked={allowUserOverride} onChange={e => setAllowUserOverride(e.target.checked)} />
            Cho phép người dùng tự đổi theme
          </label>
        </div>
      </div>

      <button type="button" onClick={saveRuntime} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white disabled:opacity-50">
        <Save className="h-4 w-4" /> {saving ? 'Đang lưu...' : 'Lưu cấu hình website'}
      </button>
    </section>
  )
}
