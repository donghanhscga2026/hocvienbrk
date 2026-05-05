'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { LucideIcon } from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon?: LucideIcon | any
}

interface AdminSubNavProps {
  title?: string
  items: NavItem[]
}

export function AdminSubNav({ title, items }: AdminSubNavProps) {
  const pathname = usePathname()
  
  return (
    <div className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="flex items-center gap-2 p-3 overflow-x-auto">
        {items.map((item) => {
          const Icon = item.icon
          const active = pathname === item.href
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all ${
                active 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {Icon && <Icon className="h-4 w-4" />}
              {item.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
