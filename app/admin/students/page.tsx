'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getStudentsAction } from '@/app/actions/admin-actions'
import { Search, User, Mail, Phone, Calendar, BookOpen, CheckCircle, Loader2, Info, ArrowUpDown } from 'lucide-react'

export default function AdminStudentsPage() {
    const [students, setStudents] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedRole, setSelectedRole] = useState<string>('STUDENT') 
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

    const fetchStudents = async (query?: string, role?: string) => {
        setLoading(true)
        const res = await getStudentsAction(query, (role || selectedRole) as any)
        if (res.success) {
            let data = res.students || []
            // Sắp xếp dữ liệu theo thời gian tạo (createdAt)
            data.sort((a: any, b: any) => {
                const timeA = new Date(a.createdAt).getTime()
                const timeB = new Date(b.createdAt).getTime()
                return sortOrder === 'asc' ? timeA - timeB : timeB - timeA
            })
            setStudents(data)
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchStudents(searchQuery, selectedRole)
    }, [sortOrder, selectedRole])

    const toggleSort = () => {
        setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
    }

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        fetchStudents(searchQuery, selectedRole)
    }

    return (
        <div className="space-y-6 pb-20">
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 leading-tight">Quản lý</h1>
                        <p className="text-gray-500 text-xs font-medium">Thành viên & tiến độ</p>
                    </div>

                    <select 
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value)}
                        className="bg-black text-yellow-400 border-none rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-tighter focus:ring-2 focus:ring-yellow-500 outline-none shadow-lg cursor-pointer"
                    >
                        <option value="ALL">Tất cả</option>
                        <option value="STUDENT">Học viên</option>
                        <option value="ADMIN">Quản trị</option>
                        <option value="INSTRUCTOR">Giảng viên</option>
                        <option value="AFFILIATE">Đối tác</option>
                        <option value="COURSE_86_DAYS">Coach 1:1</option>
                    </select>
                </div>

                <form onSubmit={handleSearch} className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Tìm Tên, SĐT hoặc #ID..."
                        className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm text-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </form>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="w-full">
                    <table className="w-full text-left border-collapse table-fixed">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="px-2 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center w-14 border-r border-gray-100">ID</th>
                                <th className="px-3 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest relative">
                                    <div className="flex items-center">
                                        <span>Thông tin cơ bản</span>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                                            <div className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded text-[9px] font-black border border-orange-200 shadow-sm">
                                                {students.length}
                                            </div>
                                            <button 
                                                onClick={toggleSort}
                                                className="flex items-center gap-1 hover:text-gray-900 transition-colors bg-gray-100 p-1 rounded-lg border border-gray-200"
                                                title={sortOrder === 'desc' ? 'Mới nhất lên đầu' : 'Cũ nhất lên đầu'}
                                            >
                                                <ArrowUpDown className={`w-3.5 h-3.5 ${sortOrder === 'desc' ? 'text-gray-900' : 'text-purple-600'}`} />
                                            </button>
                                        </div>
                                    </div>
                                </th>
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
                            ) : students.length === 0 ? (
                                <tr>
                                    <td colSpan={2} className="px-6 py-12 text-center text-gray-400 text-[10px] font-black uppercase">
                                        Trống
                                    </td>
                                </tr>
                            ) : (
                                    students.map((student) => {
                                        const hasCourseOne = student.enrollments.some((e: any) => e.courseId === 1)
                                        
                                        return (
                                            <tr key={student.id} className="hover:bg-orange-50/30 transition-colors">
                                                <td className="px-2 py-4 text-center align-top space-y-3">
                                                    <div className="text-[10px] font-black font-mono text-gray-900 bg-gray-100 px-1 py-0.5 rounded border border-gray-200">
                                                        #{student.id}
                                                    </div>
                                                    <Link 
                                                        href={`/admin/students/${student.id}`} 
                                                        className="inline-flex items-center justify-center w-8 h-8 bg-black text-yellow-400 rounded-full hover:bg-zinc-800 active:scale-90 transition-all shadow-md"
                                                    >
                                                        <Info className="w-4 h-4" />
                                                    </Link>
                                                </td>
                                                <td className="px-3 py-4 space-y-1 overflow-hidden">
                                                    <div className={`font-black text-sm truncate leading-tight capitalize tracking-tight ${hasCourseOne ? 'text-purple-600' : 'text-orange-600'}`}>
                                                        {student.name ? student.name.toLowerCase() : 'N/A'}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-medium truncate">
                                                        <Mail className="w-3 h-3 text-gray-300 shrink-0" />
                                                        {student.email}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-bold truncate">
                                                        <Phone className="w-3 h-3 text-gray-300 shrink-0" />
                                                        {student.phone || '---'}
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
