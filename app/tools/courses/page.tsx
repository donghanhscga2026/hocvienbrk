'use client'

import { useState, useEffect } from 'react'
import { getAdminCoursesAction, bulkToggleCourseStatusAction } from '@/app/actions/admin-actions'
import { BookOpen, Users, DollarSign, Settings, Loader2, Plus, Eye, EyeOff, CheckSquare } from 'lucide-react'
import Link from 'next/link'
import MainHeader from '@/components/layout/MainHeader'

export default function ToolsCoursesPage() {
    const [courses, setCourses] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
    const [batchLoading, setBatchLoading] = useState(false)

    useEffect(() => {
        const fetchCourses = async () => {
            setLoading(true)
            const res = await getAdminCoursesAction()
            if (res.success) {
                setCourses(res.courses || [])
            }
            setLoading(false)
        }
        fetchCourses()
    }, [])

    const toggleSelect = (id: number) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const toggleSelectAll = () => {
        if (selectedIds.size === courses.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(courses.map(c => c.id)))
        }
    }

    const handleBulkAction = async (newStatus: boolean) => {
        const label = newStatus ? 'kích hoạt' : 'ẩn'
        if (!confirm(`Xác nhận ${label} ${selectedIds.size} khóa học?`)) return

        setBatchLoading(true)
        try {
            const res = await bulkToggleCourseStatusAction(Array.from(selectedIds), newStatus)
            if (res.success) {
                const refreshed = await getAdminCoursesAction()
                if (refreshed.success) setCourses(refreshed.courses || [])
                setSelectedIds(new Set())
            } else {
                alert(res.error || 'Có lỗi xảy ra')
            }
        } catch {
            alert('Có lỗi xảy ra')
        } finally {
            setBatchLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <MainHeader title="KHÓA HỌC" toolSlug="courses" />

            <div className="p-4 max-w-4xl mx-auto space-y-4 pb-20">
                <div className="flex items-center justify-between mt-4">
                    <div>
                        <p className="text-gray-600 text-sm">Quản lý nội dung & học phí</p>
                    </div>
                    <Link href="/tools/courses/new" className="bg-yellow-400 text-black p-2 rounded-xl inline-flex">
                        <Plus className="w-4 h-4" />
                    </Link>
                </div>

                {selectedIds.size > 0 && (
                    <div className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm">
                        <CheckSquare className="w-4 h-4 text-gray-500 shrink-0" />
                        <span className="text-sm font-bold text-gray-700">Đã chọn {selectedIds.size} khóa học</span>
                        <div className="ml-auto flex gap-2">
                            <button
                                onClick={() => handleBulkAction(true)}
                                disabled={batchLoading}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-green-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-600 transition-colors disabled:opacity-50"
                            >
                                {batchLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
                                Kích hoạt
                            </button>
                            <button
                                onClick={() => handleBulkAction(false)}
                                disabled={batchLoading}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-yellow-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-yellow-600 transition-colors disabled:opacity-50"
                            >
                                {batchLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <EyeOff className="w-3 h-3" />}
                                Ẩn
                            </button>
                            <button
                                onClick={() => setSelectedIds(new Set())}
                                className="text-xs text-gray-400 hover:text-gray-600 font-bold px-2"
                            >
                                Bỏ chọn
                            </button>
                        </div>
                    </div>
                )}

                {selectedIds.size === 0 && courses.length > 0 && (
                    <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={courses.length > 0 && selectedIds.size === courses.length}
                                onChange={toggleSelectAll}
                                className="rounded border-gray-300 accent-yellow-500 cursor-pointer"
                            />
                            <span className="text-xs font-bold text-gray-400">Chọn tất cả</span>
                        </label>
                    </div>
                )}

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                        <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-3" />
                        <p className="text-xs font-black uppercase tracking-wider">Đang tải...</p>
                    </div>
                ) : courses.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <BookOpen className="w-10 h-10 mb-3" />
                        <p className="text-xs font-black uppercase tracking-wider">Chưa có khóa học nào</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {courses.map((course) => (
                            <div
                                key={course.id}
                                className={`bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden transition-all ${
                                    !course.status ? 'opacity-60' : ''
                                } ${selectedIds.has(course.id) ? 'ring-2 ring-yellow-400' : 'hover:shadow-md'}`}
                            >
                                <div className="p-4">
                                    <div className="flex items-start gap-3">
                                        <div className="pt-0.5">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(course.id)}
                                                onChange={() => toggleSelect(course.id)}
                                                className="rounded border-gray-300 accent-yellow-500 cursor-pointer mt-1"
                                            />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-[10px] font-black font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 shrink-0">
                                                            #{course.id}
                                                        </span>
                                                        {course.status ? (
                                                            <span className="inline-block px-1.5 py-0.5 rounded-full text-[9px] font-black bg-green-100 text-green-700 border border-green-200 shrink-0">
                                                                Đang mở
                                                            </span>
                                                        ) : (
                                                            <span className="inline-block px-1.5 py-0.5 rounded-full text-[9px] font-black bg-red-100 text-red-700 border border-red-200 shrink-0">
                                                                Đã ẩn
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="font-black text-orange-600 text-sm leading-tight uppercase tracking-tight truncate">
                                                        {course.name_khoa || course.name_lop}
                                                    </div>
                                                </div>
                                                <Link
                                                    href={`/tools/courses/${course.id}`}
                                                    className="shrink-0 inline-flex items-center justify-center w-8 h-8 bg-black text-yellow-400 rounded-full hover:bg-zinc-800 active:scale-90 transition-all shadow-md"
                                                >
                                                    <Settings className="w-4 h-4" />
                                                </Link>
                                            </div>

                                            <div className="flex items-center gap-3 mt-2">
                                                <div className="flex items-center gap-1 text-[10px] text-gray-500 font-bold">
                                                    <DollarSign className="w-3 h-3 text-green-500" />
                                                    {course.phi_coc.toLocaleString()}đ
                                                </div>
                                                <div className="flex items-center gap-1 text-[10px] text-gray-500 font-bold">
                                                    <BookOpen className="w-3 h-3 text-blue-400" />
                                                    {course._count?.lessons} bài
                                                </div>
                                                <div className="flex items-center gap-1 text-[10px] text-gray-500 font-bold">
                                                    <Users className="w-3 h-3 text-purple-400" />
                                                    {course._count?.enrollments} HV
                                                </div>
                                            </div>

                                            <div className="text-[10px] text-gray-400 font-medium mt-1">
                                                Mã: <span className="font-bold text-gray-600">{course.id_khoa}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
