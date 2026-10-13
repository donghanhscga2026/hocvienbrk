import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAdmin } from '@/lib/api-auth'

// GET /api/assistant-guide/steps?guideId=1 — danh sách bước (public, chỉ bước đang bật)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const guideId = searchParams.get('guideId')
    if (!guideId) {
      return NextResponse.json({ success: false, error: 'Missing guideId' }, { status: 400 })
    }
    const steps = await prisma.assistantGuideStep.findMany({
      where: { guideId: Number(guideId), isActive: true },
      orderBy: { stepOrder: 'asc' },
    })
    return NextResponse.json({ success: true, data: steps })
  } catch (error) {
    console.error('Error fetching guide steps:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// POST — tạo mới hoặc cập nhật bước (admin only)
// Body: { id?, guideId, stepOrder, title, body, imageUrl, videoUrl, targetSelector, isActive }
export async function POST(request: Request) {
  const denied = await requireAdmin()
  if (denied) return denied
  try {
    const data = await request.json()
    const { id, guideId, stepOrder, title, body, imageUrl, videoUrl, targetSelector, isActive } = data
    if (!title || !guideId) {
      return NextResponse.json({ success: false, error: 'Thiếu guideId hoặc tiêu đề bước' }, { status: 400 })
    }
    const payload = {
      guideId: Number(guideId),
      stepOrder: Number(stepOrder) || 0,
      title,
      body: body || null,
      imageUrl: imageUrl || null,
      videoUrl: videoUrl || null,
      targetSelector: targetSelector || null,
      isActive: isActive !== false,
    }
    const step = id
      ? await prisma.assistantGuideStep.update({ where: { id: Number(id) }, data: payload })
      : await prisma.assistantGuideStep.create({ data: payload })
    return NextResponse.json({ success: true, data: step })
  } catch (error) {
    console.error('Error saving guide step:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/assistant-guide/steps?id=1 (admin only)
export async function DELETE(request: Request) {
  const denied = await requireAdmin()
  if (denied) return denied
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
    }
    await prisma.assistantGuideStep.delete({ where: { id: Number(id) } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting guide step:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
