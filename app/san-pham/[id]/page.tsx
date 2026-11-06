import OfferingSalesPage from '@/components/offerings/OfferingSalesPage'
import { generateSalesMetadata, type SalesPageProps } from '@/components/course-page/CourseSalesPage'
export async function generateMetadata(props: Pick<SalesPageProps, 'params'>) { return generateSalesMetadata({ ...props, expectedGroup: 'DIGITAL' }) }
export default async function Page({ params, searchParams }: Pick<SalesPageProps, 'params' | 'searchParams'>) {
  return <OfferingSalesPage slug={(await params).id} searchParams={searchParams} group="DIGITAL" />
}
