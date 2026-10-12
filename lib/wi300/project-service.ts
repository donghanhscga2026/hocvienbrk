import type { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { CrmError } from '@/lib/crm/service'
import { PROJECT_PREFIX, mergeProjects, projectContent, projectControls, projectDefaults, publicProject } from './projects'

export async function readProjects(db: PrismaClient) {
  return mergeProjects(await db.systemConfig.findMany({ where: { key: { startsWith: PROJECT_PREFIX } }, select: { key: true, value: true } }))
}
export async function readPublicProjects(db: PrismaClient) {
  return (await readProjects(db)).filter(project => project.published && project.featured).map(publicProject)
}
export async function projectActor(db: PrismaClient, id: number) {
  if (!Number.isSafeInteger(id) || id < 0) throw new CrmError('Vui lòng đăng nhập.', 401)
  const actor = await db.user.findUnique({ where: { id }, select: { id: true, role: true } })
  if (!actor) throw new CrmError('Vui lòng đăng nhập lại.', 401)
  return actor
}
export async function managedProjects(db: PrismaClient, id: number) {
  const actor = await projectActor(db, id)
  const admin = actor.role === 'ADMIN'
  return { admin, projects: (await readProjects(db)).filter(project => admin || project.ownerId === id) }
}
export async function saveProject(db: PrismaClient, id: number, slug: string, raw: unknown) {
  if (!projectDefaults.some(project => project.slug === slug)) throw new CrmError('Không tìm thấy dự án.', 404)
  const envelope = z.object({ revision: z.number().int().min(0), content: projectContent, controls: projectControls.optional() }).strict().parse(raw)
  return db.$transaction(async tx => {
    // Khóa cùng dự án để việc đổi chủ và lưu nội dung không ghi đè nhau.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${PROJECT_PREFIX + slug}))`
    const actor = await tx.user.findUnique({ where: { id }, select: { id: true, role: true } })
    if (!actor) throw new CrmError('Vui lòng đăng nhập lại.', 401)
    const row = await tx.systemConfig.findUnique({ where: { key: PROJECT_PREFIX + slug } })
    const current = mergeProjects(row ? [row] : []).find(project => project.slug === slug)!
    const admin = actor.role === 'ADMIN'
    if (!admin && current.ownerId !== id) throw new CrmError('Bạn không được sửa dự án này.', 403)
    if (!admin && envelope.controls) throw new CrmError('Chỉ quản trị viên được đổi chủ hoặc chế độ hiển thị.', 403)
    if (envelope.revision !== current.revision) throw new CrmError('Dự án đã được người khác cập nhật. Tải lại trước khi sửa tiếp.', 409)
    const controls = envelope.controls || { ownerId: current.ownerId, published: current.published, featured: current.featured, order: current.order }
    if (controls.ownerId != null && !await tx.user.findUnique({ where: { id: controls.ownerId }, select: { id: true } })) throw new CrmError('Mã thành viên của chủ dự án không tồn tại.')
    if (envelope.content.courseIds.length && await tx.course.count({ where: { id: { in: envelope.content.courseIds } } }) !== envelope.content.courseIds.length) throw new CrmError('Một số khóa học không tồn tại. Vui lòng chọn lại.')
    const value = { ...envelope.content, ...controls, revision: current.revision + 1 }
    await tx.systemConfig.upsert({ where: { key: PROJECT_PREFIX + slug }, create: { key: PROJECT_PREFIX + slug, value }, update: { value } })
    return { slug, ...value }
  }, { timeout: 15000 })
}
