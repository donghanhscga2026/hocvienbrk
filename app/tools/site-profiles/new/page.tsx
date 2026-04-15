'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Shield, AlertCircle } from 'lucide-react'
import MainHeader from '@/components/layout/MainHeader'
import { createSiteProfile, getTeachers } from '@/app/actions/site-profile-actions'

export default function NewSiteProfilePage() {
  const router = useRouter()
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'
  
  const [slug, setSlug] = useState('')
  const [teacherId, setTeacherId] = useState<number | null>(null)
  const [teachers, setTeachers] = useState<any[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingTeachers, setLoadingTeachers] = useState(true)

  useEffect(() => {
    if (isAdmin) {
      loadTeachers()
    }
  }, [isAdmin])

  async function loadTeachers() {
    try {
      const data = await getTeachers()
      setTeachers(data || [])
    } catch (err) {
      console.error('Error loading teachers:', err)
    }
    setLoadingTeachers(false)
  }

  function generateSlug(name: string) {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 50)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!slug.trim()) {
      setError('Vui lòng nhập slug')
      setLoading(false)
      return
    }

    if (!teacherId) {
      setError('Vui lòng chọn Teacher')
      setLoading(false)
      return
    }

    const result = await createSiteProfile(teacherId, slug)
    
    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else if (result.profile) {
      router.push(`/tools/site-profiles/${result.profile.id}/edit`)
    } else {
      setError('Đã xảy ra lỗi không xác định')
      setLoading(false)
    }
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <MainHeader title="TẠO PROFILE MỚI" />
        <div className="p-4 max-w-lg mx-auto">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-amber-800 mb-2">Cần đăng nhập</h2>
            <Link
              href="/login?redirect=/tools/site-profiles/new"
              className="inline-block px-6 py-2 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition-colors"
            >
              Đăng nhập
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <MainHeader title="TẠO PROFILE MỚI" />
        <div className="p-4 max-w-lg mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <Shield className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-red-800 mb-2">Không có quyền truy cập</h2>
            <Link
              href="/tools/site-profiles"
              className="inline-block px-6 py-2 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors"
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
      <MainHeader title="TẠO PROFILE MỚI" />

      <div className="max-w-2xl mx-auto p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-500/20 border border-red-500 rounded-xl p-4 text-red-500 text-sm">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-black text-gray-500 uppercase mb-2">
              Teacher <span className="text-red-500">*</span>
            </label>
            {loadingTeachers ? (
              <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
                Đang tải...
              </div>
            ) : (
              <select
                value={teacherId || ''}
                onChange={e => {
                  const val = e.target.value ? parseInt(e.target.value) : null
                  setTeacherId(val)
                  if (val) {
                    const teacher = teachers.find(t => t.id === val)
                    if (teacher?.name) {
                      setSlug(generateSlug(teacher.name))
                    }
                  }
                }}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-800"
                required
              >
                <option value="">-- Chọn Teacher --</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.name || t.email}</option>
                ))}
              </select>
            )}
            <p className="text-gray-400 text-xs mt-2">
              Chỉ user có role TEACHER mới hiển thị ở đây
            </p>
          </div>

          <div>
            <label className="block text-sm font-black text-gray-500 uppercase mb-2">
              Slug (URL) <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 shrink-0">giautoandien.io.vn/</span>
              <input
                type="text"
                value={slug}
                onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                placeholder="ten-chuyen-gia"
                className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 font-mono text-gray-800"
                required
              />
            </div>
            <p className="text-gray-400 text-xs mt-2">
              URL: giautoandien.io.vn/{slug || 'ten-slug'}
            </p>
          </div>

          <div className="bg-gray-100/50 border border-gray-200 rounded-xl p-4">
            <h3 className="font-bold text-gray-800 mb-2">Lưu ý:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Profile mới sẽ có trạng thái <strong>Inactive</strong></li>
              <li>• Cần vào chỉnh sửa để kích hoạt profile</li>
              <li>• Teacher sẽ được gửi thông báo khi profile được duyệt</li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={loading || !teacherId || !slug}
            className="w-full bg-orange-500 text-white py-4 rounded-xl font-black uppercase disabled:opacity-50 hover:brightness-110 transition-all"
          >
            {loading ? 'Đang tạo...' : 'Tạo Profile'}
          </button>
        </form>
      </div>
    </div>
  )
}
