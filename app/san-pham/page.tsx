import WiOfferingCatalog from '@/components/wi300/WiOfferingCatalog'
import { getCurrentDeploymentBrand } from '@/lib/site-profile/deployment-runtime'
import { getPagePresentation } from '@/lib/site-profile/presentation'
import { systemPageMetadata } from '@/lib/wi300/managed-page-runtime'

export async function generateMetadata() { const brand = await getCurrentDeploymentBrand(); return brand ? systemPageMetadata(brand, 'products') : { title: 'Sản phẩm số' } }
export default async function Page() {
  if (await getPagePresentation('products') === 'classic') {
    const { default: ClassicOfferingCatalog } = await import('@/components/classic/ClassicOfferings')
    return <ClassicOfferingCatalog kind="PRODUCT" />
  }
  if (!(await getCurrentDeploymentBrand())) {
    // Site classic bật chọn-dùng bản wi300: bọc khung của chính site.
    const { default: ClassicFrame } = await import('@/components/classic/ClassicFrame')
    return <ClassicFrame title="Sản phẩm số"><WiOfferingCatalog kind="PRODUCT" /></ClassicFrame>
  }
  return <WiOfferingCatalog kind="PRODUCT" />
}
