import { notFound, redirect } from 'next/navigation'
import { courseEditorActor } from '@/lib/course-page/permissions'
import AppFrameDomains from '@/components/admin/settings/AppFrameDomains'

export const dynamic = 'force-dynamic'
export default async function AppFrameDomainsPage() {
  if (process.env.SITE_VARIANT?.trim().toLowerCase() !== 'wi300') notFound()
  try {
    if ((await courseEditorActor()).role !== 'ADMIN') redirect('/tools/settings')
  } catch {
    redirect('/tools/settings')
  }
  return <AppFrameDomains />
}
