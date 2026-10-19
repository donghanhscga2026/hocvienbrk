import { auth } from '@/auth'
import { notFound, redirect } from 'next/navigation'
import { courseEditorActor } from '@/lib/course-page/permissions'
import CourseHistoryManager from '@/components/admin/CourseHistoryManager'

export const metadata = { title: 'Lịch sử trang', robots: { index: false, follow: false } }
export default async function Page({ searchParams }: { searchParams: Promise<{ version?: string }> }) {
  if (!(await auth())?.user) redirect('/login?callbackUrl=%2Ftools%2Fcourses%2Ftemplates%2Fhistory')
  try { if ((await courseEditorActor()).role !== 'ADMIN') notFound() } catch { notFound() }
  const params = await searchParams
  return <CourseHistoryManager initialId={params.version || ''} />
}
