'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { CreditCard, Users, BookOpen, Map, FileText, Gem, Mail, ArrowLeft, Settings, Radio, Bell, Youtube } from 'lucide-react'

const menuItems = [
  { label: 'Thanh Toán', href: '/admin/payments', icon: CreditCard },
  { label: 'Bảng Tin', href: '/admin/posts', icon: FileText },
  { label: 'Số Đẹp', href: '/admin/reserved-ids', icon: Gem },
  { label: 'Thành Viên', href: '/admin/students', icon: Users },
  { label: 'Khóa Học', href: '/admin/courses', icon: BookOpen },
  { label: 'YouTube', href: '/admin/youtube-tools', icon: Youtube },
  { label: 'Cài Đặt', href: '/admin/settings', icon: Settings },
  { label: 'Lộ Trình', href: '/admin/roadmap', icon: Map },
  { label: 'Chiến Dịch Email', href: '/admin/campaigns', icon: Mail },
  { label: 'Nhân Mạch', href: '/admin/genealogy', icon: Users },
  { label: 'Trang Chủ', href: '/', icon: ArrowLeft },
]

export default function AdminNav() {
  const pathname = usePathname()
  
  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin'
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <div className="grid grid-cols-3 gap-3 p-4">
      {menuItems.map((item) => {
        const Icon = item.icon
        const active = isActive(item.href)
        
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center p-4 rounded-2xl transition-all ${
              active 
                ? 'bg-orange-500 text-white shadow-lg' 
                : 'bg-white border border-gray-100 text-gray-700 hover:border-orange-200 hover:shadow-md'
            }`}
          >
            <Icon className={`h-6 w-6 mb-2 ${active ? 'text-white' : 'text-orange-500'}`} />
            <span className="text-xs font-bold text-center leading-tight">{item.label}</span>
          </Link>
        )
      })}
    </div>
  )
}

export function AdminSubNav({ title, items }: { title: string; items: { label: string; href: string; icon: any }[] }) {
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

export const campaignSubNav = [
  { label: 'Danh Sách', href: '/admin/campaigns', icon: Mail },
  { label: 'Kết Nối Vệ Tinh', href: '/admin/email-senders', icon: Radio },
  { label: 'Cài Đặt', href: '/admin/email-settings', icon: Bell },
]
