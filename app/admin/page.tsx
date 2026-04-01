'use client'

import Link from 'next/link'
import { CreditCard, Users, BookOpen, Map, FileText, Gem, Mail, Settings, ArrowLeft, Youtube, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'

const menuItems = [
  { label: 'Affiliate', href: '/admin/affiliate', icon: DollarSign, color: 'bg-emerald-500' },
  { label: 'Thanh Toán', href: '/admin/payments', icon: CreditCard, color: 'bg-green-500' },
  { label: 'Bảng Tin', href: '/admin/posts', icon: FileText, color: 'bg-blue-500' },
  { label: 'Số Đẹp', href: '/admin/reserved-ids', icon: Gem, color: 'bg-purple-500' },
  { label: 'Thành Viên', href: '/admin/students', icon: Users, color: 'bg-cyan-500' },
  { label: 'Khóa Học', href: '/admin/courses', icon: BookOpen, color: 'bg-orange-500' },
  { label: 'YouTube', href: '/admin/youtube-tools', icon: Youtube, color: 'bg-red-600' },
  { label: 'Cài Đặt', href: '/admin/settings', icon: Settings, color: 'bg-gray-500' },
  { label: 'Lộ Trình', href: '/admin/roadmap', icon: Map, color: 'bg-teal-500' },
  { label: 'Email MKT', href: '/admin/campaigns', icon: Mail, color: 'bg-red-500' },
  { label: 'Nhân Mạch', href: '/admin/genealogy', icon: Users, color: 'bg-indigo-500' },
  { label: 'Trang Chủ', href: '/', icon: ArrowLeft, color: 'bg-yellow-500' },
]

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-black text-white shadow-lg">
        <div className="flex items-center justify-between p-4 max-w-lg mx-auto">
          <h1 className="text-lg font-black tracking-widest text-yellow-400">ADMIN BRK</h1>
        </div>
      </header>

      {/* Grid Menu */}
      <div className="max-w-lg mx-auto p-4">
        <div className="grid grid-cols-3 gap-3">
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-orange-200 transition-all active:scale-95"
              >
                <div className={`p-3 rounded-xl ${item.color} text-white mb-2`}>
                  <Icon className="h-6 w-6" />
                </div>
                <span className="text-xs font-bold text-gray-700 text-center leading-tight">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
