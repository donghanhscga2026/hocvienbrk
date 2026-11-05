import { z } from 'zod'
import prisma from '@/lib/prisma'
import { auth } from '@/auth'
import { createRequest } from '@/lib/crm/requests'
import { CrmError } from '@/lib/crm/service'
import { crmBody, crmFailure, crmResponse } from '@/lib/crm/http'
import { requireDomainCourse, requireDomainModule } from '@/lib/website/domain-context'
import { getCurrentDeploymentBrand } from '@/lib/site-profile/deployment-runtime'
import { publicCatalogWhere, readOfferingDetails } from '@/lib/offerings/server'
import { isQuoteService } from '@/lib/offerings/service'
import { resolveAffiliateIdFromCookie } from '@/lib/affiliate/unified-commission'

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const raw = await crmBody(request, 20000)
    const input = z
      .object({
        key: z.uuid(),
        answers: z.record(z.string().max(80), z.string().trim().max(2000)),
        content: z.string().trim().max(2000).default(''),
        consent: z.literal(true),
        website: z.string().max(100).default(''),
      })
      .strict()
      .parse(raw)
    const slug = (await params).slug
    const domain = await requireDomainModule('crm')
    await requireDomainCourse(slug)
    const course = await prisma.course.findFirst({
      where: { AND: [await publicCatalogWhere(), { id_khoa: slug, productGroup: 'SERVICE' }] },
      select: { id: true },
    })
    if (!course) throw new CrmError('Dịch vụ không còn nhận tư vấn.', 404)
    const details = await readOfferingDetails(course.id)
    if (!isQuoteService(details)) throw new CrmError('Dịch vụ không dùng hình thức báo giá riêng.', 400)
    const rows = details
      .service!.questions.map((q) => {
        const value = input.answers[q.id] || ''
        if (q.required && !value) throw new CrmError(`Vui lòng trả lời: ${q.label}`, 400)
        if (value && q.type === 'SELECT' && !q.options.includes(value))
          throw new CrmError(`Lựa chọn không hợp lệ: ${q.label}`, 400)
        if (value && q.type === 'LINK') {
          let valid = false
          try {
            valid = new URL(value).protocol === 'https:'
          } catch {}
          if (!valid) throw new CrmError(`Dùng link HTTPS: ${q.label}`, 400)
        }
        return value ? `${q.label}\n${value}` : ''
      })
      .filter(Boolean)
    const content = ['Yêu cầu tư vấn / báo giá dịch vụ', ...rows, input.content].filter(Boolean).join('\n\n')
    if (content.length > 4000)
      throw new CrmError('Nội dung quá dài. Vui lòng rút gọn các câu trả lời (tổng tối đa 4.000 ký tự).', 400)
    if (!rows.length && !input.content) throw new CrmError('Vui lòng mô tả nhu cầu của bạn.', 400)
    const session = await auth()
    const id = session?.user?.id == null ? null : Number(session.user.id)
    const result = await createRequest(
      prisma,
      {
        key: input.key,
        courseId: course.id,
        category: 'CONSULTATION',
        content,
        consent: true,
        website: input.website,
      },
      id != null && Number.isSafeInteger(id) && id >= 0 ? id : null,
      request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() || 'unknown',
      undefined,
      !!(await getCurrentDeploymentBrand()),
      domain && !domain.affiliate ? { affiliateId: null, refCode: null, disabled: true } : await resolveAffiliateIdFromCookie(),
    )
    return crmResponse(result, 201)
  } catch (error) {
    return crmFailure(error)
  }
}
