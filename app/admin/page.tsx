'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { CreditCard, Users, BookOpen, Map, FileText, Gem, Mail, ArrowLeft, Youtube, DollarSign, Lock, Settings } from 'lucide-react'

const tools = [
  { label: 'Affiliate', href: '/admin/affiliate', icon: DollarSign, color: 'bg-emerald-500', minRole: 'user' as const },
  { label: 'Nhân Mạch', href: '/admin/genealogy', icon: Users, color: 'bg-indigo-500', minRole: 'user' as const },
  { label: 'Cài Đặt', href: '/admin/settings', icon: Settings, color: 'bg-gray-500', minRole: 'user' as const },
  { label: 'Thanh Toán', href: '/admin/payments', icon: CreditCard, color: 'bg-green-500', minRole: 'teacher' as const },
  { label: 'Thành Viên', href: '/admin/students', icon: Users, color: 'bg-cyan-500', minRole: 'teacher' as const },
  { label: 'Khóa Học', href: '/admin/courses', icon: BookOpen, color: 'bg-orange-500', minRole: 'teacher' as const },
  { label: 'Bảng Tin', href: '/admin/posts', icon: FileText, color: 'bg-blue-500', minRole: 'admin' as const },
  { label: 'Số Đẹp', href: '/admin/reserved-ids', icon: Gem, color: 'bg-purple-500', minRole: 'admin' as const },
  { label: 'YouTube', href: '/admin/youtube-tools', icon: Youtube, color: 'bg-red-600', minRole: 'admin' as const },
  { label: 'Lộ Trình', href: '/admin/roadmap', icon: Map, color: 'bg-teal-500', minRole: 'admin' as const },
  { label: 'Email MKT', href: '/admin/campaigns', icon: Mail, color: 'bg-red-500', minRole: 'admin' as const },
]

function canAccessTool(userRole: string, minRole: string): boolean {
  if (!userRole || userRole === 'guest') return false
  if (minRole === 'user') return true
  if (minRole === 'teacher' && (userRole === 'TEACHER' || userRole === 'ADMIN')) return true
  if (minRole === 'admin' && userRole === 'ADMIN') return true
  return false
}

export default function AdminPage() {
  const { data: session } = useSession()
  const userRole = session?.user?.role as string || 'guest'
  const isAdmin = userRole === 'ADMIN'
  const isTeacher = userRole === 'TEACHER' || userRole === 'ADMIN'
  const isLoggedIn = !!session?.user

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-black text-white shadow-lg">
        <div className="flex items-center justify-between p-4 max-w-lg mx-auto">
          <Link href="/" className="flex items-center gap-2 text-yellow-400 hover:text-yellow-300 transition-colors">
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm font-black tracking-wider">VỀ TRANG CHỦ</span>
          </Link>
          <h1 className="text-lg font-black tracking-widest text-yellow-400">
            {isAdmin ? 'ADMIN BRK' : isTeacher ? 'TEACHER PANEL' : 'CÔNG CỤ'}
          </h1>
        </div>
      </header>

      {/* Info Banner */}
      <div className="max-w-lg mx-auto p-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4">
          <p className="text-xs text-yellow-800 text-center">
            {isAdmin ? 'Chào Admin! Bạn có quyền truy cập tất cả công cụ.' :
             isTeacher ? 'Chào Giáo viên! Một số công cụ bị giới hạn.' :
             isLoggedIn ? 'Chào Học viên! Bạn có quyền truy cập một số công cụ.' :
             'Vui lòng đăng nhập để sử dụng công cụ.'}
          </p>
        </div>
      </div>

      {/* Grid Menu */}
      <div className="max-w-lg mx-auto px-4 pb-8">
        <div className="grid grid-cols-3 gap-3">
          {tools.map((tool) => {
            const Icon = tool.icon
            const hasAccess = canAccessTool(userRole, tool.minRole)
            return (
              <div
                key={tool.href}
                className="relative"
              >
                {hasAccess ? (
                  <Link
                    href={tool.href}
                    className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-orange-200 transition-all active:scale-95"
                  >
                    <div className={`p-3 rounded-xl ${tool.color} text-white mb-2`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="text-xs font-bold text-gray-700 text-center leading-tight">{tool.label}</span>
                  </Link>
                ) : (
                  <div className="flex flex-col items-center justify-center p-4 bg-gray-100 rounded-2xl border border-gray-200 opacity-40 cursor-not-allowed">
                    <div className={`p-3 rounded-xl ${tool.color} text-white mb-2`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="text-xs font-bold text-gray-500 text-center leading-tight">{tool.label}</span>
                    <div className="absolute top-2 right-2">
                      <Lock className="h-3 w-3 text-gray-400" />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
        
        {/* Legend */}
        <div className="mt-6 flex flex-wrap justify-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-emerald-500"></span> Có quyền
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-gray-300"></span> Không có quyền
          </span>
        </div>
      </div>
    </div>
  )
}
