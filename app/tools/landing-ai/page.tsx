import { notFound } from 'next/navigation'
import { getCurrentDeploymentBrand } from '@/lib/site-profile/deployment-runtime'
import WiLandingAI from '@/components/wi300/WiLandingAI'

export const metadata = { title: 'Wi Landing AI — Bản thử', robots: { index: false, follow: false } }
export default async function Page() {
  const brand = await getCurrentDeploymentBrand()
  // Cho xem bản thử trên Vercel Preview kể cả project chưa bật thương hiệu WI300.
  // Bản thử không có dữ liệu riêng, dịch vụ AI hoặc thao tác xuất bản.
  if (!brand && process.env.VERCEL_ENV !== 'preview') notFound()
  return <>{!brand && <h1 className="mx-auto max-w-7xl px-6 pt-6 text-2xl font-bold">Wi Landing AI — Bản thử</h1>}<WiLandingAI /></>
}
