'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Eye, Edit, Plus, ToggleLeft, ToggleRight, Shield, AlertCircle } from 'lucide-react'
import MainHeader from '@/components/layout/MainHeader'
import { getAllSiteProfiles } from '@/app/actions/site-profile-actions'

export default function SiteProfilesPage() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'
  const [profiles, setProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProfiles()
  }, [])

  async function loadProfiles() {
    try {
      const data = await getAllSiteProfiles()
      setProfiles(data || [])
    } catch (error) {
      console.error('Error loading profiles:', error)
    }
    setLoading(false)
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <MainHeader title="QUẢN LÝ TRANG CHỦ" />
        <div className="p-4 max-w-lg mx-auto">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-amber-800 mb-2">Cần đăng nhập</h2>
            <Link
              href="/login?redirect=/tools/site-profiles"
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
        <MainHeader title="QUẢN LÝ TRANG CHỦ" />
        <div className="p-4 max-w-lg mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <Shield className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-red-800 mb-2">Không có quyền truy cập</h2>
            <p className="text-sm text-red-700 mb-4">
              Chỉ Admin mới có quyền quản lý Site Profiles.
            </p>
            <Link
              href="/tools"
              className="inline-block px-6 py-2 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors"
            >
              Về trang công cụ
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MainHeader title="QUẢN LÝ TRANG CHỦ" />

      <div className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Site Profiles</h1>
            <p className="text-gray-500 mt-1">Quản lý trang chủ cho BRK và các Teacher</p>
          </div>
          <Link
            href="/tools/site-profiles/new"
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl hover:brightness-110 transition-all"
          >
            <Plus className="w-5 h-5" /> Tạo Profile
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12">Đang tải...</div>
        ) : profiles.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Chưa có profile nào
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase">Slug</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase">Tiêu đề</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase">Teacher</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase">Lượt xem</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase">Trạng thái</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {profiles.map(profile => (
                  <tr key={profile.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {profile.isDefault && (
                          <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-500 rounded text-[10px] font-bold">BRK</span>
                        )}
                        <Link href={`/${profile.slug}`} className="text-orange-500 hover:underline font-mono text-sm" target="_blank">
                          /{profile.slug}
                        </Link>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-gray-800">{profile.title || '-'}</span>
                    </td>
                    <td className="px-6 py-4">
                      {profile.user ? (
                        <span className="text-gray-800">{profile.user.name}</span>
                      ) : (
                        <span className="text-orange-500 italic">BRK Default</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-500">{profile.viewCount || 0}</span>
                    </td>
                    <td className="px-6 py-4">
                      {profile.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                          <ToggleRight className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-200 text-gray-500 rounded-full text-xs font-bold">
                          <ToggleLeft className="w-3 h-3" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <Link
                          href={`/${profile.slug}`}
                          target="_blank"
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Xem trang"
                        >
                          <Eye className="w-4 h-4 text-gray-400" />
                        </Link>
                        {!profile.isDefault && (
                          <Link
                            href={`/tools/site-profiles/${profile.id}/edit`}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Chỉnh sửa"
                          >
                            <Edit className="w-4 h-4 text-gray-400" />
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
