import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from '@/auth'
import { canCreateProfile, isProfileTool, normalizeRoles } from '@/lib/auth/roles'
import { getCurrentDeploymentBrand } from '@/lib/site-profile/deployment-runtime'
import { managedProjects } from '@/lib/wi300/project-service'

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
    if (!tools.some(tool => tool.slug === 'dev-flow')) tools.push({
      id: -2, slug: 'dev-flow', name: 'MFC Dev Flow',
      description: 'Quản lý quy trình phát triển với AI', icon: 'Settings',
      url: '/tools/dev-flow', roles: ['ADMIN', 'DEVELOPER'], order: 101,
      isActive: true, createdAt: new Date(), updatedAt: new Date(),
    })
    if (await getCurrentDeploymentBrand()) {
      const session = await auth()
      const id = session?.user?.id == null ? NaN : Number(session.user.id)
      if (Number.isSafeInteger(id) && id >= 0) {
        const managed = await managedProjects(prisma, id)
        if (managed.admin) tools.push({
          id: -4, slug: 'wi-appearance', name: 'Trang', description: 'Quản lý giao diện và SEO các trang Wi', icon: 'PanelsTopLeft',
          url: '/tools/wi-appearance', roles: ['ADMIN'], order: 103, isActive: true, createdAt: new Date(), updatedAt: new Date(),
        })
        if (managed.admin || managed.projects.length) tools.push({
          id: -3, slug: 'wi-projects', name: 'Quản lý dự án', description: 'Quản lý các dự án được giao', icon: 'Handshake',
          url: '/du-an/quan-ly', roles: [], order: 102, isActive: true, createdAt: new Date(), updatedAt: new Date(),
        })
      }
    }
    const session = await auth()
    const visibleTools = tools.filter(tool => !isProfileTool(tool) || canCreateProfile(session?.user?.role)).map(tool => ({
      ...tool,
      roles: ['/tools/site-profiles', '/tools/landings'].includes(tool.url.split(/[?#]/)[0]) ? ['ADMIN']
        : isProfileTool(tool) || tool.url.split('?')[0] === '/tools/courses'
        ? ['ADMIN', 'TEACHER']
        : normalizeRoles(tool.roles),
    }))
    return NextResponse.json({ tools: visibleTools }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error: unknown) {
    console.error('Tools API Error:', error)
    return NextResponse.json({ error: 'Không thể tải danh sách công cụ.' }, { status: 500 })
  }
}
