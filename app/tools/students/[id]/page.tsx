import { auth } from "@/auth"
import Link from "next/link"
import Image from "next/image"
import { redirect } from "next/navigation"
import { getStudentDetailAction } from "@/app/actions/admin-actions"
import MainHeader from "@/components/layout/MainHeader"
import { User, Mail, Phone, GraduationCap, ArrowLeft, CalendarDays } from "lucide-react"

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const studentId = parseInt(id)
  if (isNaN(studentId)) redirect("/tools/students")

  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  const res = await getStudentDetailAction(studentId)
  if (!res.success || !res.user) redirect("/tools/students")

  const student = res.user
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
          </div>
        </div>

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
      </div>
    </div>
  )
}
