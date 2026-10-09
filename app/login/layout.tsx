import type { Metadata } from 'next'
import { getCurrentDeploymentBrand } from '@/lib/site-profile/deployment-runtime'

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getCurrentDeploymentBrand()
  return brand ? { title: 'Đăng nhập' } : {}
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
