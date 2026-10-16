import { Suspense } from 'react'
import { WebsiteScopeProvider } from '@/components/website/WebsiteScope'
export default function Layout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<p className="p-6">Đang tải website…</p>}><WebsiteScopeProvider>{children}</WebsiteScopeProvider></Suspense>
}
