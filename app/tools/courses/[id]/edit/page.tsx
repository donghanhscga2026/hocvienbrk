import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { notFound } from 'next/navigation'
import { getCoursePage } from '@/app/actions/course-page-actions'
import EditCoursePageForm from './EditCoursePageForm'
import MainHeader from '@/components/layout/MainHeader'

interface EditPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: EditPageProps): Promise<Metadata> {
  const { id } = await params
  const page = await getCoursePage(id)

  return {
    title: page ? `Chỉnh sửa: ${page.name}` : 'Trang Khóa Học'
  }
}

export default async function EditCoursePageLanding({ params }: EditPageProps) {
  const { id } = await params
  const page = await getCoursePage(id)

  if (!page) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MainHeader title="CHỈNH SỬA TRANG KHÓA HỌC" toolSlug="pages" />

      <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <Link
            href="/tools/courses"
            className="inline-flex items-center gap-2 text-xs font-black text-gray-400 uppercase hover:text-purple-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại quản lý khóa học
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Cấu hình Trang Khóa Học</h1>
          <p className="text-sm text-gray-500 mt-1 font-mono font-bold text-purple-600">
            URL: /khoa-hoc/{page.slug}
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 lg:p-10 shadow-xl border border-gray-100">
          <EditCoursePageForm initialPage={page as any} />
        </div>
      </div>
    </div>
  )
}
