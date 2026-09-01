'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Eye, Edit, Trash2 } from 'lucide-react'
import { getCoursePages, deleteCoursePage, updateCoursePage } from '@/app/actions/course-page-actions'

export default function CoursesTab() {
  const [coursePages, setCoursePages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCoursePages()
  }, [])

  async function loadCoursePages() {
    const data = await getCoursePages()
    setCoursePages(data)
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Bạn có chắc muốn xóa cấu hình trang khóa học này?')) return
    const res = await deleteCoursePage(id)
    if (res.success) {
      loadCoursePages()
    } else {
      alert(res.error || 'Có lỗi xảy ra')
    }
  }

  async function handleToggleTemplate(id: string, currentVal: boolean) {
    const res = await updateCoursePage(id, { useTemplate: !currentVal })
    if (res.success) {
      setCoursePages((prev) =>
        prev.map((p) => (p.id === id ? { ...p, useTemplate: !currentVal } : p))
      )
    } else {
      alert(res.error || 'Có lỗi xảy ra khi cập nhật cấu hình')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-gray-400 text-sm">Đang tải...</span>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-black uppercase tracking-tight">Trang Khóa Học</h1>
          <p className="text-sm text-gray-400 mt-0.5">Quản lý nội dung & cấu hình giao diện động cho các khóa học</p>
        </div>
        <Link
          href="/tools/courses/new"
          className="flex items-center gap-2 px-4 py-2 bg-black text-yellow-400 rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-gray-800 transition-all"
        >
          <Plus className="w-4 h-4" /> Tạo mới
        </Link>
      </div>

      {coursePages.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <p className="text-gray-400 mb-4 text-sm">Chưa cấu hình trang khóa học động nào</p>
          <Link
            href="/tools/courses/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-black text-yellow-400 rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-gray-800"
          >
            Tạo cấu hình đầu tiên
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3 text-left text-[10px] font-black uppercase text-gray-400">Khóa Học</th>
                  <th className="px-5 py-3 text-left text-[10px] font-black uppercase text-gray-400">Template Động</th>
                  <th className="px-5 py-3 text-left text-[10px] font-black uppercase text-gray-400">Trạng Thái</th>
                  <th className="px-5 py-3 text-left text-[10px] font-black uppercase text-gray-400">Ngày Cập Nhật</th>
                  <th className="px-5 py-3 text-center text-[10px] font-black uppercase text-gray-400">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {coursePages.map((page) => (
                  <tr key={page.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <Link
                        href={`/khoa-hoc/${page.slug}`}
                        target="_blank"
                        className="font-medium text-blue-600 hover:underline text-sm"
                      >
                        /khoa-hoc/{page.slug}
                      </Link>
                      <p className="text-xs text-gray-400 mt-0.5">{page.name}</p>
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => handleToggleTemplate(page.id, page.useTemplate !== false)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          page.useTemplate !== false ? 'bg-black' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            page.useTemplate !== false ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                      <span className="text-xs text-gray-400 ml-2 font-semibold">
                        {page.useTemplate !== false ? 'Bật' : 'Tắt'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {page.status === 'published' ? (
                        <span className="px-2.5 py-1 bg-green-50 text-green-700 rounded-full text-xs font-bold">
                          Published
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-gray-100 text-gray-500 rounded-full text-xs font-bold">
                          Draft
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">
                      {new Date(page.updatedAt).toLocaleString('vi-VN')}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <a
                          href={`/khoa-hoc/${page.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </a>
                        <Link
                          href={`/tools/courses/pages/${page.id}`}
                          className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-gray-400 hover:text-green-600 hover:bg-green-50 transition-all"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => handleDelete(page.id)}
                          className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
