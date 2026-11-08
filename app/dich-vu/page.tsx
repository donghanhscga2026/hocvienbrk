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
  if (!(await getCurrentDeploymentBrand())) {
    // Site classic bật chọn-dùng bản wi300: bọc khung của chính site.
    const { default: ClassicFrame } = await import('@/components/classic/ClassicFrame')
    return <ClassicFrame title="Dịch vụ"><WiOfferingCatalog kind="SERVICE" /></ClassicFrame>
  }
  return <WiOfferingCatalog kind="SERVICE" />
}
