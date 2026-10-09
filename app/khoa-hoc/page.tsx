import { notFound } from 'next/navigation'
import { getCurrentDeploymentBrand } from '@/lib/site-profile/deployment-runtime'
import { getSession } from '@/lib/get-session'
import Wi300Home from '@/components/wi300/Wi300Home'

export const metadata = { title: 'Khám phá khóa học' }
export default async function Page() {
  const brand = await getCurrentDeploymentBrand()
  if (!brand) notFound()
  return <Wi300Home brand={brand} session={await getSession()} view="catalog" />
}
