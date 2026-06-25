import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const pagePath = searchParams.get('pagePath')

    if (!pagePath) {
      return NextResponse.json(
        { success: false, error: 'Missing pagePath query parameter' },
        { status: 400 }
      )
    }

    const guide = await prisma.assistantGuide.findUnique({
      where: { pagePath },
    })

    if (!guide || !guide.isActive) {
      return NextResponse.json(
        { success: false, error: 'Guide not found for this page' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: guide })
  } catch (error) {
    console.error('Error fetching assistant guide:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
