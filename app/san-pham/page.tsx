import WiOfferingCatalog from '@/components/wi300/WiOfferingCatalog'
import { getCurrentDeploymentBrand } from '@/lib/site-profile/deployment-runtime'
import { systemPageMetadata } from '@/lib/wi300/managed-page-runtime'

export async function generateMetadata() { const brand = await getCurrentDeploymentBrand(); return brand ? systemPageMetadata(brand, 'products') : { title: 'Sản phẩm' } }
export default function Page() {
  return <WiOfferingCatalog kind="PRODUCT" />
}
