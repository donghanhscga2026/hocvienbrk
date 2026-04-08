'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useState, useEffect, Suspense } from 'react'
import { CreditCard, Users, BookOpen, Map, FileText, Gem, Mail, ArrowLeft, Youtube, DollarSign, Lock, Settings, Layout, Loader2, Share2, Copy, X } from 'lucide-react'
import { Role } from '@prisma/client'
import ToolHeader from '@/components/tools/ToolHeader'
import { AlertBanner, AlertConfig } from '@/components/tools/Alert'

function AlertBannerWrapper({ alert, onClose }: { alert: AlertConfig | null, onClose: () => void }) {
  return (
    <Suspense fallback={null}>
      <AlertBanner alert={alert} onClose={onClose} />
    </Suspense>
  )
}

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

interface AccessCheckResult {
  hasAccess: boolean
  reason: 'login' | 'role' | 'admin' | null
  requiredRole?: string
}

function checkToolAccess(userRole: string, toolRoles: Role[]): AccessCheckResult {
  if (!toolRoles || toolRoles.length === 0) {
    return { hasAccess: true, reason: null }
  }
  
  if (!userRole || userRole === 'guest') {
    return { hasAccess: false, reason: 'login' }
  }
  
  if (toolRoles.includes('ADMIN' as Role)) {
    if (userRole !== 'ADMIN') {
      return { hasAccess: false, reason: 'admin' }
    }
    return { hasAccess: true, reason: null }
  }
  
  if (toolRoles.includes('TEACHER' as Role)) {
    if (userRole !== 'TEACHER' && userRole !== 'ADMIN') {
      return { hasAccess: false, reason: 'role', requiredRole: 'TEACHER' }
    }
    return { hasAccess: true, reason: null }
  }
  
  if (toolRoles.includes('AFFILIATE' as Role)) {
    if (!['STUDENT', 'TEACHER', 'ADMIN', 'AFFILIATE'].includes(userRole)) {
      return { hasAccess: false, reason: 'role', requiredRole: 'Học viên' }
    }
    return { hasAccess: true, reason: null }
  }
  
  if (toolRoles.includes('STUDENT' as Role)) {
    return { hasAccess: true, reason: null }
  }
  
  return { hasAccess: false, reason: 'role', requiredRole: toolRoles[0] }
}

