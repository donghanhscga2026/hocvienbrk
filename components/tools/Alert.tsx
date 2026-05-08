'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, AlertCircle, Lock, UserX, Shield, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

export type AlertType = 'info' | 'warning' | 'error' | 'success' | 'access_denied'

export interface AlertConfig {
  type: AlertType
  title: string
  message: string
  actionLabel?: string
  actionUrl?: string
  duration?: number
}

interface AlertProps {
  alert: AlertConfig | null
  onClose: () => void
}

const alertStyles = {
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  success: 'bg-green-50 border-green-200 text-green-800',
  access_denied: 'bg-orange-50 border-orange-200 text-orange-800',
}

const alertIcons = {
  info: AlertCircle,
  warning: AlertCircle,
  error: AlertCircle,
  success: AlertCircle,
  access_denied: Lock,
}

export function AlertBanner({ alert, onClose }: AlertProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [countdown, setCountdown] = useState(0)
  const [isRedirecting, setIsRedirecting] = useState(false)

  const duration = alert?.duration || 10000
  const progressDuration = Math.min(duration, 15000)

  useEffect(() => {
    if (!alert) return

    setCountdown(progressDuration)
    const startTime = Date.now()
    const endTime = startTime + progressDuration

    const interval = setInterval(() => {
      const remaining = endTime - Date.now()
      if (remaining <= 0) {
        clearInterval(interval)
        setCountdown(0)
        onClose()
      } else {
        setCountdown(remaining)
      }
    }, 100)

    return () => clearInterval(interval)
  }, [alert, progressDuration, onClose])

  if (!alert) return null

  const Icon = alertIcons[alert.type]
  const style = alertStyles[alert.type]

  const handleAction = async () => {
    if (!alert.actionUrl) return

    if (alert.actionUrl.startsWith('/login')) {
      const currentPath = '/tools'
      const redirectUrl = `${alert.actionUrl}?redirect=${encodeURIComponent(currentPath)}`
      router.push(redirectUrl)
    } else {
      router.push(alert.actionUrl)
    }
  }

  const progressPercent = (countdown / progressDuration) * 100

  return (
    <div className="fixed top-20 left-4 right-4 z-50 md:left-1/2 md:-translate-x-1/2 md:max-w-md">
      <div className={`relative border rounded-xl shadow-lg overflow-hidden ${style}`}>
        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-black/5 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-4">
          <div className="flex items-start gap-3">
            <Icon className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm">{alert.title}</h3>
              <p className="text-xs mt-1 opacity-90">{alert.message}</p>
              
              {alert.actionLabel && (
                <button
                  onClick={handleAction}
                  disabled={isRedirecting}
                  className="mt-3 text-xs font-bold px-3 py-1.5 bg-black/10 hover:bg-black/15 rounded-lg transition-colors inline-flex items-center gap-1"
                >
                  {isRedirecting ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Đang chuyển...
                    </>
                  ) : (
                    alert.actionLabel
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="h-1 bg-black/10">
          <div 
            className="h-full bg-current transition-all duration-100 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  )
}

export function useAlert() {
  const [alert, setAlert] = useState<AlertConfig | null>(null)

  const showAlert = (config: AlertConfig) => {
    setAlert(config)
  }

  const showAccessDenied = (toolName: string, reason: 'login' | 'role' | 'admin', requiredRole?: string) => {
    let title = '🔒 Không thể truy cập'
    let message = ''
    let actionLabel = ''
    let actionUrl = ''

    switch (reason) {
      case 'login':
        title = '🔐 Cần đăng nhập'
        message = `Bạn cần đăng nhập để sử dụng "${toolName}".`
        actionLabel = 'Đăng nhập ngay'
        actionUrl = '/login'
        break
      case 'role':
        title = '👤 Thiếu quyền truy cập'
        message = `Bạn cần quyền "${requiredRole}" để sử dụng "${toolName}".`
        actionLabel = 'Liên hệ Admin'
        actionUrl = '#'
        break
      case 'admin':
        title = '⚠️ Chỉ Admin được phép'
        message = `Chỉ Admin mới có thể sử dụng "${toolName}".`
        actionLabel = 'Về trang chủ'
        actionUrl = '/'
        break
    }

    setAlert({
      type: 'access_denied',
      title,
      message,
      actionLabel,
      actionUrl,
    })
  }

  const closeAlert = () => {
    setAlert(null)
  }

  return { alert, showAlert, showAccessDenied, closeAlert }
}