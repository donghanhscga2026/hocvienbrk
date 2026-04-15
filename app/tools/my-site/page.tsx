'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Eye, Edit, ExternalLink, Loader2, Plus, ToggleLeft, ToggleRight, AlertCircle, CheckCircle, BarChart3 } from 'lucide-react'
import MainHeader from '@/components/layout/MainHeader'
import { getMySiteProfile } from '@/app/actions/site-profile-actions'

interface Profile {
  id: number
  slug: string
  title: string | null
  isActive: boolean
  isDefault: boolean
  viewCount: number
  heroImage: string | null
  createdAt: Date | string
  updatedAt: Date | string
}

export default function MySitePage() {
  const { data: session } = useSession()
  const userId = session?.user?.id as string | null
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userId) {
      loadProfile()
    } else {
      setLoading(false)
    }
  }, [userId])

  async function loadProfile() {
    try {
      const data = await getMySiteProfile(parseInt(userId!))
      setProfile(data)
    } catch (error) {
      console.error('Error loading profile:', error)
    }
    setLoading(false)
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <MainHeader title="TRANG CỦA TÔI" />
        <div className="p-4 max-w-lg mx-auto">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-amber-800 mb-2">Cần đăng nhập</h2>
            <p className="text-sm text-amber-700 mb-4">
              Bạn cần đăng nhập để quản lý trang chủ của mình.
            </p>
            <Link
              href="/login?redirect=/tools/my-site"
              className="inline-block px-6 py-2 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition-colors"
            >
              Đăng nhập
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brk-accent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MainHeader title="TRANG CỦA TÔI" />

      <div className="p-4 max-w-lg mx-auto">
        <div className="bg-gradient-to-br from-brk-accent to-orange-600 rounded-3xl p-6 text-white mb-6">
          <h1 className="text-xl font-bold mb-1">Trang chủ cá nhân</h1>
          <p className="text-white/80 text-sm">
            Tùy chỉnh trang chủ riêng của bạn với URL <span className="font-mono">/{profile?.slug || 'your-slug'}</span>
          </p>
        </div>

        {!profile ? (
          <div className="bg-white rounded-3xl border border-gray-100 p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-gray-400" />
              </div>
              <h2 className="text-lg font-bold text-gray-800 mb-2">Bạn chưa có trang chủ</h2>
              <p className="text-sm text-gray-500 mb-4">
                Tạo trang chủ riêng để giới thiệu khóa học và chia sẻ link affiliate.
              </p>
              <Link
                href="/tools/site-profiles/new"
                className="inline-block px-6 py-3 bg-brk-accent text-white rounded-xl font-medium hover:brightness-110 transition-all"
              >
                Tạo trang chủ
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-3xl border border-gray-100 p-6 mb-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {profile.isActive ? (
                    <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                      <CheckCircle className="w-3 h-3" />
                      Đang hoạt động
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">
                      <AlertCircle className="w-3 h-3" />
                      Chờ duyệt
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <BarChart3 className="w-4 h-4" />
                  <span>{profile.viewCount || 0} lượt xem</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Tiêu đề</span>
                  <span className="font-medium text-gray-800">{profile.title || 'Chưa đặt'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">URL</span>
                  <Link
                    href={`/${profile.slug}`}
                    className="font-mono text-sm text-brk-accent hover:underline"
                    target="_blank"
                  >
                    /{profile.slug}
                  </Link>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
              <Link
                href={`/${profile.slug}`}
                className="flex items-center gap-4 p-5 hover:bg-gray-50 transition-colors"
                target="_blank"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Eye className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-800">Xem trang của bạn</h3>
                  <p className="text-sm text-gray-500">Mở trang chủ trong tab mới</p>
                </div>
                <ExternalLink className="w-5 h-5 text-gray-400" />
              </Link>

              <div className="h-px bg-gray-100" />

              <Link
                href="/tools/my-site/edit"
                className="flex items-center gap-4 p-5 hover:bg-gray-50 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                  <Edit className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-800">Chỉnh sửa trang</h3>
                  <p className="text-sm text-gray-500">Cập nhật nội dung và giao diện</p>
                </div>
                <Edit className="w-5 h-5 text-gray-400" />
              </Link>
            </div>

            {!profile.isActive && (
              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-amber-800 text-sm">Trang của bạn đang chờ duyệt</h4>
                    <p className="text-xs text-amber-700 mt-1">
                      Admin sẽ xem xét và kích hoạt trang trong thời gian sớm nhất. 
                      Sau khi được duyệt, trang sẽ có thể truy cập công khai.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400">
            Liên hệ Admin nếu cần hỗ trợ: admin@hocvienbrk.com
          </p>
        </div>
      </div>
    </div>
  )
}
