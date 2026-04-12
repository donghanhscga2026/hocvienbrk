'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { getStudentsAction } from '@/app/actions/admin-actions'
import { Search, User, Mail, Phone, Loader2, ArrowUpDown, ArrowLeft, Users, Shield, GraduationCap, Handshake, Trophy, ChevronLeft, ChevronRight } from 'lucide-react'
import ToolHeader from '@/components/tools/ToolHeader'

const roleConfig: Record<string, { label: string; icon: any; color: string; bgColor: string; textColor: string }> = {
  ALL: { label: 'Tất cả', icon: Users, color: 'text-gray-600', bgColor: 'bg-gray-100', textColor: 'text-gray-700' },
  STUDENT: { label: 'Học viên', icon: GraduationCap, color: 'text-gray-600', bgColor: 'bg-gray-100', textColor: 'text-gray-700' },
  ADMIN: { label: 'Quản trị', icon: Shield, color: 'text-red-600', bgColor: 'bg-red-100', textColor: 'text-red-700' },
  INSTRUCTOR: { label: 'Giảng viên', icon: Users, color: 'text-blue-600', bgColor: 'bg-blue-100', textColor: 'text-blue-700' },
  AFFILIATE: { label: 'Đối tác', icon: Handshake, color: 'text-green-600', bgColor: 'bg-green-100', textColor: 'text-green-700' },
  COURSE_86_DAYS: { label: 'Coach 1:1', icon: Trophy, color: 'text-purple-600', bgColor: 'bg-purple-100', textColor: 'text-purple-700' },
}

const roleCardColors: Record<string, string> = {
  ADMIN: 'bg-red-100',
  COURSE_86_DAYS: 'bg-gray-100',
  INSTRUCTOR: 'bg-blue-100',
  AFFILIATE: 'bg-green-100',
  STUDENT: 'bg-gray-100',
}

const roleTextColors: Record<string, string> = {
  ADMIN: 'text-red-600',
  COURSE_86_DAYS: 'text-purple-600',
  INSTRUCTOR: 'text-blue-600',
  AFFILIATE: 'text-green-600',
  STUDENT: 'text-gray-900',
}

const PAGE_SIZE = 20

export default function ToolsStudentsPage() {
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRole, setSelectedRole] = useState<string>('ALL') 
  const [sortBy, setSortBy] = useState<'createdAt' | 'id'>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [total, setTotal] = useState(0)
  const [roleCounts, setRoleCounts] = useState<Record<string, number>>({})

  const fetchStudents = useCallback(async (pageNum: number = 0) => {
    setLoading(true)
    const res = await getStudentsAction(searchQuery, selectedRole as any, pageNum, PAGE_SIZE, sortBy, sortOrder)
    if (res.success) {
      setStudents(res.students || [])
      setTotal(res.total || 0)
      setTotalPages(res.totalPages || 0)
      setPage(pageNum)
      if (res.roleCounts) {
        setRoleCounts(res.roleCounts)
      }
    }
    setLoading(false)
  }, [searchQuery, selectedRole, sortBy, sortOrder])

  useEffect(() => {
    fetchStudents(0)
  }, [fetchStudents])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchStudents(0)
  }

  const handleRoleChange = (role: string) => {
    setSelectedRole(role)
    fetchStudents(0)
  }

  const toggleSort = () => {
    if (sortBy === 'createdAt') {
      setSortBy('id')
    } else {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
    }
  }

  const goToPrevPage = () => {
    if (page > 0) fetchStudents(page - 1)
  }

  const goToNextPage = () => {
    if (page < totalPages - 1) fetchStudents(page + 1)
  }

  const startItem = page * PAGE_SIZE + 1
  const endItem = Math.min((page + 1) * PAGE_SIZE, total)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
    <ToolHeader title="THÀNH VIÊN" backUrl="/tools" />
      <div className="text-xs font-medium text-gray-500 text-center py-2 bg-gray-100">
        {total > 0 ? `${startItem}-${endItem} / ${total}` : '0'}
      </div>

      <div className="sticky top-16 z-40 bg-white border-b shadow-sm">
        <div className="p-4 space-y-3">
          <div className="flex gap-2">
            {Object.entries(roleConfig).map(([key, config]) => {
              const Icon = config.icon
              const isSelected = selectedRole === key
              const count = roleCounts[key] ?? 0
              return (
                <button
                  key={key}
                  onClick={() => handleRoleChange(key)}
                  className={`flex-1 flex flex-col items-center gap-0.5 px-1 py-2 rounded-xl transition-all border-2 ${
                    isSelected 
                      ? `${config.bgColor} ${config.textColor} shadow-lg ring-2 ring-yellow-400 ring-offset-1 border-yellow-400` 
                      : `${config.bgColor} ${config.textColor} border-transparent hover:shadow-md`
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-[9px] font-black uppercase tracking-tight leading-tight">{config.label}</span>
                  <span className="text-[10px] font-bold">{count}</span>
                </button>
              )
            })}
          </div>

          <div className="flex gap-2">
            <form onSubmit={handleSearch} className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm Tên, SĐT, Email..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </form>
            <button
              onClick={toggleSort}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl font-bold text-xs transition-all ${
                sortOrder === 'desc' 
                  ? 'bg-black text-yellow-400' 
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              <ArrowUpDown className="w-4 h-4" />
              <span>{sortBy === 'id' ? 'ID' : (sortOrder === 'desc' ? 'Mới' : 'Cũ')}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 pb-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-3 border-purple-600 border-t-transparent"></div>
            <p className="mt-4 text-gray-500 text-sm">Đang tải...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium">Không có thành viên</p>
            <p className="text-gray-400 text-sm mt-1">Danh sách trống</p>
          </div>
        ) : (
          <div className="space-y-3">
            {students.map((student) => {
              const isCoach = student.enrollments?.some((e: any) => e.courseId === 1)
              const displayRole = isCoach ? 'COURSE_86_DAYS' : student.role
              const bgColor = roleCardColors[displayRole] || 'bg-gray-100'
              const textColor = roleTextColors[displayRole] || 'text-gray-900'
              
              return (
                <Link
                  key={student.id}
                  href={`/tools/students/${student.id}`}
                  prefetch={false}
                  className="block bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-gray-200 transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      {student.image ? (
                        <div className={`w-12 h-12 rounded-xl overflow-hidden ${bgColor}`}>
                          <Image
                            src={student.image}
                            alt={student.name || 'Avatar'}
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bgColor}`}>
                          <User className={`w-6 h-6 ${textColor}`} />
                        </div>
                      )}
                      <span className="text-[10px] font-black text-gray-400">#{student.id}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className={`font-bold text-base truncate ${isCoach ? 'text-purple-600' : textColor}`}>
                        {student.name || 'Chưa có tên'}
                      </h3>
                      
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500">
                        <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate">{student.email}</span>
                      </div>
                      
                      <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-500">
                        <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                        <span>{student.phone || 'Chưa có SĐT'}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="sticky bottom-0 bg-white border-t p-3 flex items-center justify-center gap-4">
          <button
            onClick={goToPrevPage}
            disabled={page === 0}
            className="flex items-center gap-1 px-3 py-2 bg-gray-100 rounded-lg disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-sm">Trước</span>
          </button>
          <span className="text-sm font-medium">
            Trang {page + 1} / {totalPages}
          </span>
          <button
            onClick={goToNextPage}
            disabled={page >= totalPages - 1}
            className="flex items-center gap-1 px-3 py-2 bg-gray-100 rounded-lg disabled:opacity-50"
          >
            <span className="text-sm">Sau</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}