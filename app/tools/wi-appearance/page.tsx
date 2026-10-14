import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import { getCurrentDeploymentBrand } from '@/lib/site-profile/deployment-runtime'
import { appearanceAdmin, readAppearance } from '@/lib/wi300/appearance-service'
import WiAppearanceEditor from '@/components/wi300/WiAppearanceEditor'
import Wi300Home from '@/components/wi300/Wi300Home'
import type { Wi300HomeClientProps } from '@/components/wi300/Wi300HomeClient'
import { getDeploymentBrand } from '@/lib/site-profile/deployment-brand'

export const metadata = { title: 'Cấu hình các trang', robots: { index: false, follow: false } }
export default async function Page() {
  const brand = await getCurrentDeploymentBrand()
  if (!brand) notFound()
  const session = await auth()
  if (!session?.user) redirect('/login?callbackUrl=%2Ftools%2Fwi-appearance')
  try { await appearanceAdmin(prisma, Number(session.user.id)) } catch { notFound() }
  const initial = await readAppearance(prisma)
  // Chỉ tải danh mục công khai cho preview, không gửi tiến độ/thanh toán của admin.
  const preview = await Wi300Home({ brand, session: null, view: 'home' })
  const previewData = { ...preview.props, brand: getDeploymentBrand() || brand } as Wi300HomeClientProps
  return <WiAppearanceEditor initial={initial} previewData={previewData} previewOnly={process.env.VERCEL_ENV === 'preview'} mode="pages" initialTab="home" />
}
