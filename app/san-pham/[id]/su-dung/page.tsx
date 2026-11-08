import OfferingWorkspace from '@/components/offerings/OfferingWorkspace'
import { getPagePresentation } from '@/lib/site-profile/presentation'
export const metadata = { title: 'Không gian sử dụng sản phẩm', robots: { index: false, follow: false } }
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const presentation = await getPagePresentation('products')
  return <OfferingWorkspace slug={(await params).id} group="DIGITAL" variant={presentation === 'classic' ? 'classic' : undefined} />
}
