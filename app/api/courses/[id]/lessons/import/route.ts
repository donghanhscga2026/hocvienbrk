import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { requireCourseAccessApi } from '@/lib/course/permissions';

// [OPTIMIZE] Nhập danh sách bài học từ CSV/Google Sheet xử lý tuần tự từng
// dòng, có thể vượt giới hạn thời gian mặc định với khoá học nhiều bài.
export const maxDuration = 300;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const courseId = parseInt(id);

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // ✅ ADMIN hoặc TEACHER sở hữu khóa học mới được import bài học (đồng nhất
    // với quyền tạo bài học đơn lẻ ở /api/courses/[id]/lessons)
    const { denied } = await requireCourseAccessApi(course.teacherId);
    if (denied) return denied;

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const mode = formData.get('mode') as string || 'upsert';
    const sourceType = formData.get('sourceType') as string || 'file';
    const sheetUrl = formData.get('sheetUrl') as string;

    let text: string;

    if (sourceType === 'sheet' && sheetUrl) {
      const sheetIdMatch = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (!sheetIdMatch) {
        return NextResponse.json({ error: 'Invalid Google Sheets URL' }, { status: 400 });
      }
      
      const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetIdMatch[1]}/export?format=csv`;
      const sheetRes = await fetch(exportUrl);
      if (!sheetRes.ok) {
        return NextResponse.json({ error: 'Cannot fetch Google Sheet. Make sure the sheet is publicly shared.' }, { status: 400 });
      }
      text = await sheetRes.text();
    } else {
      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }
      text = await file.text();
    }
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

    // [OPTIMIZE] Trước đây mỗi dòng CSV tốn 1-2 lượt query riêng (tìm rồi
    // tạo/cập nhật tuần tự) — khoá học càng nhiều bài càng chậm, dễ vượt thời
    // gian cho phép. Gộp thành: 1 lượt đọc bài học đã có (mode khác 'append'),
    // 1 lượt tạo hàng loạt cho các bài mới, và 1 transaction cho các bài cần
    // cập nhật.
    if (mode === 'append') {
      const maxLesson = await prisma.lesson.findFirst({
        where: { courseId },
        orderBy: { order: 'desc' },
        select: { order: true }
      });
      const startOrder = (maxLesson?.order ?? 0) + 1;

      const result = await prisma.lesson.createMany({
        data: lessons.map((lesson, i) => ({
          courseId,
          title: lesson.title,
          videoUrl: lesson.videoUrl || null,
          content: lesson.content || null,
          order: startOrder + i,
          isDailyChallenge: lesson.isDailyChallenge,
        }))
      });
      created = result.count;
    } else {
      const existingLessons = await prisma.lesson.findMany({
        where: { courseId },
        select: { id: true, order: true }
      });
      const existingByOrder = new Map(existingLessons.map(l => [l.order, l.id]));

      const toCreate: { courseId: number; title: string; videoUrl: string | null; content: string | null; order: number; isDailyChallenge: boolean }[] = [];
      const toUpdate: { id: string; title: string; videoUrl: string | null; content: string | null; isDailyChallenge: boolean }[] = [];

      for (const lesson of lessons) {
        const existingId = existingByOrder.get(lesson.order);
        if (existingId != null) {
          if (mode === 'skip') {
            skipped++;
            continue;
          }
          toUpdate.push({
            id: existingId,
            title: lesson.title,
            videoUrl: lesson.videoUrl || null,
            content: lesson.content || null,
            isDailyChallenge: lesson.isDailyChallenge,
          });
        } else {
          toCreate.push({
            courseId,
            title: lesson.title,
            videoUrl: lesson.videoUrl || null,
            content: lesson.content || null,
            order: lesson.order,
            isDailyChallenge: lesson.isDailyChallenge,
          });
        }
      }

      if (toCreate.length > 0) {
        const result = await prisma.lesson.createMany({ data: toCreate });
        created = result.count;
      }
      if (toUpdate.length > 0) {
        await prisma.$transaction(
          toUpdate.map(u => prisma.lesson.update({
            where: { id: u.id },
            data: {
              title: u.title,
              videoUrl: u.videoUrl,
              content: u.content,
              isDailyChallenge: u.isDailyChallenge,
            }
          }))
        );
        updated = toUpdate.length;
      }
    }

    if (created > 0 || updated > 0) {
      await prisma.course.update({
        where: { id: courseId },
        data: { updatedAt: new Date() }
      })
      revalidatePath('/')
      if (course.id_khoa) {
        revalidatePath(`/courses/${course.id_khoa}/learn`)
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