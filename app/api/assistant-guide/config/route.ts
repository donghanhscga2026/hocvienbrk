import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

const CONFIG_KEY = 'assistant_display_mode'

export async function GET() {
  try {
    const config = await prisma.systemConfig.findUnique({ where: { key: CONFIG_KEY } })
    const displayMode = config?.value as string || 'icon'
    return NextResponse.json({ success: true, data: { displayMode } })
  } catch (error) {
    console.error('Error fetching assistant config:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { displayMode } = body

    if (!displayMode || !['icon', 'avatar'].includes(displayMode)) {
      return NextResponse.json({ success: false, error: 'displayMode must be "icon" or "avatar"' }, { status: 400 })
    }

    await prisma.systemConfig.upsert({
      where: { key: CONFIG_KEY },
      update: { value: displayMode },
      create: { key: CONFIG_KEY, value: displayMode },
    })

    return NextResponse.json({ success: true, data: { displayMode } })
  } catch (error) {
    console.error('Error saving assistant config:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
