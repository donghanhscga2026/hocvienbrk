import { notFound } from 'next/navigation'
import { getCurrentDeploymentBrand } from '@/lib/site-profile/deployment-runtime'
import { findExternalApp } from '@/lib/wi300/external-apps'
import { ExternalAppViewer } from '@/components/wi300/Wi300ExternalApps'

export const metadata = { title: 'Công cụ WI300', robots: { index: false, follow: false } }
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const app = findExternalApp((await params).slug)
  if (!app || !await getCurrentDeploymentBrand()) notFound()
  return <ExternalAppViewer key={app.slug} app={app} />
}
