import type { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { CrmError } from '@/lib/crm/service'
import { PROJECT_PREFIX, mergeProjects, projectContent, projectControls, projectDefaults, projectSlug, publicProject, projectMembers, canManageProject } from './projects'

export async function readProjects(db: PrismaClient) {
  return mergeProjects(await db.systemConfig.findMany({ where: { key: { startsWith: PROJECT_PREFIX } }, select: { key: true, value: true } }))
}
export async function readPublicProjects(db: PrismaClient) {
  // Trang chủ giới thiệu các dự án công khai, không yêu cầu nhãn tiêu biểu.
  return (await readProjects(db)).filter(project => project.published).map(publicProject)
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
  const projects = (await readProjects(db)).filter(project => canManageProject(project, id, admin))
  const ownerIds = [...new Set(projects.flatMap(project => [...(project.ownerId == null ? [] : [project.ownerId]), ...(project.members || []).map(member => member.userId)]))]
  const ownerNames = Object.fromEntries(await Promise.all(ownerIds.map(async ownerId => {
    const owner = await db.user.findUnique({ where: { id: ownerId }, select: { name: true } })
    return [String(ownerId), owner?.name || `Thành viên #${ownerId}`]
  })))
  return { admin, actorId: id, projects, ownerNames }
}
export async function saveProject(db: PrismaClient, id: number, slug: string, raw: unknown) {
  projectSlug.parse(slug)
  const envelope = z.object({ revision: z.number().int().min(0), content: projectContent, controls: projectControls.optional(), members: projectMembers.optional() }).strict().parse(raw)
  return db.$transaction(async tx => {
    // Khóa cùng dự án để việc đổi chủ và lưu nội dung không ghi đè nhau.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${PROJECT_PREFIX}))`
    const actor = await tx.user.findUnique({ where: { id }, select: { id: true, role: true } })
    if (!actor) throw new CrmError('Vui lòng đăng nhập lại.', 401)
    const row = await tx.systemConfig.findUnique({ where: { key: PROJECT_PREFIX + slug } })
    const current = mergeProjects(row ? [row] : []).find(project => project.slug === slug)
    if (!current) throw new CrmError('Không tìm thấy dự án hoặc dự án đã bị xóa.', 404)
    const admin = actor.role === 'ADMIN'
    if (!canManageProject(current, id, admin)) throw new CrmError('Bạn không được sửa dự án này.', 403)
    if (envelope.members && !admin && current.ownerId !== id) throw new CrmError('Chỉ chủ dự án hoặc quản trị viên được đổi đội ngũ.', 403)
    if (envelope.members) for (const member of envelope.members) {
      if (!await tx.user.findUnique({ where: { id: member.userId }, select: { id: true } })) throw new CrmError('Mã thành viên trong đội ngũ không tồn tại.')
    }
    if (!admin && envelope.controls) throw new CrmError('Chỉ quản trị viên được đổi chủ hoặc chế độ hiển thị.', 403)
    if (envelope.revision !== current.revision) throw new CrmError('Dự án đã được người khác cập nhật. Tải lại trước khi sửa tiếp.', 409)
    const controls = envelope.controls || { ownerId: current.ownerId, published: current.published, featured: current.featured, order: current.order }
    if (controls.ownerId != null && !await tx.user.findUnique({ where: { id: controls.ownerId }, select: { id: true } })) throw new CrmError('Mã thành viên của chủ dự án không tồn tại.')
    if (envelope.content.courseIds.length && await tx.course.count({ where: { id: { in: envelope.content.courseIds } } }) !== envelope.content.courseIds.length) throw new CrmError('Một số khóa học không tồn tại. Vui lòng chọn lại.')
    const value = { ...envelope.content, ...controls, members: envelope.members || current.members || [], revision: current.revision + 1 }
    await tx.systemConfig.upsert({ where: { key: PROJECT_PREFIX + slug }, create: { key: PROJECT_PREFIX + slug, value }, update: { value } })
    return { slug, ...value }
  }, { timeout: 15000 })
}

export async function createProject(db: PrismaClient, id: number, raw: unknown) {
  const input = z.object({
    slug: projectSlug, name: projectContent.shape.name, description: projectContent.shape.description,
    introduction: projectContent.shape.introduction.default(''), logo: projectContent.shape.logo.default(''), website: projectContent.shape.website.default(''),
    ownerId: projectControls.shape.ownerId.default(null), published: projectControls.shape.published.default(true),
    featured: projectControls.shape.featured.default(false), order: projectControls.shape.order.default(100),
    members: projectMembers.default([]),
  }).strict().parse(raw)
  return db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${PROJECT_PREFIX}))`
    const actor = await tx.user.findUnique({ where: { id }, select: { id: true, role: true } })
    if (!actor) throw new CrmError('Vui lòng đăng nhập lại.', 401)
    if (actor.role !== 'ADMIN') throw new CrmError('Chỉ quản trị viên được thêm dự án.', 403)
    if (projectDefaults.some(project => project.slug === input.slug) || await tx.systemConfig.findUnique({ where: { key: PROJECT_PREFIX + input.slug } })) throw new CrmError('Đường dẫn đã được sử dụng. Vui lòng chọn đường dẫn khác.', 409)
    const { slug, ...text } = input
    if (input.ownerId != null && !await tx.user.findUnique({ where: { id: input.ownerId }, select: { id: true } })) throw new CrmError('Mã thành viên của chủ dự án không tồn tại.')
    for (const member of input.members) {
      if (!await tx.user.findUnique({ where: { id: member.userId }, select: { id: true } })) throw new CrmError('Mã thành viên trong đội ngũ không tồn tại.')
    }
    // Lưu đầy đủ trong một lần; không cần tạo bản nháp rồi nhập lại thông tin.
    const value = { ...text, courseIds: [], offerings: [], revision: 1 }
    await tx.systemConfig.upsert({ where: { key: PROJECT_PREFIX + slug }, create: { key: PROJECT_PREFIX + slug, value }, update: { value } })
    return { slug, ...value }
  }, { timeout: 15000 })
}

export async function deleteProject(db: PrismaClient, id: number, slug: string, raw: unknown) {
  projectSlug.parse(slug)
  const input = z.object({ revision: z.number().int().min(0) }).strict().parse(raw)
  return db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${PROJECT_PREFIX}))`
    const actor = await tx.user.findUnique({ where: { id }, select: { id: true, role: true } })
    if (!actor) throw new CrmError('Vui lòng đăng nhập lại.', 401)
    if (actor.role !== 'ADMIN') throw new CrmError('Chỉ quản trị viên được xóa dự án.', 403)
    const row = await tx.systemConfig.findUnique({ where: { key: PROJECT_PREFIX + slug } })
    const current = mergeProjects(row ? [row] : []).find(project => project.slug === slug)
    if (!current) throw new CrmError('Không tìm thấy dự án.', 404)
    if (current.revision !== input.revision) throw new CrmError('Dự án đã thay đổi. Tải lại trước khi xóa.', 409)
    // Chỉ xóa hồ sơ dự án; không đụng tới tài khoản hoặc khóa học liên quan.
    const { slug: ignored, ...record } = current
    void ignored
    const value = { ...record, published: false, featured: false, deleted: true, revision: current.revision + 1 }
    await tx.systemConfig.upsert({ where: { key: PROJECT_PREFIX + slug }, create: { key: PROJECT_PREFIX + slug, value }, update: { value } })
    return { slug }
  }, { timeout: 15000 })
}
