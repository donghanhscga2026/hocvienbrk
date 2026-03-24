import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { Role } from '@prisma/client';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user?.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const courseId = parseInt(id);

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const mode = formData.get('mode') as string || 'upsert';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    let text = await file.text();
    // Remove BOM if present
    if (text.charCodeAt(0) === 0xFEFF) {
      text = text.slice(1);
    }
    // Normalize line endings
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Parse CSV properly - handle quoted fields with newlines
    const rows = parseCSV(text);
    
    if (rows.length < 2) {
      return NextResponse.json({ error: 'File empty or invalid format' }, { status: 400 });
    }

    const headers = rows[0].map((h: string) => h.trim().toLowerCase());
    const dataRows = rows.slice(1);

    const requiredHeaders = ['order', 'title'];
    for (const reqHeader of requiredHeaders) {
      if (!headers.includes(reqHeader)) {
        return NextResponse.json({ error: `Missing required header: ${reqHeader}` }, { status: 400 });
      }
    }

    const lessons: Array<{
      order: number;
      title: string;
      videoUrl?: string;
      content?: string;
      isDailyChallenge: boolean;
    }> = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      
      if (row.length < headers.length) continue;

      const rowData: any = {};
      headers.forEach((header: string, idx: number) => {
        rowData[header] = row[idx]?.trim() || '';
      });

      const order = parseInt(rowData.order);
      if (isNaN(order)) continue;

      lessons.push({
        order,
        title: rowData.title || `Bài ${order}`,
        videoUrl: rowData.videourl || undefined,
        content: rowData.content || undefined,
        isDailyChallenge: rowData.isdailychallenge?.toLowerCase() === 'true',
      });
    }

    if (lessons.length === 0) {
      return NextResponse.json({ error: 'No valid lessons found' }, { status: 400 });
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const lesson of lessons) {
      const existingLesson = await prisma.lesson.findFirst({
        where: { courseId, order: lesson.order }
      });

      if (existingLesson) {
        if (mode === 'skip') {
          skipped++;
          continue;
        }
        
        await prisma.lesson.update({
          where: { id: existingLesson.id },
          data: {
            title: lesson.title,
            videoUrl: lesson.videoUrl || null,
            content: lesson.content || null,
            isDailyChallenge: lesson.isDailyChallenge,
          }
        });
        updated++;
      } else {
        await prisma.lesson.create({
          data: {
            courseId,
            title: lesson.title,
            videoUrl: lesson.videoUrl || null,
            content: lesson.content || null,
            order: lesson.order,
            isDailyChallenge: lesson.isDailyChallenge,
          }
        });
        created++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Import completed: ${created} created, ${updated} updated, ${skipped} skipped`,
      stats: { created, updated, skipped, total: lessons.length }
    });

  } catch (error: any) {
    console.error('Import Lessons Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        currentCell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentCell);
      currentCell = '';
    } else if (char === '\n' && !inQuotes) {
      currentRow.push(currentCell);
      rows.push(currentRow);
      currentRow = [];
      currentCell = '';
    } else if (char === '\r' && !inQuotes) {
      // Skip \r
    } else {
      currentCell += char;
    }
  }
  
  // Push last cell and row
  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }
  
  return rows;
}