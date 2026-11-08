import OfferingWorkspace from '@/components/offerings/OfferingWorkspace'
import { getPagePresentation } from '@/lib/site-profile/presentation'
export const metadata = { title: 'Không gian dịch vụ', robots: { index: false, follow: false } }
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const presentation = await getPagePresentation('services')
  return <OfferingWorkspace slug={(await params).id} group="SERVICE" variant={presentation === 'classic' ? 'classic' : undefined} />
}
