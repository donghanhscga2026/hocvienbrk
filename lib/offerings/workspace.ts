import 'server-only'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/get-session'
import { requireDomainCourse } from '@/lib/website/domain-context'
import { getCurrentSiteProfile, getCourseWhereForProfile } from '@/lib/site-profile/runtime'
import { readOfferingDetails } from './server'
import { offeringAccess, deliveryStateSchema, type ProductGroup } from './shared'

export class WorkspaceError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
  }
}
export const deliveryKey = (courseId: number, userId: number) => `catalog:delivery:${courseId}:${userId}`
export async function requireOfferingWorkspace(slug: string, group?: Exclude<ProductGroup, 'COURSE'>) {
  await requireDomainCourse(slug)
  const session = await getSession()
  const userId = session?.user?.id == null ? NaN : Number(session.user.id)
  if (!Number.isSafeInteger(userId) || userId < 0) throw new WorkspaceError('Vui lòng đăng nhập.', 401)
  const course = await prisma.course.findUnique({
    where: { id_khoa: slug },
    select: { id: true, id_khoa: true, name_lop: true, productGroup: true, teacher: { select: { name: true } } },
  })
  if (!course || course.productGroup === 'COURSE' || (group && course.productGroup !== group))
    throw new WorkspaceError('Không tìm thấy sản phẩm.', 404)
  const profile = await getCurrentSiteProfile()
  if (profile) {
    const { status: _status, ...scope } = getCourseWhereForProfile(profile)
    void _status
    if (!(await prisma.course.findFirst({ where: { AND: [scope, { id: course.id }] }, select: { id: true } })))
      throw new WorkspaceError('Không tìm thấy sản phẩm.', 404)
  }
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId: course.id } },
    include: { payment: { select: { verifiedAt: true } } },
  })
  const details = await readOfferingDetails(course.id)
  if (!offeringAccess(enrollment, course.productGroup === 'DIGITAL' ? details.accessDays : 0))
    throw new WorkspaceError('Tài khoản chưa có quyền sử dụng hoặc đã hết hạn.', 403)
  if (details.kind === 'COMBO') await (await import('./combo')).syncComboPurchase(enrollment!.id)
  return { course, userId, details, session, profile }
}
export type ResourceSummary = { id: string; title: string; kind: keyof typeof import('./shared').resourceLabels }
export async function workspaceResources(courseId: number, details: Awaited<ReturnType<typeof readOfferingDetails>>) {
  const rows: ResourceSummary[] = details.resources.map((resource, index) => ({
    id: 'resource:' + index,
    title: resource.title,
    kind: resource.kind,
  }))
  if (details.accessUrl)
    rows.unshift({
      id: 'main',
      title: details.kind === 'APP' ? 'Mở ứng dụng' : 'Tài nguyên sản phẩm',
      kind: details.kind === 'APP' ? 'APP' : 'RESOURCE',
    })
  const lessons = await prisma.lesson.findMany({
    where: { courseId },
    select: { id: true, title: true, type: true },
    orderBy: { order: 'asc' },
  })
  for (const lesson of lessons)
    rows.push({ id: 'lesson:' + lesson.id, title: lesson.title, kind: lesson.type === 'VIDEO' ? 'VIDEO' : 'GUIDE' })
  return rows
}
export type WorkspaceResource = {
  title: string
  kind: ResourceSummary['kind']
  url?: string
  viewer?: 'LINK' | 'PDF'
  content?: string | null
  imageUrl?: string | null
  instructions?: string
  guideUrl?: string
  links?: { title: string; url: string }[]
}
export async function readWorkspaceResource(slug: string, id: string): Promise<WorkspaceResource> {
  const { course, details } = await requireOfferingWorkspace(slug)
  if (!details.modules.includes('resources')) throw new WorkspaceError('Mục tài nguyên đã được tắt.', 404)
  if (id === 'main' && details.accessUrl)
    return { title: 'Tài nguyên sản phẩm', kind: details.kind === 'APP' ? 'APP' : 'RESOURCE', url: details.accessUrl }
  if (/^resource:\d+$/.test(id)) {
    const resource = details.resources[Number(id.slice(9))]
    if (resource) {
      if (details.modules.includes('instructions')) return resource
      const { instructions: _instructions, guideUrl: _guideUrl, ...content } = resource
      void _instructions; void _guideUrl
      return content
    }
  }
  if (id.startsWith('lesson:') && id.length < 200) {
    const lesson = await prisma.lesson.findFirst({
      where: { id: id.slice(7), courseId: course.id },
      select: { title: true, type: true, content: true, imageUrl: true, videoUrl: true },
    })
    if (lesson) {
      const links = (lesson.videoUrl || '')
        .split('|')
        .filter(Boolean)
        .flatMap((part, index) => {
          const match = part.match(/^(?:\[([^\]]+)\]|\(([^)]+)\))(.*)$/)
          const url = (match ? match[3] : part).trim()
          return /^https:\/\//i.test(url) ? [{ title: match?.[1] || match?.[2] || `Phần ${index + 1}`, url }] : []
        })
      return {
        title: lesson.title,
        kind: lesson.type === 'VIDEO' ? 'VIDEO' : 'GUIDE',
        content: lesson.content,
        imageUrl: lesson.imageUrl,
        links,
      }
    }
  }
  throw new WorkspaceError('Không tìm thấy tài nguyên.', 404)
}
export async function readDelivery(courseId: number, userId: number) {
  const row = await prisma.systemConfig.findUnique({ where: { key: deliveryKey(courseId, userId) } })
  return row ? deliveryStateSchema.safeParse(row.value).data || null : null
}
