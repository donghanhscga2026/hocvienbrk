import { notFound } from 'next/navigation'
import { pageMetadata } from '@/lib/wi300/website-config'
import { getCurrentDeploymentBrand } from '@/lib/site-profile/deployment-runtime'
import { getPagePresentation } from '@/lib/site-profile/presentation'
import { getSession } from '@/lib/get-session'
import Wi300Home from '@/components/wi300/Wi300Home'

export async function generateMetadata() {
  const brand = await getCurrentDeploymentBrand()
  return brand ? pageMetadata(brand, 'teachers') : { title: 'Đội ngũ giảng viên' }
}
export default async function Page() {
  if (await getPagePresentation('teachers') === 'classic') {
    const { ClassicTeachersPage } = await import('@/components/classic/ClassicTeachers')
    return <ClassicTeachersPage />
  }
  const brand = await getCurrentDeploymentBrand()
  if (!brand || brand.appearance?.hiddenPages.includes('teachers')) notFound()
  return <Wi300Home brand={brand} session={await getSession()} view="teachers" />
}
