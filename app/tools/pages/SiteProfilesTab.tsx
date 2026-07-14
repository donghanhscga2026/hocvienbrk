'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Eye, Edit, Plus, ToggleLeft, ToggleRight, Shield, AlertCircle } from 'lucide-react'
import { getAllSiteProfiles } from '@/app/actions/site-profile-actions'

export default function SiteProfilesTab() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'
  const [profiles, setProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadProfiles() }, [])

  async function loadProfiles() {
    try {
      const data = await getAllSiteProfiles()
      setProfiles(data || [])
    } catch {} finally { setLoading(false) }
  }

  if (!session?.user) {
    return (
      <div className="p-4 max-w-lg mx-auto">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-amber-800 mb-2">Cần đăng nhập</h2>
          <Link href="/login?redirect=/tools/pages?tab=site-profiles" className="inline-block px-6 py-2 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600">Đăng nhập</Link>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="p-4 max-w-lg mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <Shield className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-red-800 mb-2">Không có quyền truy cập</h2>
          <p className="text-sm text-red-700 mb-4">Chỉ Admin mới có quyền quản lý Site Profiles.</p>
          <Link href="/tools" className="inline-block px-6 py-2 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600">Về trang công cụ</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-black uppercase tracking-tight">Site Profiles</h1>
          <p className="text-sm text-gray-400 mt-0.5">Quản lý trang chủ cho BRK và các Teacher</p>
        </div>
        <Link href="/tools/site-profiles/new" className="flex items-center gap-2 px-4 py-2 bg-black text-yellow-400 rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-gray-800 transition-all">
          <Plus className="w-4 h-4" /> Tạo Profile
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Đang tải...</div>
      ) : profiles.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">Chưa có profile nào</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3 text-left text-[10px] font-black uppercase text-gray-400">Slug</th>
                  <th className="px-5 py-3 text-left text-[10px] font-black uppercase text-gray-400">Tiêu đề</th>
                  <th className="px-5 py-3 text-left text-[10px] font-black uppercase text-gray-400">Teacher</th>
                  <th className="px-5 py-3 text-center text-[10px] font-black uppercase text-gray-400">Lượt xem</th>
                  <th className="px-5 py-3 text-center text-[10px] font-black uppercase text-gray-400">Trạng thái</th>
                  <th className="px-5 py-3 text-center text-[10px] font-black uppercase text-gray-400">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {profiles.map((profile: any) => (
                  <tr key={profile.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {profile.isDefault && <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-500 rounded text-[10px] font-bold">BRK</span>}
                        <Link href={`/page/${profile.slug}`} className="text-orange-500 hover:underline font-mono text-sm" target="_blank">/page/{profile.slug}</Link>
                      </div>
                    </td>
                    <td className="px-5 py-3"><span className="font-medium text-gray-800">{profile.title || '-'}</span></td>
                    <td className="px-5 py-3">
                      {profile.user ? <span className="text-gray-800">{profile.user.name}</span> : <span className="text-orange-500 italic">BRK Default</span>}
                    </td>
                    <td className="px-5 py-3 text-center text-gray-500">{profile.viewCount || 0}</td>
                    <td className="px-5 py-3 text-center">
                      {profile.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold"><ToggleRight className="w-3 h-3" /> Active</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-200 text-gray-500 rounded-full text-xs font-bold"><ToggleLeft className="w-3 h-3" /> Inactive</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Link href={`/page/${profile.slug}`} target="_blank" className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"><Eye className="w-3.5 h-3.5" /></Link>
                        {!profile.isDefault && (
                          <Link href={`/tools/site-profiles/${profile.id}/edit`} className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-gray-400 hover:text-green-600 hover:bg-green-50 transition-all"><Edit className="w-3.5 h-3.5" /></Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
