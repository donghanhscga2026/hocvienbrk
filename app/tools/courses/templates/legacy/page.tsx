import { auth } from '@/auth'
import { notFound, redirect } from 'next/navigation'
import { courseEditorActor } from '@/lib/course-page/permissions'
import LegacyTemplateManager from '@/components/admin/LegacyTemplateManager'

export const metadata = { title: 'Mẫu cũ', robots: { index: false, follow: false } }
export default async function Page({ searchParams }: { searchParams: Promise<{ template?: string }> }) {
  if (!(await auth())?.user) redirect('/login?callbackUrl=%2Ftools%2Fcourses%2Ftemplates%2Flegacy')
  try { if ((await courseEditorActor()).role !== 'ADMIN') notFound() } catch { notFound() }
  const params = await searchParams
  return <LegacyTemplateManager initialId={params.template || ''} />
}
