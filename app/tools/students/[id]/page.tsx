import { auth } from "@/auth"
import Link from "next/link"
import Image from "next/image"
import { redirect } from "next/navigation"
import { getStudentDetailAction, getStudentEmailLogsAction } from "@/app/actions/admin-actions"
import MainHeader from "@/components/layout/MainHeader"
import { User, Mail, Phone, GraduationCap, ArrowLeft, CalendarDays, ShieldCheck, ShieldX, CheckCircle, XCircle, Clock } from "lucide-react"
import ResendVerificationButton from "./ResendVerificationButton"

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const studentId = parseInt(id)
  if (isNaN(studentId)) redirect("/tools/students")

  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  const res = await getStudentDetailAction(studentId)
  if (!res.success || !res.user) redirect("/tools/students")

  const student = res.user
  const logsRes = await getStudentEmailLogsAction(studentId)
  const emailLogs: any[] = logsRes.success && logsRes.logs ? logsRes.logs : []
  const roleLabels: Record<string, string> = {
    ADMIN: "Quản trị",
    STUDENT: "Học viên",
    INSTRUCTOR: "Giảng viên",
    AFFILIATE: "Đối tác",
    TEACHER: "Giáo viên",
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <MainHeader title="CHI TIẾT HỌC VIÊN" toolSlug="students" />

      <div className="p-4">
        <Link
          href="/tools/students"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại danh sách</span>
        </Link>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
          <div className="flex flex-col items-center">
            {student.image ? (
              <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-gray-100">
                <Image
                  src={student.image}
                  alt={student.name || "Avatar"}
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center border-4 border-gray-100">
                <User className="w-10 h-10 text-gray-400" />
              </div>
            )}

            <h1 className="text-xl font-bold text-gray-900 mt-4">{student.name || "Chưa có tên"}</h1>
            <span className="text-sm font-mono text-gray-400">#{student.id}</span>
          </div>

          <div className="mt-6 space-y-3 text-left">
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl">
              <Mail className="w-5 h-5 text-gray-400 shrink-0" />
              <span className="text-sm text-gray-700">{student.email}</span>
            </div>

            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl">
              <Phone className="w-5 h-5 text-gray-400 shrink-0" />
              <span className="text-sm text-gray-700">{student.phone || "Chưa có SĐT"}</span>
            </div>

            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl">
              <GraduationCap className="w-5 h-5 text-gray-400 shrink-0" />
              <span className="text-sm text-gray-700">
                {roleLabels[student.role] || student.role}
              </span>
            </div>

            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl">
              <CalendarDays className="w-5 h-5 text-gray-400 shrink-0" />
              <span className="text-sm text-gray-700">
                Tham gia từ: {new Date(student.createdAt).toLocaleDateString("vi-VN")}
              </span>
            </div>

            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl">
              {student.emailVerified ? (
                <ShieldCheck className="w-5 h-5 text-green-500 shrink-0" />
              ) : (
                <ShieldX className="w-5 h-5 text-red-400 shrink-0" />
              )}
              <div className="flex-1 flex items-center justify-between">
                <span className="text-sm text-gray-700">
                  Email xác minh
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  student.emailVerified
                    ? 'bg-green-100 text-green-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {student.emailVerified ? 'Đã xác minh' : 'Chờ xác minh'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {!student.emailVerified && (
          <div className="mt-4">
            <ResendVerificationButton studentId={student.id} studentEmail={student.email || ''} />
          </div>
        )}

        {student.enrollments && student.enrollments.length > 0 && (
          <div className="mt-4">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
              Khóa học đã đăng ký
            </h2>
            <div className="space-y-2">
              {student.enrollments.map((enrollment: any) => (
                <div
                  key={enrollment.id}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
                    <GraduationCap className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate">
                      {enrollment.course.name_lop}
                    </p>
                    <p className="text-xs text-gray-400">
                      {enrollment._count.lessonProgress} bài đã hoàn thành
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
            Lịch sử gửi email
          </h2>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            {emailLogs.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Chưa có email nào được gửi</p>
            ) : (
              <div className="space-y-2">
                {emailLogs.map((log: any) => {
                  const providerColors: Record<string, string> = {
                    brevo: 'bg-blue-100 text-blue-700',
                    gmail: 'bg-red-100 text-red-700',
                    resend: 'bg-purple-100 text-purple-700',
                  }
                  const statusIcon = log.status === 'sent'
                    ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                    : <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                  return (
                    <div key={log.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                      {statusIcon}
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${providerColors[log.provider] || 'bg-gray-100 text-gray-600'}`}>
                        {log.provider.toUpperCase()}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-700 truncate">{log.email}</p>
                        {log.messageId && (
                          <p className="text-[10px] text-gray-400 truncate font-mono">ID: {log.messageId}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span className="text-[10px] text-gray-500">
                          {new Date(log.createdAt).toLocaleString('vi-VN')}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
