import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { courseEditorActor } from '@/lib/course-page/permissions'
import { readOfferingDetails } from '@/lib/offerings/server'
import { offeringAccess } from '@/lib/offerings/shared'
import { CrmError } from '@/lib/crm/service'
const responseHeaders = { 'Cache-Control': 'private, no-store' }
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const actor = await courseEditorActor()
    const course = await prisma.course.findUnique({
      where: { id_khoa: (await params).slug },
      select: { id: true, teacherId: true, productGroup: true },
    })
    if (
      !course ||
      course.productGroup === 'COURSE' ||
      (actor.role !== 'ADMIN' && course.teacherId !== actor.id)
    )
      throw new CrmError('Không có quyền quản lý khách hàng.', 403)
    const query = new URL(request.url).searchParams
    const page = z.coerce
      .number()
      .int()
      .min(1)
      .max(100000)
      .parse(query.get('page') || 1)
    const state = z
      .enum(['ALL', 'PENDING', 'ACTIVE', 'EXPIRED', 'INACTIVE'])
      .parse(query.get('state') || 'ALL')
    const details = await readOfferingDetails(course.id)
    const days = course.productGroup === 'DIGITAL' ? details.accessDays : 0
    const now = Date.now(),
      cutoff = new Date(now - days * 86400000)
    const expired: Prisma.EnrollmentWhereInput = days
      ? {
          OR: [
            { activatedAt: { lte: cutoff } },
            { activatedAt: null, payment: { is: { verifiedAt: { lte: cutoff } } } },
          ],
        }
      : { id: -1 }
    const where: Prisma.EnrollmentWhereInput = {
      courseId: course.id,
      ...(query.get('q')
        ? { user: { name: { contains: query.get('q')!.slice(0, 100), mode: 'insensitive' } } }
        : {}),
      ...(state === 'PENDING'
        ? { status: 'PENDING' }
        : state === 'INACTIVE'
          ? { status: { in: ['REJECTED', 'CANCELLED'] } }
          : state === 'ACTIVE'
            ? { status: 'ACTIVE', NOT: expired }
            : state === 'EXPIRED'
              ? { status: 'ACTIVE', AND: [expired] }
              : {}),
    }
    const [rows, total] = await Promise.all([
      prisma.enrollment.findMany({
        where,
        select: {
          id: true,
          userId: true,
          status: true,
          activatedAt: true,
          payment: { select: { verifiedAt: true } },
          user: { select: { name: true } },
        },
        orderBy: { id: 'desc' },
        take: 25,
        skip: (page - 1) * 25,
      }),
      prisma.enrollment.count({ where }),
    ])
    return NextResponse.json(
      {
        total,
        rows: rows.map((row) => {
          const activated = row.activatedAt || row.payment?.verifiedAt
          return {
            id: row.id,
            userId: row.userId,
            name: row.user.name || `Khách #${row.userId}`,
            state:
              row.status === 'PENDING'
                ? 'PENDING'
                : row.status !== 'ACTIVE'
                  ? 'INACTIVE'
                  : offeringAccess(row, days, now)
                    ? 'ACTIVE'
                    : 'EXPIRED',
            activatedAt: activated,
            expiresAt:
              days && activated ? new Date(activated.getTime() + days * 86400000).toISOString() : null,
          }
        }),
      },
      { headers: responseHeaders },
    )
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof CrmError ? error.message : 'Không tải được danh sách khách hàng.' },
      { status: error instanceof CrmError ? error.status : 400, headers: responseHeaders },
    )
  }
}
