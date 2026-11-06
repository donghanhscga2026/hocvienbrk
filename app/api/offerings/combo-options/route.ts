import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { courseEditorActor } from '@/lib/course-page/permissions'
import { offeringDetailsSchema } from '@/lib/offerings/shared'
import { CrmError } from '@/lib/crm/service'

export async function GET(request: Request) {
  try {
    const actor = await courseEditorActor()
    const params = new URL(request.url).searchParams
    const raw = params.get('teacherId')
    const teacherId = actor.role === 'ADMIN' && raw && /^\d+$/.test(raw) ? Number(raw) : actor.id
    const items = await prisma.course.findMany({
      where: {
        teacherId,
        type: { not: 'SYS' },
        OR: [
          { name_lop: { contains: (params.get('q') || '').slice(0, 100), mode: 'insensitive' } },
          { id_khoa: { contains: (params.get('q') || '').slice(0, 100), mode: 'insensitive' } },
        ],
      },
      select: { id: true, name_lop: true, id_khoa: true, productGroup: true, phi_coc: true },
      take: 100,
      orderBy: { updatedAt: 'desc' },
    })
    const metadata = items.length
      ? await prisma.systemConfig.findMany({
          where: { key: { in: items.map((item) => `catalog:offering:${item.id}`) } },
        })
      : []
    const byKey = new Map(metadata.map((row) => [row.key, row.value]))
    return NextResponse.json(
      {
        items: items.filter(item => {
          const details = offeringDetailsSchema.safeParse(byKey.get(`catalog:offering:${item.id}`) || {}).data
          return details?.kind !== 'COMBO' && !(item.productGroup === 'SERVICE' && details?.service?.saleMode === 'QUOTE')
        }),
      },
      { headers: { 'Cache-Control': 'private, no-store' } },
    )
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof CrmError ? error.message : 'Không tải được danh sách.' },
      {
        status: error instanceof CrmError ? error.status : 500,
        headers: { 'Cache-Control': 'private, no-store' },
      },
    )
  }
}
