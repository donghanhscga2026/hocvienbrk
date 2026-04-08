'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useState, useEffect, Suspense } from 'react'
import { CreditCard, Users, BookOpen, Map, FileText, Gem, Mail, ArrowLeft, Youtube, DollarSign, Lock, Settings, Layout, X, Info, Loader2 } from 'lucide-react'
import { Role } from '@prisma/client'
import ToolHeader from '@/components/tools/ToolHeader'

interface Tool {
  id: number
  slug: string
  name: string
  description: string | null
  icon: string | null
  url: string
  roles: Role[]
  order: number
  isActive: boolean
}

const iconMap: Record<string, any> = {
  Youtube,
  DollarSign,
  Settings,
  Users,
  CreditCard,
  BookOpen,
  FileText,
  Gem,
  Map,
  Mail,
  Layout,
}

const colorMap: Record<string, string> = {
  bgRed600: 'bg-red-600',
  bgRed700: 'bg-red-700',
  bgGray500: 'bg-gray-500',
  bgEmerald500: 'bg-emerald-500',
  bgIndigo500: 'bg-indigo-500',
  bgGreen500: 'bg-green-500',
  bgCyan500: 'bg-cyan-500',
  bgOrange500: 'bg-orange-500',
  bgBlue500: 'bg-blue-500',
  bgPurple500: 'bg-purple-500',
  bgTeal500: 'bg-teal-500',
  bgPink500: 'bg-pink-500',
  bgRed400: 'bg-red-400',
}

function getIconComponent(iconName: string | null) {
  if (!iconName) return Youtube
  return iconMap[iconName] || Youtube
}

function getColorClass(colorName: string | null) {
  if (!colorName) return 'bg-red-600'
  return colorMap[colorName] || 'bg-red-600'
}

function canAccessTool(userRole: string, toolRoles: Role[]): boolean {
  if (!toolRoles || toolRoles.length === 0) return true
  if (!userRole || userRole === 'guest') return false
  if (toolRoles.includes('STUDENT' as Role)) return true
  if (toolRoles.includes('AFFILIATE' as Role) && (userRole === 'STUDENT' || userRole === 'TEACHER' || userRole === 'ADMIN' || userRole === 'AFFILIATE')) return true
  if (toolRoles.includes('TEACHER' as Role) && (userRole === 'TEACHER' || userRole === 'ADMIN')) return true
  if (toolRoles.includes('ADMIN' as Role) && userRole === 'ADMIN') return true
  return false
}

function ToolsGrid({ tools, userRole }: { tools: Tool[], userRole: string }) {
  const sortedTools = [...tools].sort((a, b) => a.order - b.order)
  
  return (
    <div className="grid grid-cols-3 gap-3">
      {sortedTools.map((tool) => {
        const Icon = getIconComponent(tool.icon)
        const colorClass = getColorClass(tool.description?.split('|')[0]?.trim() || null)
        const hasAccess = canAccessTool(userRole, tool.roles)
        
        return (
          <div key={tool.id} className="relative h-24">
            <Link
              href={tool.url}
              className={`flex flex-col items-center justify-between h-full p-3 rounded-2xl border transition-all active:scale-95 ${
                hasAccess 
                  ? 'bg-white border-gray-100 shadow-sm hover:shadow-md hover:border-orange-200' 
                  : 'bg-gray-50 border-gray-100 hover:bg-yellow-50 hover:border-yellow-300'
              }`}
            >
              <div className={`p-2 rounded-lg ${colorClass} text-white`}>
                <Icon className="h-5 w-5" />
              </div>
              <span className={`text-[10px] sm:text-xs font-bold text-center leading-tight line-clamp-2 ${hasAccess ? 'text-gray-700' : 'text-gray-400'}`}>{tool.name}</span>
              {!hasAccess && (
                <div className="absolute top-2 right-2">
                  <Lock className="h-3 w-3 text-gray-400" />
                </div>
              )}
            </Link>
          </div>
        )
      })}
    </div>
  )
}

export default function ToolsPage() {
  const { data: session } = useSession()
  const userRole = session?.user?.role as string || 'guest'
  const isAdmin = userRole === 'ADMIN'
  const isTeacher = userRole === 'TEACHER' || userRole === 'ADMIN'
  const isLoggedIn = !!session?.user
  
  const [showNotice, setShowNotice] = useState(false)
  const [tools, setTools] = useState<Tool[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoggedIn) {
      setShowNotice(true)
      const timer = setTimeout(() => {
        setShowNotice(false)
      }, 10000)
      return () => clearTimeout(timer)
    }
  }, [isLoggedIn])

  useEffect(() => {
    async function fetchTools() {
      try {
        const res = await fetch('/api/tools')
        const data = await res.json()
        if (data.tools) {
          setTools(data.tools.filter((t: Tool) => t.isActive))
        }
      } catch (err) {
        console.error('Failed to fetch tools:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchTools()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-brk-surface text-brk-on-surface shadow-lg sticky top-0 z-50">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-1">
            <Link href="/" className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-xs font-medium">TRANG CHỦ</span>
            </Link>
          </div>
          <h1 className="text-sm font-bold absolute right-4">
            {isAdmin ? 'ADMIN BRK' : isTeacher ? 'TEACHER' : 'CÔNG CỤ'}
          </h1>
        </div>
      </header>

      {/* Notice Banner - Hiện cho người chưa đăng nhập */}
      {showNotice && !isLoggedIn && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top fade-in">
          <div className="bg-blue-600 text-white px-6 py-4 rounded-2xl shadow-xl flex items-start gap-4 max-w-md">
            <Info className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <p className="font-bold text-sm">💡 Gợi ý: Đăng ký/đăng nhập để sử dụng nhiều tính năng hơn!</p>
                <button onClick={() => setShowNotice(false)} className="text-white/70 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-blue-100 text-xs mb-2">Bạn vẫn có thể sử dụng các tính năng công khai mà không cần đăng nhập. Thông báo sẽ tự ẩn sau 10 giây.</p>
              <div className="flex gap-2">
                <Link href="/login?redirect=/tools" className="bg-white text-blue-600 px-3 py-1 rounded-lg text-xs font-bold hover:bg-blue-50">Đăng nhập</Link>
                <Link href="/register?redirect=/tools" className="bg-blue-500 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-blue-400">Đăng ký</Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info Banner */}
      <div className="max-w-lg mx-auto px-4 pt-2">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-3">
          <p className="text-xs text-yellow-800 text-center">
            {isAdmin ? 'Chào Admin! Bạn có quyền truy cập tất cả công cụ.' :
             isTeacher ? 'Chào Giáo viên! Một số công cụ bị giới hạn.' :
             'Chào! Bạn có thể sử dụng các công cụ công khai mà không cần đăng nhập.'}
          </p>
        </div>
      </div>

      {/* Grid Menu */}
      <div className="max-w-lg mx-auto px-4 pb-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <ToolsGrid tools={tools} userRole={userRole} />
        )}
        
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
