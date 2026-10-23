import { notFound } from 'next/navigation'
import { pageMetadata } from '@/lib/wi300/website-config'
import prisma from '@/lib/prisma'
import { getCurrentDeploymentBrand } from '@/lib/site-profile/deployment-runtime'
import { readPublicProjects } from '@/lib/wi300/project-service'
import WiProjectDirectory from '@/components/wi300/WiProjectDirectory'

export async function generateMetadata() {
  const brand = await getCurrentDeploymentBrand()
  return brand ? pageMetadata(brand, 'projects') : { title: 'Các dự án Wi' }
}
export default async function Page() {
  const brand = await getCurrentDeploymentBrand()
  if (!brand || brand.appearance?.hiddenPages.includes('projects')) notFound()
  const projects = await readPublicProjects(prisma)
  return <WiProjectDirectory settings={brand.appearance?.projects} projects={projects} />
}
