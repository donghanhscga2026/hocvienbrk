import { NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { courseEditorActor } from '@/lib/course-page/permissions'
import { emptyOfferingDetails, offeringDetailsSchema } from '@/lib/offerings/shared'
import { CrmError } from '@/lib/crm/service'
const responseHeaders = { 'Cache-Control': 'private, no-store' }
export async function GET(request: Request) {
  try {
    const actor = await courseEditorActor()
    const ids = z
      .array(z.coerce.number().int().positive())
      .min(1)
      .max(10)
      .parse((new URL(request.url).searchParams.get('ids') || '').split(','))
    const unique = [...new Set(ids)]
    const courses = await prisma.course.findMany({
      where: {
        id: { in: unique },
        productGroup: { in: ['DIGITAL', 'SERVICE'] },
        ...(actor.role === 'ADMIN' ? {} : { teacherId: actor.id }),
      },
      select: {
        id: true,
        productGroup: true,
        phi_coc: true,
        feeType: true,
        teacherBankAccountId: true,
        link_anh_bia: true,
        mo_ta_ngan: true,
        mo_ta_dai: true,
      },
    })
    if (courses.length !== unique.length)
      throw new CrmError('Không có quyền xem thống kê của mục đã chọn.', 403)
    const metadata = await prisma.systemConfig.findMany({
      where: { key: { in: unique.map((id) => `catalog:offering:${id}`) } },
      select: { key: true, value: true },
    })
    const byKey = new Map(metadata.map((row) => [row.key, row.value]))
    const now = Date.now()
    const rows = await Promise.all(
      courses.map(async (course) => {
        const details =
          offeringDetailsSchema.safeParse(byKey.get(`catalog:offering:${course.id}`) || {}).data ||
          emptyOfferingDetails
        const cutoff = new Date(now - details.accessDays * 86400000)
        const [counts, expired, lessons] = await Promise.all([
          prisma.enrollment.groupBy({
            by: ['status'],
            where: { courseId: course.id },
            _count: { _all: true },
          }),
          course.productGroup === 'DIGITAL' && details.accessDays > 0
            ? prisma.enrollment.count({
                where: {
                  courseId: course.id,
                  status: 'ACTIVE',
                  OR: [
                    { activatedAt: { lte: cutoff } },
                    { activatedAt: null, payment: { is: { verifiedAt: { lte: cutoff } } } },
                  ],
                },
              })
            : 0,
          prisma.lesson.count({ where: { courseId: course.id } }),
        ])
        const count = (status: string) => counts.find((row) => row.status === status)?._count._all || 0
        const warnings: string[] = []
        if (!course.link_anh_bia) warnings.push('Chưa có ảnh bìa')
        if (!course.mo_ta_ngan && !course.mo_ta_dai && !details.agenda.length)
          warnings.push('Chưa có nội dung giới thiệu')
        if (course.feeType !== 'MIEN_PHI' && course.phi_coc <= 0) warnings.push('Chưa có giá bán')
        if (course.phi_coc > 0 && !course.teacherBankAccountId) warnings.push('Chưa có tài khoản nhận tiền')
        if (
          course.productGroup === 'DIGITAL' &&
          !details.accessUrl &&
          !details.resources.length &&
          !lessons &&
          !(details.kind === 'COMBO' && details.bundleItems.length >= 2)
        )
          warnings.push('Chưa có nội dung sử dụng')
        if (course.productGroup === 'SERVICE' && details.modules.includes('bookings') && !details.bookingCode)
          warnings.push('Chưa gắn lịch hẹn')
        return {
          id: course.id,
          kind: details.kind,
          pending: count('PENDING'),
          active: Math.max(0, count('ACTIVE') - expired),
          expired,
          total: counts.reduce((sum, row) => sum + row._count._all, 0),
          warnings,
        }
      }),
    )
    return NextResponse.json({ rows }, { headers: responseHeaders })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof CrmError ? error.message : 'Không tải được thống kê quản lý.' },
      { status: error instanceof CrmError ? error.status : 400, headers: responseHeaders },
    )
  }
}
