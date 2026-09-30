import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET() {
  try {
    const tools = await prisma.tool.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    })

    // CRM is built into the app, so its menu entry does not require a DB seed.
    if (!tools.some(tool => tool.slug === 'crm')) tools.push({
      id: -1, slug: 'crm', name: 'CRM — Khách hàng & chăm sóc',
      description: 'Hồ sơ khách, tư vấn, ghi chú và lịch chăm sóc', icon: 'Users',
      url: '/tools/crm', roles: ['ADMIN', 'TEACHER', 'INSTRUCTOR'], order: 100,
      isActive: true, createdAt: new Date(), updatedAt: new Date(),
    })
    return NextResponse.json({ tools })
  } catch (error: unknown) {
    console.error('Tools API Error:', error)
    return NextResponse.json({ error: 'Không thể tải danh sách công cụ.' }, { status: 500 })
  }
}
