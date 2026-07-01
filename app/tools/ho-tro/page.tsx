'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import MainHeader from '@/components/layout/MainHeader'
import AccountAssistantTab from './AccountAssistantTab'
import AssistantGuideTab from './AssistantGuideTab'

export default function HoTroPage() {
  const { data: session, status } = useSession()
  const [tab, setTab] = useState<'account-assistant' | 'assistant-guide'>('account-assistant')

  const isAdmin = session?.user?.role === 'ADMIN'

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-black rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <MainHeader title="HỖ TRỢ" toolSlug="ho-tro" />
        <div className="p-4 max-w-lg mx-auto text-center pt-12">
          <p className="text-gray-500 text-sm">Bạn không có quyền truy cập trang này.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MainHeader title="HỖ TRỢ" toolSlug="ho-tro" />

      {/* Tab Bar */}
      <div className="flex items-center gap-1 px-4 py-3 bg-white border-b border-gray-100">
        <button
          onClick={() => setTab('account-assistant')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            tab === 'account-assistant' ? 'bg-black text-yellow-400 shadow-sm' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
          }`}
        >
          🤖 Trợ lý tài khoản
        </button>
        <button
          onClick={() => setTab('assistant-guide')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            tab === 'assistant-guide' ? 'bg-black text-yellow-400 shadow-sm' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
          }`}
        >
          🧭 Trợ lý ảo
        </button>
      </div>

      {tab === 'account-assistant' ? <AccountAssistantTab /> : <AssistantGuideTab />}
    </div>
  )
}
