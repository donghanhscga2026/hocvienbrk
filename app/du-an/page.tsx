import { notFound } from 'next/navigation'
import { pageMetadata } from '@/lib/wi300/website-config'
import { getPagePresentation, getPresentationBrand } from '@/lib/site-profile/presentation'
import { getPublicProjects } from '@/lib/wi300/public-projects'
import WiProjectDirectory from '@/components/wi300/WiProjectDirectory'

export async function generateMetadata() {
  const brand = await getPresentationBrand('projects')
  return brand ? pageMetadata(brand, 'projects') : { title: 'Các dự án Wi' }
}
export default async function Page() {
  if (await getPagePresentation('projects') === 'classic') {
    const { ClassicProjectsPage } = await import('@/components/classic/ClassicProjects')
    return <ClassicProjectsPage />
  }
  const brand = await getPresentationBrand('projects')
  if (!brand || brand.appearance?.hiddenPages.includes('projects')) notFound()
  const projects = await getPublicProjects()
  return <WiProjectDirectory settings={brand.appearance?.projects} projects={projects} />
}
