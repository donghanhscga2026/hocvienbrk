import { AdminSubNav } from '@/components/admin/AdminSubNav'
import { brkSubNav } from './brk-nav'

export default function BrkLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSubNav title="BRK Affiliate" items={brkSubNav} />
      <main className="max-w-7xl mx-auto py-6 px-4">
        {children}
      </main>
    </div>
  )
}
