import { notFound, redirect } from 'next/navigation'
import { getCurrentDeploymentBrand } from '@/lib/site-profile/deployment-runtime'
import { getSession } from '@/lib/get-session'
import Wi300Home from '@/components/wi300/Wi300Home'

export const metadata = { title: 'Không gian của tôi', robots: { index: false, follow: false } }
export default async function Page() {
  const brand = await getCurrentDeploymentBrand()
  if (!brand) notFound()
  const session = await getSession()
  if (session?.user?.id == null) redirect('/login?callbackUrl=%2Fmy-space')
  return <Wi300Home brand={brand} session={session} view="space" />
}
