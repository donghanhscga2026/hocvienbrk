import 'server-only'
import type { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { getPublicProjects } from '@/lib/wi300/public-projects'
import { getCurrentSiteProfile, getCourseWhereForProfile } from '@/lib/site-profile/runtime'
import { getCurrentDeploymentBrand } from '@/lib/site-profile/deployment-runtime'
import { wi300CoursePreferences, wi300CourseWhere } from '@/lib/wi300/course-visibility'
import { emptyOfferingDetails, offeringDetailsSchema, publicOfferingDetails, type ProductGroup } from './shared'

export const offeringDetailsKey = (id: number) => 'catalog:offering:' + id
export async function readOfferingDetails(id: number, db: Pick<Prisma.TransactionClient, 'systemConfig'> = prisma) {
  const row = await db.systemConfig.findUnique({ where: { key: offeringDetailsKey(id) } })
  return offeringDetailsSchema.safeParse(row?.value || {}).data || { ...emptyOfferingDetails }
}
export async function saveOfferingDetails(db: Prisma.TransactionClient, id: number, group: string, value: unknown, teacherId: number | null) {
  const details = offeringDetailsSchema.parse(value)
  const allowed = group === 'DIGITAL' ? ['COMBO', 'APP', 'EBOOK', 'TEMPLATE', 'RESOURCE', 'OTHER'] : ['COACHING', 'CONSULTING', 'IMPLEMENTATION', 'OTHER']
  if (group !== 'COURSE' && !allowed.includes(details.kind)) throw new Error('Loại nội dung không thuộc nhóm đã chọn.')
  if (details.kind === 'COMBO') await (await import('./combo')).validateCombo(db, id, group, details, teacherId)
  else {
    const previous = await readOfferingDetails(id, db)
    if (previous.kind === 'COMBO') await (await import('./combo')).validateCombo(db, id, group, details, teacherId)
  }
  if (group === 'SERVICE' && details.bookingCode) {
    const session = await db.bookingSession.findUnique({ where: { code: details.bookingCode } })
    if (!session || session.expertId !== teacherId || session.status !== 'ACTIVE' || (session.courseId != null && session.courseId !== id)) throw new Error('Mã lịch hẹn phải đang hoạt động, thuộc chuyên gia phụ trách và chưa gắn với dịch vụ khác.')
    await db.bookingSession.update({ where: { id: session.id }, data: { courseId: id, durationMin: details.durationMin } })
  }
  await db.systemConfig.upsert({ where: { key: offeringDetailsKey(id) }, create: { key: offeringDetailsKey(id), value: details }, update: { value: details } })
}
export async function publicCatalogWhere() {
  const [profile, brand] = await Promise.all([getCurrentSiteProfile(), getCurrentDeploymentBrand()])
  const scope = getCourseWhereForProfile(profile || { userId: 0 })
  return brand ? wi300CourseWhere(scope, await wi300CoursePreferences(prisma), true, []) : scope
}
export async function getOfferingCatalog(group: Exclude<ProductGroup, 'COURSE'>) {
  const items = await prisma.course.findMany({
    where: { AND: [await publicCatalogWhere(), { productGroup: group }] },
    select: { id: true, id_khoa: true, name_lop: true, mo_ta_ngan: true, link_anh_bia: true, phi_coc: true, category: true, courseCategory: { select: { name: true } }, teacher: { select: { name: true } } },
    orderBy: [{ pin: 'asc' }, { updatedAt: 'desc' }],
  })
  const metadata = items.length ? await prisma.systemConfig.findMany({ where: { key: { in: items.map(item => offeringDetailsKey(item.id)) } } }) : []
  const byKey = new Map(metadata.map(row => [row.key, row.value]))
  const projects = await getPublicProjects()
  return items.map(item => ({ ...item, projects: projects.filter(project => project.courseIds.includes(item.id)).map(({ slug, name, logo }) => ({ slug, name, logo })), details: publicOfferingDetails(offeringDetailsSchema.safeParse(byKey.get(offeringDetailsKey(item.id)) || {}).data || emptyOfferingDetails) }))
}
