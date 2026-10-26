import { redirect } from 'next/navigation'
import { getCurrentDeploymentBrand } from '@/lib/site-profile/deployment-runtime'
import { getPagePresentation } from '@/lib/site-profile/presentation'
import { getSession } from '@/lib/get-session'
import Wi300Home from '@/components/wi300/Wi300Home'

export const metadata = { title: 'Không gian của tôi', robots: { index: false, follow: false } }
export default async function Page({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await getSession()
  if (session?.user?.id == null) redirect('/login?callbackUrl=%2Fmy-space')
  if (await getPagePresentation('my-space') === 'classic') {
    const { default: ClassicMySpace } = await import('@/components/classic/ClassicMySpace')
    const params = (await searchParams) || {}
    const tab = typeof params.tab === 'string' ? params.tab : undefined
    const status = typeof params.status === 'string' ? params.status : undefined
    return <ClassicMySpace session={session} tab={tab} status={status} />
  }
  const brand = await getCurrentDeploymentBrand()
  if (!brand) redirect('/')
  return <Wi300Home brand={brand} session={session} view="space" />
}