function ToolsGrid({ tools, userRole, onToolClick, onShare }: { tools: Tool[], userRole: string, onToolClick: (tool: Tool) => void, onShare: (tool: Tool) => void }) {
  const sortedTools = [...tools].sort((a, b) => a.order - b.order)
  
  return (
    <div className="grid grid-cols-3 gap-3">
      {sortedTools.map((tool) => {
        const Icon = getIconComponent(tool.icon)
        const colorClass = getColorClass(tool.description?.split('|')[0]?.trim() || null)
        const access = checkToolAccess(userRole, tool.roles)
        const isPublic = access.hasAccess && (!tool.roles || tool.roles.length === 0)
        
        return (
          <div key={tool.id} className="relative h-24">
            <div
              onClick={() => onToolClick(tool)}
              className={`w-full flex flex-col items-center justify-between h-full p-3 rounded-2xl border transition-all active:scale-95 cursor-pointer ${
                access.hasAccess 
                  ? 'bg-white border-gray-100 shadow-sm hover:shadow-md hover:border-orange-200' 
                  : 'bg-gray-50 border-gray-100 hover:bg-yellow-50 hover:border-yellow-300'
              }`}
            >
              <div className={`p-2 rounded-lg ${colorClass} text-white ${!access.hasAccess ? 'opacity-50' : ''}`}>
                <Icon className="h-5 w-5" />
              </div>
              <span className={`text-[10px] sm:text-xs font-bold text-center leading-tight line-clamp-2 ${access.hasAccess ? 'text-gray-700' : 'text-gray-400'}`}>
                {tool.name}
              </span>
            </div>
            {!access.hasAccess && (
              <div className="absolute top-2 right-2 pointer-events-none">
                <Lock className="h-3 w-3 text-gray-400" />
              </div>
            )}
            {isPublic && (
              <button
                onClick={(e) => { e.stopPropagation(); onShare(tool) }}
                className="absolute top-2 right-2 p-1 rounded-full bg-orange-100 hover:bg-orange-200 text-orange-600 transition-colors"
              >
                <Share2 className="h-3 w-3" />
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function ToolsPage() {
  const { data: session, update: updateSession } = useSession()
  const userRole = session?.user?.role as string || 'guest'
  const isAdmin = userRole === 'ADMIN'
  const isTeacher = userRole === 'TEACHER' || userRole === 'ADMIN'
  const isLoggedIn = !!session?.user
  const userId = session?.user?.id as string | null
  
  const [tools, setTools] = useState<Tool[]>([])
  const [loading, setLoading] = useState(true)
  const [alert, setAlert] = useState<AlertConfig | null>(null)
  const [shareModal, setShareModal] = useState<{ tool: Tool; url: string } | null>(null)

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

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const justLoggedIn = searchParams.get('logged_in')
    if (justLoggedIn === 'true') {
      window.history.replaceState({}, '', '/tools')
    }
  }, [])

  const handleToolClick = (tool: Tool) => {
    const access = checkToolAccess(userRole, tool.roles)
    
    if (access.hasAccess) {
      window.location.href = tool.url
      return
    }

    let title = ''
    let message = ''
    let actionLabel = ''
    let actionUrl = ''

    switch (access.reason) {
      case 'login':
        title = '🔐 Cần đăng nhập'
        message = `Bạn cần đăng nhập để sử dụng "${tool.name}".`
        actionLabel = 'Đăng nhập ngay'
        actionUrl = '/login?redirect=/tools'
        break
      case 'admin':
        title = '⚠️ Chỉ Admin được phép'
        message = `Chỉ Admin mới có thể sử dụng "${tool.name}".`
        actionLabel = 'Về trang chủ'
        actionUrl = '/'
        break
      case 'role':
        title = '👤 Thiếu quyền truy cập'
        message = `Bạn cần quyền "${access.requiredRole}" để sử dụng "${tool.name}".`
        actionLabel = 'Liên hệ Admin'
        actionUrl = '#'
        break
    }

    setAlert({
      type: 'access_denied',
      title,
      message,
      actionLabel,
      actionUrl,
      duration: 10000,
    })
  }

  const closeAlert = () => {
    setAlert(null)
  }

  const handleShare = (tool: Tool) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    let shareUrl = baseUrl + tool.url
    
    if (userId) {
      const separator = tool.url.includes('?') ? '&' : '?'
      shareUrl = `${baseUrl}${tool.url}${separator}ref=${userId}`
    }
    
    setShareModal({ tool, url: shareUrl })
  }

  const copyShareLink = async () => {
    if (shareModal) {
      await navigator.clipboard.writeText(shareModal.url)
      
      if (userId) {
        try {
          const userAgent = typeof window !== 'undefined' ? navigator.userAgent : ''
          let deviceType = 'desktop'
          if (/mobile/i.test(userAgent)) deviceType = 'mobile'
          else if (/tablet|ipad/i.test(userAgent)) deviceType = 'tablet'
          
          await fetch('/api/track/click?url=' + encodeURIComponent(shareModal.url) + '&code=' + userId, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ref: userId,
            })
          })
        } catch (err) {
          console.error('Failed to track click:', err)
        }
      }
      
      setAlert({
        type: 'success',
        title: '✅ Đã copy!',
        message: 'Link đã được copy vào clipboard.',
        duration: 2000,
      })
      setShareModal(null)
    }
  }

  const closeShareModal = () => {
    setShareModal(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ToolHeader />

      <AlertBannerWrapper alert={alert} onClose={closeAlert} />

      {/* Info Banner */}
      <div className="max-w-lg mx-auto px-4 pt-2">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-3">
          <p className="text-xs text-yellow-800 text-center">
            {isAdmin ? 'Chào Admin! Bạn có quyền truy cập tất cả công cụ.' :
             isTeacher ? 'Chào Giáo viên! Một số công cụ bị giới hạn.' :
             isLoggedIn ? 'Chào! Bạn có thể sử dụng các công cụ được phép.' :
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
          <ToolsGrid tools={tools} userRole={userRole} onToolClick={handleToolClick} onShare={handleShare} />
        )}
        
        {/* Legend */}
        <div className="mt-6 flex flex-wrap justify-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-emerald-500"></span> Có quyền
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-gray-300"></span> Không có quyền
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-orange-500"></span> Chia sẻ
          </span>
        </div>
      </div>

      {/* Share Modal */}
      {shareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">🔗 Chia sẻ {shareModal.tool.name}</h3>
              <button onClick={closeShareModal} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              {userId 
                ? 'Link này sẽ theo dõi lượt giới thiệu của bạn.'
                : 'Đăng nhập để tạo link giới thiệu.'}
            </p>
            <div className="flex gap-2">
              <input 
                type="text" 
                readOnly 
                value={shareModal.url} 
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50"
              />
              <button 
                onClick={copyShareLink}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 flex items-center gap-1"
              >
                <Copy className="h-4 w-4" />
                Copy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}