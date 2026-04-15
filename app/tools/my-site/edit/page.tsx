'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { ArrowLeft, Loader2, AlertCircle, CheckCircle, Save, Image } from 'lucide-react'
import MainHeader from '@/components/layout/MainHeader'
import { getMySiteProfile, updateMyProfile } from '@/app/actions/site-profile-actions'

interface Profile {
  id: number
  slug: string
  title: string | null
  subtitle: string | null
  heroImage: string | null
  heroOverlay: number | null
  messageContent: string | null
  messageDetail: string | null
  accentColor: string | null
  backgroundColor: string | null
  footerText: string | null
  isActive: boolean
}

interface FormData {
  title: string
  subtitle: string
  heroImage: string
  messageContent: string
  messageDetail: string
  accentColor: string
  backgroundColor: string
  footerText: string
}

const PRESET_COLORS = [
  { name: 'Cam BRK', value: '#f97316' },
  { name: 'Xanh lá', value: '#10b981' },
  { name: 'Xanh dương', value: '#3b82f6' },
  { name: 'Đỏ', value: '#ef4444' },
  { name: 'Tím', value: '#8b5cf6' },
  { name: 'Hồng', value: '#ec4899' },
  { name: 'Vàng', value: '#eab308' },
  { name: 'Xám', value: '#6b7280' },
]

export default function MySiteEditPage() {
  const { data: session } = useSession()
  const userId = session?.user?.id as string | null
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormData>({
    title: '',
    subtitle: '',
    heroImage: '',
    messageContent: '',
    messageDetail: '',
    accentColor: '#f97316',
    backgroundColor: '',
    footerText: '',
  })

  useEffect(() => {
    if (userId) {
      loadProfile()
    }
  }, [userId])

  async function loadProfile() {
    try {
      const data = await getMySiteProfile(parseInt(userId!))
      if (data) {
        setProfile(data)
        setFormData({
          title: data.title || '',
          subtitle: data.subtitle || '',
          heroImage: data.heroImage || '',
          messageContent: data.messageContent || '',
          messageDetail: data.messageDetail || '',
          accentColor: data.accentColor || '#f97316',
          backgroundColor: data.backgroundColor || '',
          footerText: data.footerText || '',
        })
      }
    } catch (err) {
      console.error('Error loading profile:', err)
    }
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return

    setSaving(true)
    setError(null)
    setSaved(false)

    try {
      const result = await updateMyProfile(parseInt(userId), formData)
      if (result.error) {
        setError(result.error)
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch (err) {
      setError('Đã xảy ra lỗi khi lưu')
    }
    setSaving(false)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <MainHeader title="CHỈNH SỬA TRANG" />
        <div className="p-4 max-w-lg mx-auto">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-amber-800 mb-2">Cần đăng nhập</h2>
            <Link
              href="/login?redirect=/tools/my-site/edit"
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

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <MainHeader title="CHỈNH SỬA TRANG" />
        <div className="p-4 max-w-lg mx-auto">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-amber-800 mb-2">Bạn chưa có trang chủ</h2>
            <p className="text-sm text-amber-700 mb-4">
              Vui lòng liên hệ Admin để tạo trang chủ cho bạn.
            </p>
            <Link
              href="/tools/my-site"
              className="inline-block px-6 py-2 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition-colors"
            >
              Quay lại
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MainHeader title="CHỈNH SỬA TRANG" toolSlug="my-site" />

      <div className="p-4 max-w-lg mx-auto pb-20">
        <form onSubmit={handleSubmit}>
          {saved && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2 text-green-700">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Đã lưu thành công!</span>
            </div>
          )}

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">Thông tin cơ bản</h2>
              <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
                <span className="font-mono">/{profile.slug}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tiêu đề trang
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Ví dụ: Nhung Đinh Dưỡng"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brk-accent/50 focus:border-brk-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phụ đề
                </label>
                <input
                  type="text"
                  name="subtitle"
                  value={formData.subtitle}
                  onChange={handleChange}
                  placeholder="Ví dụ: Chuyên gia dinh dưỡng"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brk-accent/50 focus:border-brk-accent"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Hero Section</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ảnh nền Hero
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    name="heroImage"
                    value={formData.heroImage}
                    onChange={handleChange}
                    placeholder="https://example.com/image.jpg"
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brk-accent/50 focus:border-brk-accent"
                  />
                </div>
                {formData.heroImage && (
                  <div className="mt-2 rounded-lg overflow-hidden">
                    <img
                      src={formData.heroImage}
                      alt="Hero preview"
                      className="w-full h-32 object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  </div>
                )}
                <p className="mt-1 text-xs text-gray-400">
                  Nên dùng ảnh có tỷ lệ 16:9, kích thước tối thiểu 1200x600px
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Nội dung thông điệp</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Thông điệp chính
                </label>
                <textarea
                  name="messageContent"
                  value={formData.messageContent}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Viết thông điệp truyền cảm hứng của bạn..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brk-accent/50 focus:border-brk-accent resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Chi tiết thông điệp
                </label>
                <textarea
                  name="messageDetail"
                  value={formData.messageDetail}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Viết chi tiết hơn về bạn và những gì bạn mang đến..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brk-accent/50 focus:border-brk-accent resize-none"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Màu sắc</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Màu chủ đạo
                </label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, accentColor: color.value }))}
                      className={`w-10 h-10 rounded-lg border-2 transition-all ${
                        formData.accentColor === color.value
                          ? 'border-gray-800 scale-110'
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.accentColor}
                    onChange={(e) => setFormData(prev => ({ ...prev, accentColor: e.target.value }))}
                    className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.accentColor}
                    onChange={handleChange}
                    name="accentColor"
                    placeholder="#f97316"
                    className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Màu nền (tùy chọn)
                </label>
                <input
                  type="text"
                  name="backgroundColor"
                  value={formData.backgroundColor}
                  onChange={handleChange}
                  placeholder="Để trống = mặc định"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brk-accent/50 focus:border-brk-accent"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Footer</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nội dung Footer
              </label>
              <textarea
                name="footerText"
                value={formData.footerText}
                onChange={handleChange}
                rows={2}
                placeholder="Ví dụ: © 2026 Nhung Đinh Dưỡng. Mọi quyền được bảo lưu."
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brk-accent/50 focus:border-brk-accent resize-none"
              />
            </div>
          </div>

          <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-gray-50 via-gray-50 to-transparent">
            <div className="max-w-lg mx-auto">
              <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-brk-accent text-white rounded-xl font-bold text-base hover:brightness-110 transition-all disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Lưu thay đổi
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
