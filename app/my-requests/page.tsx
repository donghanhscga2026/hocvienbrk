import { Suspense } from 'react'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import MainHeader from '@/components/layout/MainHeader'
import MyRequests from '@/components/crm/MyRequests'

export const dynamic = 'force-dynamic'
export default async function MyRequestsPage() {
  if (!(await auth())?.user) redirect('/login?callbackUrl=%2Fmy-requests')
  return <div className="min-h-screen bg-slate-50"><MainHeader title="Yêu cầu của tôi" /><Suspense fallback={<p className="p-4">Đang tải yêu cầu…</p>}><MyRequests /></Suspense></div>
}
