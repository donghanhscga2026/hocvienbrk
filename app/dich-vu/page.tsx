import WiOfferingCatalog from '@/components/wi300/WiOfferingCatalog'
import { getCurrentDeploymentBrand } from '@/lib/site-profile/deployment-runtime'
import { getPagePresentation } from '@/lib/site-profile/presentation'
import { systemPageMetadata } from '@/lib/wi300/managed-page-runtime'

export async function generateMetadata() { const brand = await getCurrentDeploymentBrand(); return brand ? systemPageMetadata(brand, 'services') : { title: 'Dịch vụ' } }
export default async function Page() {
  if (await getPagePresentation('services') === 'classic') {
    const { default: ClassicOfferingCatalog } = await import('@/components/classic/ClassicOfferings')
    return <ClassicOfferingCatalog kind="SERVICE" />
  }
  return <WiOfferingCatalog kind="SERVICE" />
}
