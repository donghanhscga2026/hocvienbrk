import { auth } from '@/auth'
import { notFound, redirect } from 'next/navigation'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { getCrmActor } from '@/lib/crm/auth'
import { notificationActor } from '@/lib/app-notifications'
import { requireDomainCourse, requireDomainModule } from '@/lib/website/domain-context'
import { quoteRequest } from '@/lib/offerings/quotes'
import { CrmError } from '@/lib/crm/service'
import MainHeader from '@/components/layout/MainHeader'
import ServiceQuotePanel from './ServiceQuotePanel'
export default async function ServiceQuotePage({ id, staff }: { id: string; staff: boolean }) {
  if (!z.uuid().safeParse(id).success) notFound()
  const session = await auth()
  if (session?.user?.id == null) redirect('/login?callbackUrl=' + encodeURIComponent(staff ? '/tools/service-quotes/' + id : '/my-requests/' + id + '/bao-gia'))
  await requireDomainModule('crm')
  try {
    const actor = staff ? await getCrmActor() : await notificationActor()
    const request = await quoteRequest(prisma, id, actor, staff)
    await requireDomainCourse(request.courseId!)
  } catch (error) { if (error instanceof CrmError && [403, 404].includes(error.status)) notFound(); throw error }
  return <div className="min-h-screen bg-slate-50"><MainHeader title={staff ? 'Báo giá dịch vụ' : 'Báo giá của tôi'} /><ServiceQuotePanel key={id} requestId={id} staff={staff} /></div>
}
