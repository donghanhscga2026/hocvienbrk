/**
 * Care Engine GĐ3 — Second Brain theo khóa: nạp nguồn tri thức + cache.
 * Lõi BM25 thuần nằm ở lib/care/brain-core.ts (tái xuất tại đây).
 *
 * Nguồn (chỉ đọc, không migration — chỉ mục dựng trong bộ nhớ, cache
 * theo khóa TTL 10 phút, làm mới qua compile hoặc tự hết hạn):
 * - Bài học: tiêu đề + nội dung văn bản (đã gỡ thẻ HTML).
 * - Đoạn bài giảng LessonSegment (smart-library GĐ1, trừ bản DRAFT):
 *   tiêu đề, tóm tắt, từ khóa, mốc giây để trích dẫn đúng phút.
 * - TranscriptCue: gộp theo đoạn, mốc giây của câu đầu.
 * - Q&A đã trả lời thật: CrmRequest có publicReply của chính khóa đó.
 */
import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import {
  buildIndex,
  type BrainChunk,
  type BrainIndex,
} from './brain-core'

export * from './brain-core'

export interface BrainStats {
  lessons: number
  segments: number
  transcriptChunks: number
  qaPairs: number
  chunks: number
  version: number
  builtAt: string
}

function stripHtml(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&amp;|&lt;|&gt;|&quot;|&#39;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const MAX_CHUNK_CHARS = 4000
const CACHE_TTL_MS = 10 * 60 * 1000

/** Đọc toàn bộ nguồn tri thức của 1 khóa từ DB và dựng chunk. Chỉ đọc. */
export async function loadCourseChunks(courseId: number) {
  const [lessons, segments, requests] = await Promise.all([
    prisma.lesson.findMany({
      where: { courseId },
      select: { id: true, title: true, content: true },
      orderBy: { order: 'asc' },
    }),
    prisma.lessonSegment.findMany({
      where: { lesson: { courseId }, status: { not: 'DRAFT' } },
      select: {
        id: true, lessonId: true, title: true, summary: true, keywords: true, startSec: true,
        lesson: { select: { title: true } },
      },
      orderBy: [{ lessonId: 'asc' }, { order: 'asc' }],
    }),
    prisma.crmRequest.findMany({
      where: { courseId, publicReply: { not: '' } },
      select: { id: true, content: true, publicReply: true, lessonId: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
  ])

  const chunks: BrainChunk[] = []
  for (const lesson of lessons) {
    const text = stripHtml(lesson.content || '')
    if (text.length >= 40) {
      chunks.push({
        id: `lesson:${lesson.id}`, courseId, lessonId: lesson.id,
        lessonTitle: lesson.title, sourceType: 'LESSON', text: text.slice(0, MAX_CHUNK_CHARS),
      })
    }
  }
  for (const seg of segments) {
    const text = [seg.summary || '', (seg.keywords || []).join(', ')].join(' ').trim()
    if (text.length >= 10) {
      chunks.push({
        id: `segment:${seg.id}`, courseId, lessonId: seg.lessonId,
        lessonTitle: seg.lesson.title, sourceType: 'SEGMENT',
        text: `${seg.title}. ${text}`.slice(0, MAX_CHUNK_CHARS), timestampSec: seg.startSec,
      })
    }
  }

  // Transcript: gộp cue theo đoạn (có segmentId) — mốc giây của câu đầu tiên.
  let transcriptChunks = 0
  if (segments.length) {
    const cues = await prisma.transcriptCue.findMany({
      where: { lesson: { courseId }, segmentId: { in: segments.map(s => s.id) } },
      select: { segmentId: true, startSec: true, text: true },
      orderBy: { startSec: 'asc' },
      take: 6000,
    })
    const bySegment = new Map<string, { start: number; parts: string[]; len: number }>()
    for (const cue of cues) {
      if (!cue.segmentId) continue
      let bucket = bySegment.get(cue.segmentId)
      if (!bucket) { bucket = { start: cue.startSec, parts: [], len: 0 }; bySegment.set(cue.segmentId, bucket) }
      if (bucket.len < MAX_CHUNK_CHARS) {
        bucket.parts.push(cue.text)
        bucket.len += cue.text.length + 1
      }
    }
    const segById = new Map(segments.map(s => [s.id, s]))
    for (const [segmentId, bucket] of bySegment) {
      const seg = segById.get(segmentId)
      if (!seg) continue
      chunks.push({
        id: `transcript:${segmentId}`, courseId, lessonId: seg.lessonId,
        lessonTitle: seg.lesson.title, sourceType: 'TRANSCRIPT',
        text: bucket.parts.join(' ').slice(0, MAX_CHUNK_CHARS), timestampSec: Math.floor(bucket.start),
      })
      transcriptChunks++
    }
  }

  for (const req of requests) {
    chunks.push({
      id: `qa:${req.id}`, courseId, lessonId: req.lessonId,
      lessonTitle: 'Hỏi đáp trong khóa', sourceType: 'QA',
      text: `Hỏi: ${req.content}\nĐáp: ${req.publicReply}`.slice(0, MAX_CHUNK_CHARS),
    })
  }

  return {
    chunks,
    counts: {
      lessons: lessons.length,
      segments: segments.length,
      transcriptChunks,
      qaPairs: requests.length,
    },
  }
}

export interface CourseBrain {
  index: BrainIndex
  stats: BrainStats
}

interface CacheEntry extends CourseBrain {
  expiresAt: number
}

const brainCache = new Map<number, CacheEntry>()

async function compileVersion(courseId: number): Promise<number> {
  const count = await prisma.activityLog.count({
    where: { action: 'CARE_BRAIN_COMPILE', metadata: { path: ['courseId'], equals: courseId } },
  })
  return count + 1
}

/** Lấy chỉ mục của khóa (cache TTL 10 phút); force=true biên dịch lại ngay. */
export async function getCourseBrain(courseId: number, opts?: { force?: boolean }): Promise<CourseBrain> {
  const now = Date.now()
  const cached = brainCache.get(courseId)
  if (!opts?.force && cached && cached.expiresAt > now) return cached
  const { chunks, counts } = await loadCourseChunks(courseId)
  const index = buildIndex(chunks)
  const stats: BrainStats = {
    ...counts,
    chunks: chunks.length,
    version: await compileVersion(courseId),
    builtAt: new Date().toISOString(),
  }
  const entry: CacheEntry = { index, stats, expiresAt: now + CACHE_TTL_MS }
  brainCache.set(courseId, entry)
  return entry
}

/** Biên dịch lại tri thức khóa + ghi vết ActivityLog (đếm phiên bản). */
export async function compileCourseBrain(courseId: number, actorId: number) {
  const entry = await getCourseBrain(courseId, { force: true })
  await prisma.activityLog.create({
    data: {
      userId: actorId,
      action: 'CARE_BRAIN_COMPILE',
      detail: `care-brain:${courseId}:v${entry.stats.version}`,
      metadata: { courseId, version: entry.stats.version, stats: entry.stats as unknown as Prisma.InputJsonValue },
    },
  })
  return entry.stats
}

export function invalidateCourseBrain(courseId: number) {
  brainCache.delete(courseId)
}

export async function getBrainStats(courseId: number): Promise<BrainStats> {
  const entry = await getCourseBrain(courseId)
  return entry.stats
}
