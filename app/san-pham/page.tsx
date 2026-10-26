import WiOfferingCatalog from '@/components/wi300/WiOfferingCatalog'
import { getCurrentDeploymentBrand } from '@/lib/site-profile/deployment-runtime'
import { getPagePresentation } from '@/lib/site-profile/presentation'
import { systemPageMetadata } from '@/lib/wi300/managed-page-runtime'

export async function generateMetadata() { const brand = await getCurrentDeploymentBrand(); return brand ? systemPageMetadata(brand, 'products') : { title: 'Sản phẩm' } }
export default async function Page() {
  if (await getPagePresentation('products') === 'classic') {
    const { default: ClassicOfferingCatalog } = await import('@/components/classic/ClassicOfferings')
    return <ClassicOfferingCatalog kind="PRODUCT" />
  }
  return <WiOfferingCatalog kind="PRODUCT" />
}
