import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import MainHeader from '@/components/layout/MainHeader'
import PublicTools from '@/components/tools/PublicTools'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Công cụ tiện ích' }

export default async function ToolsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [session, params] = await Promise.all([auth(), searchParams])
  const query = new URLSearchParams()
  // Giữ mã giới thiệu và tham số cũ; tab luôn trỏ đến danh sách công cụ chính.
  for (const [key, value] of Object.entries(params)) {
    if (key === 'tab' || key === 'logged_in' || value == null) continue
    for (const item of Array.isArray(value) ? value : [value]) query.append(key, item)
  }
  if (session?.user?.id != null) {
    query.set('tab', 'tools')
    redirect('/my-space?' + query.toString())
  }
  const callback = '/tools' + (query.size ? '?' + query.toString() : '')
  return <main className="min-h-screen bg-brk-background">
    <MainHeader title="Công cụ tiện ích" />
    <PublicTools loginHref={'/login?callbackUrl=' + encodeURIComponent(callback)} />
  </main>
}
