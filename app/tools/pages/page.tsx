'use client'

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { canCreateProfile } from '@/lib/auth/roles'
import MainHeader from '@/components/layout/MainHeader'
import MySiteTab from './MySiteTab'
import LandingsTab from './LandingsTab'
import SiteProfilesTab from './SiteProfilesTab'

function PagesPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'
  const requested = searchParams.get('tab')
  const tab = isAdmin && (requested === 'landings' || requested === 'site-profiles') ? requested : 'my-site'
  const setTab = (next: string) => router.replace('/tools/pages?tab=' + next, { scroll: false })

  if (status === 'loading') return <p role="status" className="p-4">Đang tải…</p>
  if (!canCreateProfile(session?.user?.role)) return <p role="alert" className="p-4">Chỉ giảng viên và admin được quản lý Page.</p>

  return (
    <div className="min-h-screen bg-gray-50">
      <MainHeader title="PAGE" toolSlug="pages" />

      {isAdmin && <details className="mx-4 my-3 rounded-xl border bg-white p-3" open={tab!=='my-site'}><summary className="cursor-pointer text-sm font-medium text-slate-600">Quản trị hệ thống</summary><div className="mt-3 flex flex-wrap gap-2">{[['my-site','Website của tôi'],['landings','Landing Page'],['site-profiles','Site Profile']].map(([id,label])=><button key={id} aria-pressed={tab===id} onClick={()=>setTab(id)} className={'rounded-xl px-4 py-2 text-sm '+(tab===id?'bg-violet-700 text-white':'border text-slate-600')}>{label}</button>)}</div></details>}
      {(tab === 'my-site' || !isAdmin) && <MySiteTab />}
      {isAdmin && tab === 'landings' && <LandingsTab />}
      {isAdmin && tab === 'site-profiles' && <SiteProfilesTab />}
    </div>
  )
}

export default function PagesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Đang tải...</div>}>
      <PagesPageContent />
    </Suspense>
  )
}
