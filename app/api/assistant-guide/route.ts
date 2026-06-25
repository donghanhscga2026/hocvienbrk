import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const pagePath = searchParams.get('pagePath')
    const toolSlug = searchParams.get('toolSlug')
    const id = searchParams.get('id')

    if (id) {
      const guide = await prisma.assistantGuide.findUnique({ where: { id: Number(id) } })
      if (!guide) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
      return NextResponse.json({ success: true, data: guide })
    }

    if (toolSlug) {
      const guide = await prisma.assistantGuide.findFirst({ where: { toolSlug, isActive: true } })
      if (!guide) {
        return NextResponse.json({ success: false, error: 'Guide not found' }, { status: 404 })
      }
      return NextResponse.json({ success: true, data: guide })
    }

    if (pagePath) {
      const [pageGuide, toolGuide] = await Promise.all([
        prisma.assistantGuide.findFirst({ where: { pagePath, isActive: true } }),
        prisma.assistantGuide.findFirst({ where: { toolSlug: pagePath.replace('/tools/', ''), isActive: true } }),
      ])
      return NextResponse.json({ success: true, data: { pageGuide: pageGuide || null, toolGuide: toolGuide || null } })
    }

    const guides = await prisma.assistantGuide.findMany({ orderBy: { pagePath: 'asc' } })
    return NextResponse.json({ success: true, data: guides })
  } catch (error) {
    console.error('Error fetching assistant guide:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { id, pagePath, title, script, textContent, videoUrl, agentVideoUrl, toolSlug, sections, isActive } = body

    if (!title || (!pagePath && !toolSlug)) {
      return NextResponse.json({ success: false, error: 'Missing required fields: title, and pagePath or toolSlug' }, { status: 400 })
    }

    if (id) {
      const guide = await prisma.assistantGuide.update({
        where: { id: Number(id) },
        data: { pagePath, title, script, textContent, videoUrl, agentVideoUrl, toolSlug, sections, isActive },
      })
      return NextResponse.json({ success: true, data: guide })
    }

    const existing = pagePath
      ? await prisma.assistantGuide.findFirst({ where: { pagePath } })
      : await prisma.assistantGuide.findFirst({ where: { toolSlug } })

    if (existing) {
      const guide = await prisma.assistantGuide.update({
        where: { id: existing.id },
        data: { pagePath, title, script, textContent, videoUrl, agentVideoUrl, toolSlug, sections, isActive },
      })
      return NextResponse.json({ success: true, data: guide })
    }

    const guide = await prisma.assistantGuide.create({
      data: { pagePath: pagePath || null, title, script, textContent, videoUrl, agentVideoUrl, toolSlug, sections, isActive },
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
