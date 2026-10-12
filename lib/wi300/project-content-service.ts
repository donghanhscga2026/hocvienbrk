import type { Prisma, PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { CrmError } from '@/lib/crm/service'
import { PROJECT_PREFIX, mergeProjects, canManageProject, projectContent, projectSlug, type WiProject } from './projects'
import { projectActor } from './project-service'

async function snapshot(tx: Prisma.TransactionClient, id: number) {
  const actor = await tx.user.findUnique({ where: { id }, select: { id: true, role: true } })
  if (!actor) throw new CrmError('Vui lòng đăng nhập lại.', 401)
  const projects = mergeProjects(await tx.systemConfig.findMany({ where: { key: { startsWith: PROJECT_PREFIX } }, select: { key: true, value: true } }))
  return { actor, projects }
}
async function write(tx: Prisma.TransactionClient, project: WiProject) {
  const { slug, ...value } = { ...project, revision: project.revision + 1 }
  await tx.systemConfig.upsert({ where: { key: PROJECT_PREFIX + slug }, create: { key: PROJECT_PREFIX + slug, value }, update: { value } })
}
function allowed(project: WiProject | undefined, id: number, admin: boolean) {
  if (!project) throw new CrmError('Dự án không tồn tại.', 404)
  if (!canManageProject(project, id, admin)) throw new CrmError('Bạn không có quyền quản lý dự án này.', 403)
  return project
}
function version(project: WiProject, revision: number) {
  if (project.revision !== revision) throw new CrmError('Dự án đã thay đổi. Tải lại trước khi lưu.', 409)
}
export async function courseProjectOptions(db: PrismaClient, id: number, courseId: number) {
  const actor = await projectActor(db, id)
  const course = await db.course.findUnique({ where: { id: courseId }, select: { teacherId: true } })
  if (!course) throw new CrmError('Khóa học không tồn tại.', 404)
  if (actor.role !== 'ADMIN' && course.teacherId !== id) throw new CrmError('Bạn không được sửa khóa học này.', 403)
  const { projects } = await snapshot(db, id)
  return projects.filter(project => canManageProject(project, id, actor.role === 'ADMIN')).map(project => ({ slug: project.slug, name: project.name, revision: project.revision, selected: project.courseIds.includes(courseId) }))
}
export async function saveCourseProjects(db: PrismaClient, id: number, courseId: number, raw: unknown) {
  const input = z.object({ projects: z.array(z.object({ slug: projectSlug, revision: z.number().int().min(0), selected: z.boolean() }).strict()).max(100).refine(items => new Set(items.map(item => item.slug)).size === items.length) }).strict().parse(raw)
  return db.$transaction(async tx => {
    // Chung khóa với form dự án: liên kết và nội dung không ghi đè nhau.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${PROJECT_PREFIX}))`
    const { actor, projects } = await snapshot(tx, id)
    const course = await tx.course.findUnique({ where: { id: courseId }, select: { teacherId: true } })
    if (!course) throw new CrmError('Khóa học không tồn tại.', 404)
    if (actor.role !== 'ADMIN' && course.teacherId !== id) throw new CrmError('Bạn không được sửa khóa học này.', 403)
    for (const item of input.projects) {
      const project = allowed(projects.find(project => project.slug === item.slug), id, actor.role === 'ADMIN')
      version(project, item.revision)
      if (project.courseIds.includes(courseId) === item.selected) continue
      if (item.selected && project.courseIds.length >= 100) throw new CrmError('Dự án đã đạt giới hạn 100 khóa học.')
      project.courseIds = item.selected ? [...project.courseIds, courseId] : project.courseIds.filter(value => value !== courseId)
      await write(tx, project)
    }
    // Những dự án không gửi lên giữ nguyên liên kết cũ.
    return { success: true }
  }, { timeout: 15000 })
}

const sourceSchema = z.object({ slug: projectSlug, index: z.number().int().min(0).max(29), revision: z.number().int().min(0) }).strict()
export async function saveOffering(db: PrismaClient, id: number, raw: unknown) {
  const input = z.object({ source: sourceSchema.optional(), target: z.object({ slug: projectSlug, revision: z.number().int().min(0) }).strict().optional(), offering: projectContent.shape.offerings.element.optional(), remove: z.boolean().optional() }).strict().parse(raw)
  if (input.remove ? !input.source : !input.target || !input.offering) throw new CrmError('Thiếu thông tin sản phẩm / dịch vụ.')
  return db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${PROJECT_PREFIX}))`
    const { actor, projects } = await snapshot(tx, id)
    const admin = actor.role === 'ADMIN'
    const source = input.source ? allowed(projects.find(project => project.slug === input.source!.slug), id, admin) : null
    if (source && input.source) {
      version(source, input.source.revision)
      if (!source.offerings[input.source.index]) throw new CrmError('Nội dung không còn tồn tại. Tải lại.', 409)
    }
    const target = !input.remove && input.target ? allowed(projects.find(project => project.slug === input.target!.slug), id, admin) : null
    if (target && input.target) version(target, input.target.revision)
    if (target && target !== source && target.offerings.length >= 30) throw new CrmError('Dự án đã đạt giới hạn 30 sản phẩm / dịch vụ.')
    if (source && input.source) source.offerings.splice(input.source.index, 1)
    if (target && input.offering) {
      // Sửa tại chỗ giữ thứ tự; chuyển dự án thêm vào cuối danh sách mới.
      if (target === source && input.source) target.offerings.splice(input.source.index, 0, input.offering)
      else target.offerings.push(input.offering)
    }
    for (const project of new Set([source, target])) if (project) await write(tx, project)
    return { success: true }
  }, { timeout: 15000 })
}
