import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const siteSettings = await prisma.siteSettings.findFirst({
      include: { theme: true },
    })

    return NextResponse.json({
      themeId: siteSettings?.themeId || 'classic',
      language: siteSettings?.language || 'vi',
    })
  } catch (error) {
    console.error('Error fetching site settings:', error)
    return NextResponse.json({ themeId: 'classic', language: 'vi' })
  }
}