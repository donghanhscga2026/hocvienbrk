'use client'

import { useState, useEffect } from 'react'
import { getCoursesAction } from '@/app/actions/admin-actions'
import { BookOpen, Users, DollarSign, Settings, Loader2, Plus, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import MainHeader from '@/components/layout/MainHeader'

export default function ToolsCoursesPage() {
    const [courses, setCourses] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchCourses = async () => {
            setLoading(true)
            const res = await getCoursesAction()
            if (res.success) {
                setCourses(res.courses || [])
            }
            setLoading(false)
        }
        fetchCourses()
    }, [])

    return (
        <div className="min-h-screen bg-gray-50">
            <MainHeader title="KHÓA HỌC" toolSlug="courses" />

            <div className="p-4 max-w-lg mx-auto space-y-6 pb-20">
                <div className="flex items-center justify-between mt-4">
                    <div>
                        <p className="text-gray-600 text-sm">Quản lý nội dung & học phí</p>
                    </div>
                    <Link href="/tools/courses/new" className="bg-yellow-400 text-black p-2 rounded-xl inline-flex">
                        <Plus className="w-4 h-4" />
                    </Link>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="w-full">
                    <table className="w-full text-left border-collapse table-fixed">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="px-2 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center w-14 border-r border-gray-100">ID</th>
                                <th className="px-3 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Thông tin Khóa học</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={2} className="px-6 py-12 text-center text-gray-500">
                                        <Loader2 className="w-6 h-6 animate-spin text-purple-500 mx-auto mb-2" />
                                        <p className="text-[10px] font-black uppercase">Đang tải...</p>
                                    </td>
                                </tr>
                            ) : courses.length === 0 ? (
                                <tr>
                                    <td colSpan={2} className="px-6 py-12 text-center text-gray-400 text-[10px] font-black uppercase">
                                        Chưa có khóa học nào
                                    </td>
                                </tr>
                            ) : (
                                courses.map((course) => (
                                    <tr key={course.id} className="hover:bg-orange-50/30 transition-colors">
                                        <td className="px-2 py-4 text-center align-top space-y-3">
                                            <div className="text-[10px] font-black font-mono text-gray-900 bg-gray-100 px-1 py-0.5 rounded border border-gray-200">
                                                #{course.id}
                                            </div>
                                            <Link 
                                                href={`/tools/courses/${course.id}`} 
                                                className="inline-flex items-center justify-center w-8 h-8 bg-black text-yellow-400 rounded-full hover:bg-zinc-800 active:scale-90 transition-all shadow-md"
                                            >
                                                <Settings className="w-4 h-4" />
                                            </Link>
                                        </td>
                                        <td className="px-3 py-4 space-y-1 overflow-hidden">
                                            <div className="font-black text-orange-600 text-sm truncate leading-tight uppercase tracking-tight">
                                                {course.name_lop}
                                            </div>
                                            <div className="flex items-center gap-3">
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
                                            <div className="text-[10px] text-gray-400 font-medium">
                                                Mã: <span className="font-bold text-gray-600">{course.id_khoa}</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            </div>
        </div>
    )
}