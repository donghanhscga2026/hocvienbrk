import CourseSalesPage, { generateSalesMetadata, type SalesPageProps } from '@/components/course-page/CourseSalesPage'

export async function generateMetadata(props: Pick<SalesPageProps, 'params'>) { return generateSalesMetadata(props) }
export default async function Page(props: Pick<SalesPageProps, 'params' | 'searchParams'>) {
  return CourseSalesPage({ ...props, canonicalCourseRoute: true })
}
