import { notFound } from 'next/navigation'
import { getPagePresentation, getPresentationBrand } from '@/lib/site-profile/presentation'
import { findExternalApp } from '@/lib/wi300/external-apps'
import { ExternalAppViewer } from '@/components/wi300/Wi300ExternalApps'

export const metadata = { title: 'Công cụ WI300', robots: { index: false, follow: false } }
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const app = findExternalApp((await params).slug)
  if (!app) notFound()
  // Trình xem ứng dụng ngoài dùng chung cho cả hai giao diện; bản wi300
  // giữ nguyên điều kiện brand như cũ.
  if (await getPagePresentation('external-app') === 'classic') return <ExternalAppViewer key={app.slug} app={app} />
  if (!await getPresentationBrand('external-app')) notFound()
  return <ExternalAppViewer key={app.slug} app={app} />
}
