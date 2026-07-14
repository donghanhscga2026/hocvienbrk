'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import { getStudentsAction, getAdminCoursesAction, resendVerificationAction, resendAllVerificationAction } from '@/app/actions/admin-actions'
import { Search, User, Mail, Phone, Loader2, ArrowUpDown, ArrowLeft, Users, Shield, GraduationCap, Handshake, Trophy, ChevronLeft, ChevronRight, X, Upload, ScrollText } from 'lucide-react'
import MainHeader from '@/components/layout/MainHeader'
import DeleteByUserSection from '@/components/admin/students/DeleteByUserSection'
import BulkEnrollModal from '@/components/admin/students/BulkEnrollModal'
import ActivityTimeline from '@/components/admin/ActivityTimeline'

interface EnrollmentData {
  courseId: number
  course: { name_lop: string }
  _count: { lessonProgress: number }
}

interface StudentData {
  id: number
  name: string | null
  email: string
  image: string | null
  phone: string | null
  role: string
  createdAt: Date
  emailVerified?: Date | null
  enrollments?: EnrollmentData[]
}

const roleConfig: Record<string, { label: string; icon: any; color: string; bgColor: string; textColor: string }> = {
  ALL: { label: 'Tất cả', icon: Users, color: 'text-gray-600', bgColor: 'bg-gray-100', textColor: 'text-gray-700' },
  STUDENT: { label: 'Học viên', icon: GraduationCap, color: 'text-gray-600', bgColor: 'bg-gray-100', textColor: 'text-gray-700' },
  ADMIN: { label: 'Quản trị', icon: Shield, color: 'text-red-600', bgColor: 'bg-red-100', textColor: 'text-red-700' },
  INSTRUCTOR: { label: 'Giảng viên', icon: Users, color: 'text-blue-600', bgColor: 'bg-blue-100', textColor: 'text-blue-700' },
  AFFILIATE: { label: 'Đối tác', icon: Handshake, color: 'text-green-600', bgColor: 'bg-green-100', textColor: 'text-green-700' },
  COURSE_86_DAYS: { label: 'Coach 1:1', icon: Trophy, color: 'text-purple-600', bgColor: 'bg-purple-100', textColor: 'text-purple-700' },
  UNVERIFIED: { label: 'Chưa xác minh', icon: Mail, color: 'text-orange-600', bgColor: 'bg-orange-100', textColor: 'text-orange-700' },
}

const roleCardColors: Record<string, string> = {
  ADMIN: 'bg-red-100',
  COURSE_86_DAYS: 'bg-gray-100',
  INSTRUCTOR: 'bg-blue-100',
  AFFILIATE: 'bg-green-100',
  STUDENT: 'bg-gray-100',
  UNVERIFIED: 'bg-orange-50',
}

const roleTextColors: Record<string, string> = {
  ADMIN: 'text-red-600',
  COURSE_86_DAYS: 'text-purple-600',
  INSTRUCTOR: 'text-blue-600',
  AFFILIATE: 'text-green-600',
  STUDENT: 'text-gray-900',
  UNVERIFIED: 'text-orange-600',
}

const PAGE_SIZE = 20

function ResendVerifyBtn({ studentId }: { studentId: number }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setStatus('loading')
    setMsg('')
    const res = await resendVerificationAction(studentId)
    if (res.success) {
      setStatus('success')
      setMsg(res.message || 'Đã gửi!')
    } else {
      setStatus('error')
      setMsg(res.error || 'Lỗi')
    }
  }

  if (status === 'success') return <span className="text-[10px] font-bold text-green-600">{msg}</span>
  if (status === 'error') return <span className="text-[10px] font-bold text-red-600">{msg}</span>

  return (
    <button onClick={handleClick} disabled={status === 'loading'}
      className="shrink-0 text-[10px] font-bold text-blue-500 hover:text-blue-700 hover:underline disabled:opacity-50"
    >
      {status === 'loading' ? 'Đang gửi...' : 'Gửi lại'}
    </button>
  )
}

