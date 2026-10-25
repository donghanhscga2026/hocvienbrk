import { Suspense } from 'react'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import MainHeader from '@/components/layout/MainHeader'
import MyRequests from '@/components/crm/MyRequests'
import MyBookingsSection from '@/components/booking/MyBookingsSection'

export const dynamic = 'force-dynamic'
export default async function MyRequestsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login?callbackUrl=%2Fmy-requests')
  const userId = Number(session.user.id)
  const email = session.user.email || null
  return (
    <div className="min-h-screen bg-slate-50">
      <MainHeader title="Yêu cầu của tôi" />
      <Suspense fallback={<p className="p-4">Đang tải yêu cầu…</p>}><MyRequests /></Suspense>
      <Suspense fallback={null}><MyBookingsSection userId={userId} email={email} /></Suspense>
    </div>
  )
}
