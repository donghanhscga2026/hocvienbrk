import OfferingDetail from '@/components/offerings/OfferingDetail'
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <OfferingDetail slug={(await params).id} expectedGroup="DIGITAL" />
}
