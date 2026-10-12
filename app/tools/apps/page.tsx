import { notFound } from 'next/navigation'
import { getCurrentDeploymentBrand } from '@/lib/site-profile/deployment-runtime'
import { ExternalAppsCatalog } from '@/components/wi300/Wi300ExternalApps'

export const metadata = { title: 'Ứng dụng WI300', robots: { index: false, follow: false } }
export default async function Page() {
  if (!await getCurrentDeploymentBrand()) notFound()
  return <ExternalAppsCatalog />
}
