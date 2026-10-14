import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { notFound } from 'next/navigation'
import { getCoursePage } from '@/app/actions/course-page-actions'
import EditCoursePageForm from './EditCoursePageForm'
import ManagementWorkspace from '@/components/layout/ManagementWorkspace'
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
      <MainHeader title="Trang bán khóa học" toolSlug="pages" />

      <ManagementWorkspace active="courses" appearance="forest">
        <div className="mb-6">
          <Link
            href="/tools/courses"
            className="inline-flex items-center gap-2 text-xs font-black text-gray-400 uppercase hover:text-brk-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại quản lý khóa học
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-brk-primary tracking-tight">Trang bán khóa học</h1>
          <p className="mt-1 break-all font-mono text-sm font-semibold text-brk-primary">
            URL: /khoa-hoc/{page.slug}
          </p>
        </div>

        <div className="min-w-0">
          <EditCoursePageForm initialPage={page as any} />
        </div>
      </ManagementWorkspace>
    </div>
  )
}
