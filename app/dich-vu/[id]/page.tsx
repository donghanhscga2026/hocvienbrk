import OfferingSalesPage from '@/components/offerings/OfferingSalesPage'
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <OfferingSalesPage slug={(await params).id} group="SERVICE" />
}
