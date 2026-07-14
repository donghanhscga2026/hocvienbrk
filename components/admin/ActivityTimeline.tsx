'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Loader2, ChevronDown, LogIn, ShieldCheck, KeyRound, Pencil, GraduationCap, CreditCard, BookOpen, Wallet, Share2, Network, Mail, UserPlus, AlertTriangle, ScrollText } from 'lucide-react'
import { getStudentActivityLogAction } from '@/app/actions/admin-actions'

interface ActivityLogItem {
  id: number
  userId: number
  action: string
  detail: string | null
  metadata: any
  createdAt: string | Date
}

interface ActivityTimelineProps {
  userId: number
  userName: string
  isOpen: boolean
  onClose: () => void
}

const ACTION_CONFIG: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  LOGIN: { icon: LogIn, color: 'text-green-600', bg: 'bg-green-100', label: 'Đăng nhập' },
  LOGIN_FAILED: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100', label: 'Đăng nhập thất bại' },
  LOGOUT: { icon: LogIn, color: 'text-gray-500', bg: 'bg-gray-100', label: 'Đăng xuất' },
  REGISTER: { icon: UserPlus, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Đăng ký' },
  VERIFY_OTP: { icon: ShieldCheck, color: 'text-green-600', bg: 'bg-green-100', label: 'Xác minh OTP' },
  PASSWORD_CHANGE: { icon: KeyRound, color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Đổi mật khẩu' },
  PASSWORD_RESET: { icon: KeyRound, color: 'text-orange-600', bg: 'bg-orange-100', label: 'Reset mật khẩu' },
  PROFILE_UPDATE: { icon: Pencil, color: 'text-gray-600', bg: 'bg-gray-100', label: 'Cập nhật HSSV' },
  ENROLL_FREE: { icon: GraduationCap, color: 'text-purple-600', bg: 'bg-purple-100', label: 'Kích hoạt MH' },
  ENROLL_PAID: { icon: GraduationCap, color: 'text-purple-600', bg: 'bg-purple-100', label: 'Thanh toán KH' },
  ENROLL_AFTER_REGISTER: { icon: GraduationCap, color: 'text-purple-600', bg: 'bg-purple-100', label: 'Kích hoạt từ ĐK' },
  BULK_ENROLL: { icon: GraduationCap, color: 'text-indigo-600', bg: 'bg-indigo-100', label: 'Bulk enroll' },
  PAYMENT_VERIFIED: { icon: CreditCard, color: 'text-green-600', bg: 'bg-green-100', label: 'Xác minh TT' },
  PAYMENT_AUTO_VERIFIED: { icon: CreditCard, color: 'text-teal-600', bg: 'bg-teal-100', label: 'Auto verify' },
  PAYMENT_REJECTED: { icon: CreditCard, color: 'text-red-600', bg: 'bg-red-100', label: 'Từ chối TT' },
  LESSON_COMPLETE: { icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Hoàn thành bài' },
  LESSON_SUBMIT: { icon: BookOpen, color: 'text-blue-500', bg: 'bg-blue-50', label: 'Nộp bài' },
  WALLET_CHANGE: { icon: Wallet, color: 'text-orange-600', bg: 'bg-orange-100', label: 'Ví biến động' },
  AFFILIATE_CLICK: { icon: Share2, color: 'text-teal-600', bg: 'bg-teal-100', label: 'Click link' },
  AFFILIATE_CONVERSION: { icon: Share2, color: 'text-teal-700', bg: 'bg-teal-100', label: 'Chuyển đổi AFF' },
  SYSTEM_JOIN: { icon: Network, color: 'text-indigo-600', bg: 'bg-indigo-100', label: 'Vào hệ thống' },
  SURVEY_COMPLETE: { icon: ScrollText, color: 'text-pink-600', bg: 'bg-pink-100', label: 'Khảo sát' },
  EMAIL_SENT: { icon: Mail, color: 'text-gray-400', bg: 'bg-gray-50', label: 'Gửi email' },
  EMAIL_FAILED: { icon: Mail, color: 'text-red-400', bg: 'bg-red-50', label: 'Email lỗi' },
}

const ACTION_FILTERS = [
  { value: '', label: 'Tất cả' },
  { value: 'LOGIN,LOGIN_FAILED', label: 'Đăng nhập' },
  { value: 'REGISTER,VERIFY_OTP', label: 'Đăng ký / XM' },
  { value: 'PASSWORD_CHANGE,PASSWORD_RESET', label: 'Mật khẩu' },
  { value: 'PROFILE_UPDATE', label: 'Hồ sơ' },
  { value: 'ENROLL_FREE,ENROLL_PAID,ENROLL_AFTER_REGISTER,BULK_ENROLL', label: 'Kích hoạt' },
  { value: 'PAYMENT_VERIFIED,PAYMENT_AUTO_VERIFIED', label: 'Thanh toán' },
  { value: 'LESSON_COMPLETE,LESSON_SUBMIT', label: 'Bài học' },
  { value: 'WALLET_CHANGE', label: 'Ví' },
  { value: 'AFFILIATE_CLICK,AFFILIATE_CONVERSION', label: 'Affiliate' },
  { value: 'SYSTEM_JOIN', label: 'Hệ thống' },
]

function formatTime(dateStr: string | Date) {
  const d = new Date(dateStr)
  return d.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function formatDate(dateStr: string | Date) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric' })
}

function groupByDate(logs: ActivityLogItem[]) {
  const groups: { date: string; items: ActivityLogItem[] }[] = []
  let current = ''
  for (const log of logs) {
    const dateKey = formatDate(log.createdAt)
    if (dateKey !== current) {
      current = dateKey
      groups.push({ date: dateKey, items: [] })
    }
    groups[groups.length - 1].items.push(log)
  }
  return groups
}

export default function ActivityTimeline({ userId, userName, isOpen, onClose }: ActivityTimelineProps) {
  const [logs, setLogs] = useState<ActivityLogItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [filter, setFilter] = useState('')
  const [page, setPage] = useState(0)
  const LIMIT = 30

  const fetchLogs = useCallback(async (reset = false) => {
    const offset = reset ? 0 : (page + 1) * LIMIT
    if (reset) {
      setLoading(true)
      setPage(0)
    } else {
      setLoadingMore(true)
    }

    const actions = filter ? filter.split(',') : undefined
    const result = await getStudentActivityLogAction(userId, { limit: LIMIT, offset, actions })

    if (result.success) {
      if (reset) {
        setLogs(result.logs)
      } else {
        setLogs(prev => [...prev, ...result.logs])
      }
      setTotal(result.total)
      if (!reset) setPage(prev => prev + 1)
    }
    setLoading(false)
    setLoadingMore(false)
  }, [userId, filter, page])

  useEffect(() => {
    if (isOpen) {
      fetchLogs(true)
    }
  }, [isOpen, filter])

  if (!isOpen) return null

  const grouped = groupByDate(logs)
  const hasMore = logs.length < total

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <h3 className="font-bold text-gray-900">Lịch sử hoạt động</h3>
            <p className="text-sm text-gray-500">#{userId} {userName}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Filter */}
        <div className="px-5 py-3 border-b overflow-x-auto">
          <div className="flex gap-2">
            {ACTION_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  filter === f.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <ScrollText className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Chưa có hoạt động nào</p>
            </div>
          ) : (
            <div className="space-y-4">
              {grouped.map(group => (
                <div key={group.date}>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{group.date}</div>
                  <div className="space-y-2">
                    {group.items.map(log => {
                      const config = ACTION_CONFIG[log.action] || { icon: ScrollText, color: 'text-gray-500', bg: 'bg-gray-100', label: log.action }
                      const Icon = config.icon
                      return (
                        <div key={log.id} className="flex items-start gap-3 group">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${config.bg}`}>
                            <Icon className={`w-4 h-4 ${config.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2">
                              <span className={`text-sm font-semibold ${config.color}`}>{config.label}</span>
                              <span className="text-xs text-gray-400">{formatTime(log.createdAt)}</span>
                            </div>
                            {log.detail && (
                              <p className="text-sm text-gray-600 mt-0.5 truncate">{log.detail}</p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}

              {hasMore && (
                <button
                  onClick={() => fetchLogs(false)}
                  disabled={loadingMore}
                  className="w-full py-3 text-sm text-blue-600 font-medium hover:bg-blue-50 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronDown className="w-4 h-4" />}
                  Tải thêm ({logs.length}/{total})
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
