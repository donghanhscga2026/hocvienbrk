'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import MainHeader from '@/components/layout/MainHeader'
import MySiteTab from './MySiteTab'
import LandingsTab from './LandingsTab'
import SiteProfilesTab from './SiteProfilesTab'

function PagesPageContent() {
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<'my-site' | 'landings' | 'site-profiles'>('my-site')

  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam === 'my-site' || tabParam === 'landings' || tabParam === 'site-profiles') {
      setTab(tabParam)
    }
  }, [searchParams])

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
        <button
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
        </button>
      </div>

      {tab === 'my-site' && <MySiteTab />}
      {tab === 'landings' && <LandingsTab />}
      {tab === 'site-profiles' && <SiteProfilesTab />}
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
