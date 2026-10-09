import { AdminSubNav } from '@/components/admin/AdminSubNav'
import { brkSubNav } from './brk-nav'
import { getCurrentDeploymentBrand } from '@/lib/site-profile/deployment-runtime'

export default async function BrkLayout({ children }: { children: React.ReactNode }) {
  const wi300 = !!await getCurrentDeploymentBrand()
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSubNav title={wi300 ? 'Quyền lợi Wi300' : 'MFC Affiliate'} items={brkSubNav.map(item => item.href === '/tools/brk/wallet' && wi300 ? { ...item, label: 'Ví Wi' } : item)} />
      <main className="max-w-7xl mx-auto py-6 px-4">
        {children}
      </main>
    </div>
  )
}