export default function ToolsStudentsPage() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'
  const isTeacher = session?.user?.role === 'TEACHER'
  const isRoot = session?.user?.id === '0'

  const [students, setStudents] = useState<StudentData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRole, setSelectedRole] = useState<string>('ALL')
  const [sortBy, setSortBy] = useState<'createdAt' | 'id'>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [total, setTotal] = useState(0)
  const [roleCounts, setRoleCounts] = useState<Record<string, number>>({})
  const [activityLogTarget, setActivityLogTarget] = useState<{ id: number; name: string } | null>(null)

  const [courses, setCourses] = useState<{ id: number; name_lop: string }[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<number | undefined>(undefined)
  const [showBulkEnroll, setShowBulkEnroll] = useState(false)
  const [bulkResend, setBulkResend] = useState<{ status: 'idle' | 'loading' | 'done'; total: number; sent: number; failed: number; errors: string[] }>({ status: 'idle', total: 0, sent: 0, failed: 0, errors: [] })

  useEffect(() => {
    getAdminCoursesAction().then(res => {
      if (res.success) setCourses((res.courses || []).map((c: any) => ({ id: c.id, name_lop: c.name_lop })))
    })
  }, [])

  const fetchStudents = useCallback(async (pageNum: number = 0) => {
    setLoading(true)
    setError(null)
    try {
      const res = await getStudentsAction(searchQuery, selectedRole as any, pageNum, PAGE_SIZE, sortBy, sortOrder, selectedCourseId)
      if (res.success) {
        setStudents(res.students || [])
        setTotal(res.total || 0)
        setTotalPages(res.totalPages || 0)
        setPage(pageNum)
        if (res.roleCounts) setRoleCounts(res.roleCounts)
      } else {
        setError(res.error || 'Có lỗi xảy ra')
      }
    } catch {
      setError('Lỗi kết nối đến máy chủ')
    }
    setLoading(false)
  }, [searchQuery, selectedRole, sortBy, sortOrder, selectedCourseId])

  const isFirstRender = useRef(true)

  useEffect(() => {
    fetchStudents(0)
  }, [])

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    fetchStudents(0)
  }, [searchQuery, selectedRole, sortBy, sortOrder, selectedCourseId])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const courseIdParam = params.get('courseId')
    if (courseIdParam) {
      setSelectedCourseId(Number(courseIdParam))
    }
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchStudents(0)
  }

  const clearSearch = () => {
    setSearchQuery('')
    fetchStudents(0)
  }

  const handleRoleChange = (role: string) => {
    setSelectedRole(role)
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
    <div className="h-screen bg-gray-50 flex flex-col">
      <MainHeader title="THÀNH VIÊN" toolSlug="students" />

      <div className="shrink-0 bg-white border-b shadow-sm">
        <div className="p-4 space-y-3">
          {isAdmin ? (
            <>
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
              {courses.length > 0 && (
                <select
                  value={selectedCourseId ?? ''}
                  onChange={(e) => setSelectedCourseId(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Tất cả các khóa</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.name_lop}</option>
                  ))}
                </select>
              )}
            </>
          ) : (
            <div className="flex gap-2">
              <div className="flex-1 flex flex-col items-center gap-0.5 px-1 py-2 rounded-xl bg-gray-100 text-gray-600 border-2 border-yellow-400 ring-2 ring-yellow-400 ring-offset-1 shadow-lg">
                <GraduationCap className="w-4 h-4" />
                <span className="text-[9px] font-black uppercase tracking-tight leading-tight">Học viên</span>
                <span className="text-[10px] font-bold">{roleCounts['ALL'] ?? 0}</span>
              </div>

              {courses.length > 0 && (
                <select
                  value={selectedCourseId ?? ''}
                  onChange={(e) => setSelectedCourseId(e.target.value ? Number(e.target.value) : undefined)}
                  className="flex-1 px-2 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Tất cả các khóa</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.name_lop}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <form onSubmit={handleSearch} className="flex-1 relative">
              <button type="submit" className="absolute left-3 top-1/2 -translate-y-1/2">
                <Search className="w-4 h-4 text-gray-400" />
              </button>
              <input
                type="text"
                placeholder="Tìm Tên, SĐT, Email..."
                className="w-full pl-10 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button type="button" onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
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
            {isAdmin && (
              <button
                onClick={() => setShowBulkEnroll(true)}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl font-bold text-xs bg-green-500 text-white hover:bg-green-600 transition-all"
              >
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">Đăng ký khóa học từ danh sách</span>
              </button>
            )}
            {isAdmin && (
              <button
                onClick={async () => {
                  setBulkResend({ status: 'loading', total: 0, sent: 0, failed: 0, errors: [] })
                  const res = await resendAllVerificationAction()
                  if (res.success) {
                    setBulkResend({ status: 'done', total: res.total ?? 0, sent: res.sent ?? 0, failed: res.failed ?? 0, errors: res.errors ?? [] })
                  } else {
                    setBulkResend({ status: 'done', total: 0, sent: 0, failed: 0, errors: [res.error || 'Lỗi không xác định'] })
                  }
                }}
                disabled={bulkResend.status === 'loading'}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl font-bold text-xs bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 transition-all"
              >
                <Mail className="w-4 h-4" />
                <span className="hidden sm:inline">{bulkResend.status === 'loading' ? 'Đang gửi...' : 'Xác minh tất cả'}</span>
              </button>
            )}
          </div>
          {bulkResend.status === 'done' && (
            <div className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${bulkResend.failed > 0 ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' : 'bg-green-50 text-green-800 border border-green-200'}`}>
              <Mail className="w-4 h-4 shrink-0" />
              <span>
                Đã gửi: {bulkResend.sent}/{bulkResend.total}
                {bulkResend.failed > 0 && `, Thất bại: ${bulkResend.failed}`}
              </span>
              {bulkResend.errors.length > 0 && (
                <span className="text-[10px] text-gray-500 ml-auto cursor-pointer" onClick={() => alert(bulkResend.errors.join('\n'))}>
                  Xem lỗi
                </span>
              )}
              <button onClick={() => setBulkResend({ status: 'idle', total: 0, sent: 0, failed: 0, errors: [] })} className="ml-auto text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
        <div className="text-xs font-medium text-gray-500 text-center py-2 bg-gray-100 border-t">
          {total > 0 ? `${startItem}-${endItem} / ${total}` : '0'}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {isAdmin && <DeleteByUserSection />}

        {error && (
          <div className="mb-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {error}
          </div>
        )}
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
              const isCoach = student.enrollments?.some((e: any) => e.courseId === 1 && e.status === 'ACTIVE')
              const displayRole = isCoach ? 'COURSE_86_DAYS' : student.role
              const bgColor = roleCardColors[displayRole] || 'bg-gray-100'
              const textColor = roleTextColors[displayRole] || 'text-gray-900'

              return (
                <div key={student.id} className="relative group">
                  <Link
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
                          {student.emailVerified ? (
                            <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">Đã XM</span>
                          ) : (
                            <><span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700">Chờ XM</span><ResendVerifyBtn studentId={student.id} /></>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-500">
                          <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                          <span>{student.phone || 'Chưa có SĐT'}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                  {isRoot && (
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActivityLogTarget({ id: student.id, name: student.name || 'Chưa có tên' }) }}
                      className="absolute top-3 right-3 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-blue-50 transition-all"
                      title="Xem lịch sử hoạt động"
                    >
                      <ScrollText className="w-4 h-4 text-blue-400 hover:text-blue-600" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="shrink-0 bg-white border-t p-3 flex items-center justify-center gap-4">
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

      {showBulkEnroll && (
        <BulkEnrollModal
          isOpen={showBulkEnroll}
          onClose={() => setShowBulkEnroll(false)}
          courses={courses}
          isAdmin={isAdmin}
          isTeacher={isTeacher}
        />
      )}

      {activityLogTarget && (
        <ActivityTimeline
          userId={activityLogTarget.id}
          userName={activityLogTarget.name}
          isOpen={!!activityLogTarget}
          onClose={() => setActivityLogTarget(null)}
        />
      )}
    </div>
  )
}
