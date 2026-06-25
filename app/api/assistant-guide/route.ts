import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const pagePath = searchParams.get('pagePath')
    const id = searchParams.get('id')

    if (id) {
      const guide = await prisma.assistantGuide.findUnique({ where: { id: Number(id) } })
      if (!guide) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
      return NextResponse.json({ success: true, data: guide })
    }

    if (pagePath) {
      const guide = await prisma.assistantGuide.findUnique({ where: { pagePath } })
      if (!guide || !guide.isActive) {
        return NextResponse.json({ success: false, error: 'Guide not found' }, { status: 404 })
      }
      return NextResponse.json({ success: true, data: guide })
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
    const { id, pagePath, title, script, textContent, videoUrl, agentVideoUrl, isActive } = body

    if (!pagePath || !title) {
      return NextResponse.json({ success: false, error: 'Missing required fields: pagePath, title' }, { status: 400 })
    }

    if (id) {
      const guide = await prisma.assistantGuide.update({
        where: { id: Number(id) },
        data: { pagePath, title, script, textContent, videoUrl, agentVideoUrl, isActive },
      })
      return NextResponse.json({ success: true, data: guide })
    }

    const guide = await prisma.assistantGuide.upsert({
      where: { pagePath },
      update: { title, script, textContent, videoUrl, agentVideoUrl, isActive },
      create: { pagePath, title, script, textContent, videoUrl, agentVideoUrl, isActive },
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
