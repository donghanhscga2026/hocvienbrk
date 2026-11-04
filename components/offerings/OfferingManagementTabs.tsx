import Link from 'next/link'
import { BookOpen, Package, BriefcaseBusiness } from 'lucide-react'
import { groupInfo, type ProductGroup } from '@/lib/offerings/shared'

const icons = { COURSE: BookOpen, DIGITAL: Package, SERVICE: BriefcaseBusiness }
export default function OfferingManagementTabs({ active }: { active: ProductGroup }) {
  return <nav aria-label="Nhóm quản lý" className="grid grid-cols-3 gap-1 rounded-2xl border border-brk-outline bg-white p-1.5 shadow-sm">
    {(['COURSE', 'DIGITAL', 'SERVICE'] as const).map(group => {
      const Icon = icons[group]
      return <Link key={group} href={groupInfo[group].manager} aria-current={active === group ? 'page' : undefined} className={`flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-xl px-2 py-2 text-center text-sm font-semibold transition-colors sm:text-base ${active === group ? 'bg-brk-primary text-white' : 'text-brk-muted hover:bg-brk-background'}`}><Icon className="hidden h-5 w-5 shrink-0 sm:block" aria-hidden="true" /><span>{groupInfo[group].label}</span></Link>
    })}
  </nav>
}
