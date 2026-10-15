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

      <div className="flex items-center gap-1 px-4 py-3 bg-white border-b border-gray-100 overflow-x-auto">
        <button
          onClick={() => setTab('my-site')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            tab === 'my-site' ? 'bg-black text-yellow-400 shadow-sm' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
          }`}
        >
          🏠 Trang của tôi
        </button>
        {isAdmin && <><button
          onClick={() => setTab('landings')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            tab === 'landings' ? 'bg-black text-yellow-400 shadow-sm' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
          }`}
        >
          🚀 Landing Page
        </button>
        <button
          onClick={() => setTab('site-profiles')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            tab === 'site-profiles' ? 'bg-black text-yellow-400 shadow-sm' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
          }`}
        >
          📄 Site Profile
        </button></>}
      </div>

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
