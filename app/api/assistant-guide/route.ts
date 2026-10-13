import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

const stepsInclude = {
  steps: { where: { isActive: true }, orderBy: { stepOrder: 'asc' as const } },
}

function roleFilter(role: string | null) {
  if (!role) return {}
  // roles rỗng = hiển thị cho mọi vai trò
  return { OR: [{ roles: { isEmpty: true } }, { roles: { has: role } }] }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const pagePath = searchParams.get('pagePath')
    const toolSlug = searchParams.get('toolSlug')
    const id = searchParams.get('id')
    const role = searchParams.get('role')

    if (id) {
      const guide = await prisma.assistantGuide.findUnique({
        where: { id: Number(id) },
        include: stepsInclude,
      })
      if (!guide) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
      return NextResponse.json({ success: true, data: guide })
    }

    if (toolSlug) {
      const guide = await prisma.assistantGuide.findFirst({
        where: { toolSlug, isActive: true, ...roleFilter(role) },
        include: stepsInclude,
      })
      if (!guide) {
        return NextResponse.json({ success: false, error: 'Guide not found' }, { status: 404 })
      }
      return NextResponse.json({ success: true, data: guide })
    }

    if (pagePath) {
      const [exactGuide, toolGuide] = await Promise.all([
        prisma.assistantGuide.findFirst({
          where: { pagePath, isActive: true, ...roleFilter(role) },
          include: stepsInclude,
        }),
        prisma.assistantGuide.findFirst({
          where: { toolSlug: pagePath.replace('/tools/', ''), isActive: true, ...roleFilter(role) },
          include: stepsInclude,
        }),
      ])
      let pageGuide = exactGuide
      if (!pageGuide) {
        // Khớp route động: guide lưu "/khoa-hoc/[id]" khớp "/khoa-hoc/BRK01"
        const patternGuides = await prisma.assistantGuide.findMany({
          where: { pagePath: { contains: '[' }, isActive: true, ...roleFilter(role) },
          include: stepsInclude,
        })
        pageGuide = patternGuides.find(g => {
          const regex = new RegExp('^' + g.pagePath!.replace(/\[.*?\]/g, '[^/]+') + '$')
          return regex.test(pagePath)
        }) || null
      }
      return NextResponse.json({ success: true, data: { pageGuide: pageGuide || null, toolGuide: toolGuide || null } })
    }

    const guides = await prisma.assistantGuide.findMany({
      orderBy: { pagePath: 'asc' },
      include: { _count: { select: { steps: true } } },
    })
    return NextResponse.json({ success: true, data: guides })
  } catch (error) {
    console.error('Error fetching assistant guide:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { id, pagePath, title, script, textContent, videoUrl, agentVideoUrl, toolSlug, sections, roles, isActive } = body

    if (!title || (!pagePath && !toolSlug)) {
      return NextResponse.json({ success: false, error: 'Missing required fields: title, and pagePath or toolSlug' }, { status: 400 })
    }

    const data = {
      pagePath, title, script, textContent, videoUrl, agentVideoUrl, toolSlug, sections,
      roles: Array.isArray(roles) ? roles : [],
      isActive,
    }

    if (id) {
      const guide = await prisma.assistantGuide.update({
        where: { id: Number(id) },
        data,
      })
      return NextResponse.json({ success: true, data: guide })
    }

    const existing = pagePath
      ? await prisma.assistantGuide.findFirst({ where: { pagePath } })
      : await prisma.assistantGuide.findFirst({ where: { toolSlug } })

    if (existing) {
      const guide = await prisma.assistantGuide.update({
        where: { id: existing.id },
        data,
      })
      return NextResponse.json({ success: true, data: guide })
    }

    const guide = await prisma.assistantGuide.create({
      data: { ...data, pagePath: pagePath || null },
    })
    return NextResponse.json({ success: true, data: guide })
  } catch (error) {
    console.error('Error saving assistant guide:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
    }
    await prisma.assistantGuide.delete({ where: { id: Number(id) } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting assistant guide:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
