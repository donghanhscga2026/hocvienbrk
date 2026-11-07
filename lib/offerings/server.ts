import 'server-only'
import { cache } from 'react'
import type { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { getPublicProjects } from '@/lib/wi300/public-projects'
import { getCurrentSiteProfile, getCourseWhereForProfile } from '@/lib/site-profile/runtime'
import { getCurrentDeploymentBrand } from '@/lib/site-profile/deployment-runtime'
import { wi300CoursePreferences, wi300CourseWhere } from '@/lib/wi300/course-visibility'
import { emptyOfferingDetails, offeringDetailsSchema, parseTrialRecord, publicOfferingDetails, type ProductGroup, type TrialRecord } from './shared'

export const offeringDetailsKey = (id: number) => 'catalog:offering:' + id
async function loadOfferingDetails(id: number, db: Pick<Prisma.TransactionClient, 'systemConfig'>) {
  const row = await db.systemConfig.findUnique({ where: { key: offeringDetailsKey(id) } })
  return offeringDetailsSchema.safeParse(row?.value || {}).data || { ...emptyOfferingDetails }
}
const requestOfferingDetails = cache((id: number) => loadOfferingDetails(id, prisma))
export async function readOfferingDetails(id: number, db?: Pick<Prisma.TransactionClient, 'systemConfig'>) {
  return db ? loadOfferingDetails(id, db) : requestOfferingDetails(id)
}
// Dùng cùng một bản ghi trong metadata, bộ chọn bố cục và trang chi tiết của request.
// Không cache chéo người dùng; không đưa nguồn nội dung riêng tư vào dữ liệu này.
export const getOfferingSalesCourse = cache((slug: string) => prisma.course.findUnique({
  where: { id_khoa: slug },
  select: {
    id: true, id_khoa: true, name_lop: true, productGroup: true, phi_coc: true,
    mo_ta_ngan: true, mo_ta_dai: true, link_anh_bia: true, type: true, feeType: true,
    voucherConfig: true, allowMbvDeduction: true, requiresReferralActivation: true,
    referralActivationThreshold: true, teacher: { select: { name: true } },
    teacherBankAccount: { select: { id: true, accountHolder: true, accountNumber: true, bankName: true, qrCodeUrl: true } },
  },
}))
export async function saveOfferingDetails(db: Prisma.TransactionClient, id: number, group: string, value: unknown, teacherId: number | null) {
  const details = offeringDetailsSchema.parse(value)
  if(group==='SERVICE' && details.service?.saleMode==='QUOTE') {
    const references=await db.systemConfig.findMany({where:{key:{startsWith:'catalog:offering:'}}})
    if(references.some(row=>{const value=offeringDetailsSchema.safeParse(row.value).data;return value?.kind==='COMBO'&&value.bundleItems.some(item=>item.courseId===id)}))throw new Error('Dịch vụ đang nằm trong combo. Gỡ khỏi combo trước khi chuyển sang báo giá riêng.')
  }
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
export const offeringTrialKey = (courseId: number, userId: number) => 'trial:offering:' + courseId + ':' + userId
export async function getTrialRecord(courseId: number, userId: number): Promise<TrialRecord | null> {
  try {
    const row = await prisma.systemConfig.findUnique({ where: { key: offeringTrialKey(courseId, userId) } })
    return parseTrialRecord(row?.value)
  } catch {
    return null
  }
}
// Số suất ưu đãi đầu tiên đã dùng = số ghi danh đã kích hoạt thành công của món này.
export async function getEarlyBirdUsed(courseId: number): Promise<number> {
  return prisma.enrollment.count({
    where: { courseId, status: { in: ['ACTIVE', 'COMPLETED'] } },
  })
}
export const publicCatalogWhere = cache(async () => {
  const [profile, brand] = await Promise.all([getCurrentSiteProfile(), getCurrentDeploymentBrand()])
  const scope = getCourseWhereForProfile(profile || { userId: 0 })
  return brand ? wi300CourseWhere(scope, await wi300CoursePreferences(prisma), true, []) : scope
})
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
