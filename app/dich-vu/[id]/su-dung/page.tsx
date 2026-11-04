import OfferingWorkspace from '@/components/offerings/OfferingWorkspace'
export const metadata = { title: 'Không gian dịch vụ', robots: { index: false, follow: false } }
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <OfferingWorkspace slug={(await params).id} group="SERVICE" />
}
