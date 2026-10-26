import { redirect } from 'next/navigation'
import { getCurrentDeploymentBrand } from '@/lib/site-profile/deployment-runtime'
import { getSession } from '@/lib/get-session'
import Wi300Home from '@/components/wi300/Wi300Home'

export const metadata = { title: 'Không gian của tôi', robots: { index: false, follow: false } }
export default async function Page() {
  const session = await getSession()
  if (session?.user?.id == null) redirect('/login?callbackUrl=%2Fmy-space')
  const brand = await getCurrentDeploymentBrand()
  // Ngoài bản triển khai wi300, khu cá nhân gốc là trang chủ (hiển thị khóa học
  // của tôi) — không trả 404 chỉ vì project không bật giao diện wi300.
  if (!brand) redirect('/')
  return <Wi300Home brand={brand} session={session} view="space" />
}
