import { notFound } from 'next/navigation'
import { getCurrentDeploymentBrand } from '@/lib/site-profile/deployment-runtime'
import { getPagePresentation } from '@/lib/site-profile/presentation'
import { ExternalAppsCatalog } from '@/components/wi300/Wi300ExternalApps'

export const metadata = { title: 'Ứng dụng WI300', robots: { index: false, follow: false } }
export default async function Page() {
  // Danh mục ứng dụng ngoài dùng chung dữ liệu cho cả hai giao diện:
  // bản wi300 giữ nguyên như cũ; bản classic bọc thêm khung công cụ classic.
  if (await getPagePresentation('external-apps') === 'classic') {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <h1 className="mb-5 text-2xl font-black text-brk-on-surface">Ứng dụng ngoài</h1>
        <ExternalAppsCatalog />
      </main>
    )
  }
  if (!await getCurrentDeploymentBrand()) notFound()
  return <ExternalAppsCatalog />
}
