import type { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { CrmError } from '@/lib/crm/service'
import { PROJECT_PREFIX, mergeProjects, projectContent, projectControls, projectDefaults, projectSlug, publicProject, projectMembers, canManageProject } from './projects'

export const projectBulkInput = z.object({
  action: z.enum(['publish', 'hide', 'feature', 'unfeature', 'homepage', 'unhomepage', 'delete']),
  projects: z.array(z.object({ slug: projectSlug, revision: z.number().int().min(0) }).strict()).min(1).max(100).refine(items => new Set(items.map(item => item.slug)).size === items.length, 'Dự án bị trùng.'),
}).strict()
export async function bulkProjects(db: PrismaClient, id: number, raw: unknown) {
  const input = projectBulkInput.parse(raw)
  return db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${PROJECT_PREFIX}))`
    const actor = await tx.user.findUnique({ where: { id }, select: { role: true } })
    if (!actor) throw new CrmError('Vui lòng đăng nhập lại.', 401)
    if (actor.role !== 'ADMIN') throw new CrmError('Chỉ quản trị viên được thao tác hàng loạt với dự án.', 403)
    const rows = await tx.systemConfig.findMany({ where: { key: { in: input.projects.map(item => PROJECT_PREFIX + item.slug) } }, select: { key: true, value: true } })
    const current = new Map(mergeProjects(rows).map(project => [project.slug, project]))
    const selected = input.projects.map(item => {
      const project = current.get(item.slug)
      if (!project) throw new CrmError('Có dự án đã bị xóa. Tải lại danh sách trước khi tiếp tục.', 409)
      if (project.revision !== item.revision) throw new CrmError(`Dự án “${project.name}” đã thay đổi. Chưa áp dụng thao tác nào; hãy tải lại.`, 409)
      return project
    })
    const changes = { publish: { published: true }, hide: { published: false }, feature: { featured: true }, unfeature: { featured: false }, homepage: { showOnHomepage: true }, unhomepage: { showOnHomepage: false }, delete: { published: false, featured: false, showOnHomepage: false, deleted: true } }
    const updated = []
    for (const project of selected) {
      const { slug, ...record } = project
      const value = { ...record, ...changes[input.action], revision: project.revision + 1 }
      await tx.systemConfig.upsert({ where: { key: PROJECT_PREFIX + slug }, create: { key: PROJECT_PREFIX + slug, value }, update: { value } })
      updated.push({ slug, ...value })
    }
    return { projects: updated, count: updated.length, action: input.action }
  }, { timeout: 15000 })
}

export async function readProjects(db: PrismaClient) {
  return mergeProjects(await db.systemConfig.findMany({ where: { key: { startsWith: PROJECT_PREFIX } }, select: { key: true, value: true } }))
}
export async function readPublicProjects(db: PrismaClient) {
  // Công khai, tiêu biểu và hiển thị trang chủ là ba lựa chọn độc lập.
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
    const controls = envelope.controls || { ownerId: current.ownerId, published: current.published, featured: current.featured, showOnHomepage: current.showOnHomepage, order: current.order }
    if (controls.ownerId != null && !await tx.user.findUnique({ where: { id: controls.ownerId }, select: { id: true } })) throw new CrmError('Mã thành viên của chủ dự án không tồn tại.')
    if (envelope.content.courseIds.length && await tx.course.count({ where: { id: { in: envelope.content.courseIds } } }) !== envelope.content.courseIds.length) throw new CrmError('Một số khóa học không tồn tại. Vui lòng chọn lại.')
    const addedCourseIds = envelope.content.courseIds.filter(courseId => !current.courseIds.includes(courseId))
    if (!admin && addedCourseIds.length && await tx.course.count({ where: { id: { in: addedCourseIds }, teacherId: id } }) !== addedCourseIds.length) throw new CrmError('Chỉ được thêm khóa học bạn có quyền quản lý.', 403)
    const value = { ...envelope.content, category: envelope.content.category ?? current.category ?? 'OTHER', ...controls, members: envelope.members || current.members || [], revision: current.revision + 1 }
    await tx.systemConfig.upsert({ where: { key: PROJECT_PREFIX + slug }, create: { key: PROJECT_PREFIX + slug, value }, update: { value } })
    return { slug, ...value }
  }, { timeout: 15000 })
}

export async function createProject(db: PrismaClient, id: number, raw: unknown) {
  const input = z.object({
    slug: projectSlug, category: projectContent.shape.category.default('OTHER'), name: projectContent.shape.name, description: projectContent.shape.description,
    introduction: projectContent.shape.introduction.default(''), logo: projectContent.shape.logo.default(''), website: projectContent.shape.website.default(''),
    ownerId: projectControls.shape.ownerId.default(null), published: projectControls.shape.published.default(true),
    featured: projectControls.shape.featured.default(false), showOnHomepage: projectControls.shape.showOnHomepage.default(false), order: projectControls.shape.order.default(100),
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
