import { Suspense } from 'react'
import { defaultAppearance } from '@/lib/wi300/appearance'
import type { DeploymentBrand } from '@/lib/site-profile/deployment-brand'
import WiCourseHero, { WiCourseCatalogSkeleton } from '@/components/wi300/WiCourseHero'
import { notFound } from 'next/navigation'
import { pageMetadata } from '@/lib/wi300/website-config'
import { getCurrentDeploymentBrand } from '@/lib/site-profile/deployment-runtime'
import { getPagePresentation } from '@/lib/site-profile/presentation'
import { getSession } from '@/lib/get-session'
import Wi300Home from '@/components/wi300/Wi300Home'

export async function generateMetadata() {
  const brand = await getCurrentDeploymentBrand()
  return brand ? pageMetadata(brand, 'courses') : { title: 'Khám phá khóa học' }
}
export default async function Page() {
  if (await getPagePresentation('courses') === 'classic') {
    const { default: ClassicCourseCatalog } = await import('@/components/classic/ClassicCourseCatalog')
    return <ClassicCourseCatalog />
  }
  const brand = await getCurrentDeploymentBrand()
  if (!brand || brand.appearance?.hiddenPages.includes('courses')) notFound()
  const settings = (brand.appearance || defaultAppearance).courses
  // Hero không đợi session, danh mục hay dữ liệu đăng ký cá nhân.
  return <><WiCourseHero settings={settings} /><Suspense fallback={<WiCourseCatalogSkeleton settings={settings} />}><Catalog brand={brand} /></Suspense></>
}

async function Catalog({ brand }: { brand: DeploymentBrand }) {
  return <Wi300Home brand={brand} session={await getSession()} view="catalog" catalogHeroRendered />
}
