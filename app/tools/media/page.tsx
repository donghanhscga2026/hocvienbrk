import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import { domainContext } from '@/lib/website/domain-context'
import MediaManager from '@/components/admin/MediaManager'

export const metadata = { title: 'Thư viện media', robots: { index: false, follow: false } }
export default async function Page() {
  const session = await auth()
  if (!session?.user) redirect('/login?callbackUrl=%2Ftools%2Fmedia')
  if (session.user.role !== 'ADMIN' || await domainContext()) notFound()
  return <MediaManager />
}
