'use client'
import { useEffect, useState } from 'react'
type Profile = { id: number; slug: string; title: string | null; isActive: boolean; user: { name: string | null } | null; access: 'owner' | 'admin' | 'collaborator' }
async function fetchProfiles(page: number, signal?: AbortSignal): Promise<{ profiles: Profile[]; nextPage: number | null }> {
  const response = await fetch('/api/websites/manageable?page=' + page, { cache: 'no-store', signal }), data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Không tải được website.')
  return data
}
export default function WebsiteList() {
  const [profiles, setProfiles] = useState<Profile[]>([]), [nextPage, setNextPage] = useState<number | null>(1)
  const [error, setError] = useState(''), [busy, setBusy] = useState(true)
  async function load(page: number) {
    setBusy(true); setError('')
    try {
      const data = await fetchProfiles(page)
      setProfiles(prior => [...prior.filter(item => !data.profiles.some((next: Profile) => next.id === item.id)), ...data.profiles]); setNextPage(data.nextPage)
    } catch (error) { setError(error instanceof Error ? error.message : 'Không tải được website.') } finally { setBusy(false) }
  }
  useEffect(() => {
    const controller = new AbortController()
    fetchProfiles(1, controller.signal).then(data => {
      if (!controller.signal.aborted) { setProfiles(data.profiles); setNextPage(data.nextPage) }
    }).catch(error => {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Không tải được website.')
    }).finally(() => { if (!controller.signal.aborted) setBusy(false) })
    return () => controller.abort()
  }, [])
  return <section className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
    <header><h1 className="text-2xl font-bold text-slate-900">Website bạn quản lý</h1><p className="mt-2 text-sm text-slate-600">Chọn website để sửa nội dung, giao diện và trang con. Mỗi tài khoản sở hữu tối đa một Site Profile.</p></header>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
    {(['owner', 'collaborator', 'admin'] as const).map(access => {
      const group = profiles.filter(profile => profile.access === access)
      if (!group.length) return null
      return <div key={access}><h2 className="mb-3 text-lg font-semibold">{access === 'owner' ? 'Website của tôi' : access === 'collaborator' ? 'Website tôi được cộng tác' : 'Website khác · Quyền admin'}</h2><div className="grid gap-4 sm:grid-cols-2">{group.map(profile => <article key={profile.id} className="min-w-0 space-y-3 rounded-2xl border bg-white p-5"><h3 className="break-words font-bold">{profile.title || profile.slug}</h3><p className="break-all text-sm text-slate-500">/page/{profile.slug} · {profile.isActive ? 'Đang hoạt động' : 'Chưa kích hoạt'}</p>{profile.user?.name && <p className="text-sm text-slate-600">Chủ website: {profile.user.name}</p>}<div className="flex flex-wrap gap-3"><a className="inline-flex min-h-11 items-center rounded-xl bg-violet-700 px-4 text-sm font-medium text-white" href={'/tools/my-site/manage?profileId=' + profile.id}>Quản trị website</a><a className="inline-flex min-h-11 items-center text-sm text-violet-700" href={'/page/' + profile.slug} target="_blank" rel="noreferrer">Xem website ↗</a></div></article>)}</div></div>
    })}
    {!busy && !error && !profiles.length && <p className="rounded-xl border bg-white p-5">Bạn chưa có website hoặc chưa được cấp quyền quản trị. Chủ website cần bật “Cho phép quản trị website” cho tài khoản của bạn.</p>}
    {nextPage && <button type="button" disabled={busy} className="min-h-11 rounded-xl border px-5 disabled:opacity-50" onClick={() => void load(nextPage)}>{busy ? 'Đang tải…' : profiles.length ? 'Xem thêm website' : 'Thử lại'}</button>}
  </section>
}
