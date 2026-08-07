import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';
import { revalidateTag } from 'next/cache';

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const siteSettings = await prisma.siteSettings.findFirst({
      include: { theme: true },
    });

    const themes = await prisma.theme.findMany({
      orderBy: { id: 'asc' },
    });

    return NextResponse.json({
      themes,
      siteSettings: siteSettings ? {
        id: siteSettings.id,
        themeId: siteSettings.themeId,
        language: siteSettings.language,
        theme: siteSettings.theme,
      } : null,
    });
  } catch (error) {
    console.error('Error fetching theme settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;

    const body = await request.json();
    const { themeId, language } = body;

    const siteSettings = await prisma.siteSettings.upsert({
      where: { id: 'global' },
      update: {
        themeId: themeId || 'classic',
        language: language || 'vi',
      },
      create: {
        id: 'global',
        themeId: themeId || 'classic',
        language: language || 'vi',
      },
      include: { theme: true },
    });

    revalidateTag('site-theme', { expire: 0 });

    return NextResponse.json({ siteSettings });
  } catch (error) {
    console.error('Error saving theme settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
