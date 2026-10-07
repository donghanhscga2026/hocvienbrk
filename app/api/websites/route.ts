import prisma from '@/lib/prisma'
import {FREE_DESIGN_ENABLED,FREE_DESIGN_MESSAGE} from '@/lib/website/free-design'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { crmBody, crmResponse } from '@/lib/crm/http'
import { websiteFailure } from '@/lib/website/http'
import { CrmError } from '@/lib/crm/service'
import { ownedProfile, websiteData } from '@/lib/website/server'
import { blankDocument, parseDocument, walkNodes } from '@/lib/website/document'
import { canUseCrm } from '@/lib/crm/shared'
import { COURSE_TEMPLATE_LIBRARY } from '@/lib/course-page/templates'
import { adaptCourseTemplate } from '@/lib/website/course-template'

export async function GET() {
  try {
    const profile = await ownedProfile()
    if(!FREE_DESIGN_ENABLED) throw new CrmError(FREE_DESIGN_MESSAGE,410)
    const [row, data] = await Promise.all([prisma.siteWebsite.findUnique({ where: { profileId: profile.id } }), websiteData(profile)])
    const templates = COURSE_TEMPLATE_LIBRARY.map(t => ({ key: t.key, name: t.name, ...adaptCourseTemplate(t.key, profile.title || 'Website của tôi') }))
    return crmResponse({ profile: { slug: profile.slug, isActive: profile.isActive, canUseCrm: !!profile.user && canUseCrm(profile.user.role) }, document: row?.draft || blankDocument(profile.title || 'Website của tôi'), revision: row?.revision ?? -1, history: row?.history || [], published: !!row?.published, data, templates })
  } catch(e) { return websiteFailure(e) }
}
const command = z.object({ action: z.enum(['save', 'publish', 'unpublish', 'restore']), revision: z.number().int().min(-1), document: z.unknown().optional(), historyIndex: z.number().int().min(0).max(9).optional() }).strict()
export async function POST(request: Request) {
  try {
    const profile = await ownedProfile()
    if(!FREE_DESIGN_ENABLED) throw new CrmError(FREE_DESIGN_MESSAGE,410)
    const input = command.parse(await crmBody(request, 700000))
    const doc = input.action === 'save' || input.action === 'publish' ? parseDocument(input.document) : null
    if(input.action === 'publish' && doc?.pages.some(page => walkNodes(page.nodes).some(node => node.kind === 'course-hero' && node.courseIds.length !== 1))) throw new CrmError('Chọn một khóa học chính trước khi xuất bản.',400)
    const result = await prisma.$transaction(async tx => {
      const fresh = await tx.siteProfile.findFirst({ where: { id: profile.id, userId: profile.userId }, include: { user: { select: { role: true } } } })
      if(!fresh) throw new CrmError('Bạn không còn quyền chỉnh sửa trang này.',403)
      const current = await tx.siteWebsite.findUnique({ where: { profileId: profile.id } })
      if((current?.revision ?? -1) !== input.revision) throw new CrmError('Bản nháp đã được sửa ở cửa sổ khác. Xuất JSON để giữ thay đổi rồi tải lại.', 409)
      if(input.action === 'publish' && !fresh.isActive) throw new CrmError('Trang cần được quản trị viên kích hoạt trước khi xuất bản.', 403)
      if(input.action === 'publish' && doc?.pages.some(p => walkNodes(p.nodes).some(n => n.kind === 'form')) && (!fresh.user || !canUseCrm(fresh.user.role))) throw new CrmError('Tài khoản cần quyền CRM để sử dụng form tư vấn. Hãy bỏ khối form hoặc nhờ quản trị viên cấp quyền.',403)
      const history = Array.isArray(current?.history) ? current.history : []
      const restored = input.action === 'restore' ? (history[input.historyIndex ?? -1] as { document?: unknown } | undefined)?.document : null
      if(input.action === 'restore' && !restored) throw new CrmError('Không tìm thấy phiên bản.', 404)
      const draft = doc || (restored ? parseDocument(restored) : current?.draft)
      if(!draft) throw new CrmError('Hãy lưu thiết kế trước.')
      const published = input.action === 'publish' ? doc : input.action === 'unpublish' ? Prisma.DbNull : undefined
      const nextHistory = input.action === 'publish' ? [{ date: new Date().toISOString(), document: doc }, ...history].slice(0,10) : history
      if(!current) return tx.siteWebsite.create({ data: { profileId: profile.id, draft: draft as Prisma.InputJsonValue, published: published as Prisma.InputJsonValue | undefined, history: nextHistory as Prisma.InputJsonValue, revision: 0 } })
      const updated = await tx.siteWebsite.updateMany({ where: { profileId: profile.id, revision: input.revision }, data: { draft: draft as Prisma.InputJsonValue, published: published as Prisma.InputJsonValue | typeof Prisma.DbNull | undefined, history: nextHistory as Prisma.InputJsonValue, revision: { increment: 1 } } })
      if(!updated.count) throw new CrmError('Bản nháp đã thay đổi. Hãy tải lại.', 409)
      return tx.siteWebsite.findUniqueOrThrow({ where: { profileId: profile.id } })
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    return crmResponse({ revision: result.revision, document: result.draft, history: result.history, published: !!result.published })
  } catch(e) { return websiteFailure(e) }
}
