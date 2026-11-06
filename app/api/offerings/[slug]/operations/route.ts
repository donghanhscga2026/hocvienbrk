import { NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { courseEditorActor } from '@/lib/course-page/permissions'
import { CrmError } from '@/lib/crm/service'
import { publicRequestThread } from '@/lib/crm/request-workflow'
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
      course.productGroup !== 'SERVICE' ||
      (actor.role !== 'ADMIN' && course.teacherId !== actor.id)
    )
      throw new CrmError('Không có quyền quản lý dịch vụ.', 403)
    const query = new URL(request.url).searchParams
    const page = z.coerce
      .number()
      .int()
      .min(1)
      .max(100000)
      .parse(query.get('page') || 1)
    const userId = query.has('userId') ? z.coerce.number().int().min(0).parse(query.get('userId')) : null
    const where = {
      courseId: course.id,
      status: 'ACTIVE' as const,
      ...(query.get('q')
        ? { user: { name: { contains: query.get('q')!.slice(0, 100), mode: 'insensitive' as const } } }
        : {}),
    }
    if (userId != null) {
      const enrollment = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId: course.id } },
        select: { status: true },
      })
      if (enrollment?.status !== 'ACTIVE') throw new CrmError('Khách chưa có quyền dịch vụ.', 404)
    }
    const [customers, total, bookings, requests] = await Promise.all([
      prisma.enrollment.findMany({
        where,
        select: { userId: true, user: { select: { name: true } } },
        orderBy: { userId: 'asc' },
        take: 25,
        skip: (page - 1) * 25,
      }),
      prisma.enrollment.count({ where }),
      userId == null
        ? []
        : prisma.booking.findMany({
            where: { userId, session: { courseId: course.id } },
            select: { id: true, startsAt: true, status: true, session: { select: { title: true } } },
            orderBy: { startsAt: 'desc' },
            take: 20,
          }),
      userId == null
        ? []
        : prisma.crmRequest.findMany({
            where: { userId, courseId: course.id },
            select: {
              id: true,
              category: true,
              status: true,
              content: true,
              publicReply: true,
              updatedAt: true,
              version: true,
              history: true,
            },
            orderBy: { updatedAt: 'desc' },
            take: 20,
          }),
    ])
    return NextResponse.json(
      {
        customers: customers.map((row) => ({
          id: row.userId,
          name: row.user.name || `Khách #${row.userId}`,
        })),
        total,
        page,
        bookings,
        requests: requests.map(({ history, ...row }) => ({ ...row, thread: publicRequestThread(history) })),
      },
      { headers: responseHeaders },
    )
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof CrmError ? error.message : 'Không tải được dữ liệu vận hành.' },
      { status: error instanceof CrmError ? error.status : 400, headers: responseHeaders },
    )
  }
}
