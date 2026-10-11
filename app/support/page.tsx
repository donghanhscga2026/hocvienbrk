import Link from 'next/link'
import { auth } from '@/auth'
import CrmRequestForm from '@/components/crm/CrmRequestForm'
import { requireDomainModule } from '@/lib/website/domain-context'

export default async function SupportPage() {
  await requireDomainModule('crm')
  const session = await auth()
  return <main className="mx-auto max-w-2xl space-y-5 p-4 sm:p-8"><h1 className="text-2xl font-bold">Hỗ trợ & phản hồi</h1><p className="text-sm text-brk-muted">Gửi hỗ trợ chung hoặc góp ý. Câu hỏi về bài học nên gửi từ khóa học để giáo viên tiếp nhận đúng nội dung.</p><Link className="inline-flex min-h-11 items-center font-semibold text-brk-primary" href="/my-requests">Xem yêu cầu của tôi →</Link><CrmRequestForm signedIn={!!session?.user} initiallyOpen hideTrigger defaultCategory="SUPPORT" /></main>
}
