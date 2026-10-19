import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import prisma from '@/lib/prisma'

export const mediaPath = z.string().max(1000).refine(value => !value.startsWith('/') && !value.includes('\\') && !/[\x00-\x1f]/.test(value) && value.split('/').every(part => part && part !== '.' && part !== '..'), 'Đường dẫn không hợp lệ.')
export const metadataFields = z.object({ name: z.string().trim().min(1).max(200), description: z.string().trim().max(1000) }).strict()
export function mediaKey(path: string) { return 'admin-media:' + createHash('sha256').update(path).digest('hex') }
export function mediaStorage() {
  // Chỉ sử dụng khóa quản trị trên server sau khi route đã kiểm tra Admin.
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Cần cấu hình SUPABASE_SERVICE_ROLE_KEY và SUPABASE_URL (hoặc NEXT_PUBLIC_SUPABASE_URL) trên server để quản lý media.')
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: init?.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(10000)]) : AbortSignal.timeout(10000) }) },
  }).storage.from('uploads')
}

export type MediaReference = { type: string; id: string; title?: string; href?: string }
export type MediaUsage = { path: string; references: MediaReference[]; unchecked: string[]; missingTables: string[]; note: string }
const sources = ['Course', 'Lesson', 'Post', 'SiteProfile', 'LandingPage', 'CoursePage', 'CourseSection', 'CoursePageVersion', 'CoursePageTemplate', 'LessonComment', 'Payment', 'SystemConfig', 'User']
const optionalSources = new Set(['CoursePage', 'CourseSection', 'CoursePageVersion', 'CoursePageTemplate'])
const storageTables: Record<string, string> = { CoursePage: 'course_pages', CourseSection: 'course_sections', CoursePageVersion: 'course_page_versions', CoursePageTemplate: 'course_page_templates' }
function reference(table: string, row: { id: string; title?: string; parentId?: string }): MediaReference {
  const id = encodeURIComponent(row.id), parent = row.parentId ? encodeURIComponent(row.parentId) : ''
  const links: Record<string, string> = { Course: `/tools/courses/new?id=${id}`, Post: `/tools/posts?edit=${id}`, SiteProfile: `/tools/site-profiles/${id}/edit`, LandingPage: `/tools/landings/${id}/edit`, CoursePage: `/tools/courses/pages/${id}`, CoursePageTemplate: '/tools/courses/templates' }
  const href = links[table] || (table === 'Lesson' && parent ? `/tools/courses/new?id=${parent}` : ['CourseSection', 'CoursePageVersion'].includes(table) && parent ? `/tools/courses/pages/${parent}` : undefined)
  return { type: table === 'User' ? 'Ảnh đại diện' : table, id: row.id, ...(row.title ? { title: row.title } : {}), ...(href ? { href } : {}) }
}

/** One bounded scan per source for the entire selection, not per file. */
export async function mediaUsageBatch(files: { path: string; url: string }[]): Promise<MediaUsage[]> {
  if (!files.length || files.length > 20) throw new Error('Chọn từ 1 đến 20 file.')
  const results = files.map(file => ({ path: file.path, references: [], unchecked: [], missingTables: [], note: 'Kiểm tra các nội dung chính trong cơ sở dữ liệu; không xác định được mọi liên kết trong mã nguồn, website ngoài hoặc file HTML/ZIP đã tải lên.' } as MediaUsage))
  const targets = Prisma.join(files.map(file => Prisma.sql`(${file.path}::text,${file.url}::text)`))
  const deadline = Date.now() + 20000
  for (let index = 0; index < sources.length; index++) {
    const table = sources[index]
    if (Date.now() >= deadline) { for (const item of results) item.unchecked.push(...sources.slice(index)); break }
    try {
      // Only User.image is inspected; passwords and tokens never enter this scan.
      const documents = table === 'User'
        ? Prisma.sql`SELECT id::text AS id, NULL::text AS title, NULL::text AS "parentId", image AS content FROM public."User" WHERE image IS NOT NULL`
        : Prisma.sql`SELECT COALESCE(to_jsonb(t)->>'id',to_jsonb(t)->>'key','') AS id,
            COALESCE(NULLIF(to_jsonb(t)->>'title',''), NULLIF(to_jsonb(t)->>'name_lop',''), NULLIF(to_jsonb(t)->>'name',''), NULLIF(to_jsonb(t)->>'section_key','')) AS title,
            COALESCE(to_jsonb(t)->>'courseId',to_jsonb(t)->>'course_page_id') AS "parentId",
            to_jsonb(t)::text AS content FROM public.${Prisma.raw('"' + (storageTables[table] || table) + '"')} t WHERE COALESCE(to_jsonb(t)->>'key','') NOT LIKE 'admin-media:%'`
      const rows = await prisma.$transaction(async tx => {
        // Each source has its own transaction so a missing legacy table cannot abort all checks.
        await tx.$executeRaw(Prisma.sql`SELECT set_config('statement_timeout','1500',true)`)
        return tx.$queryRaw<{ path: string; id: string; title?: string; parentId?: string }[]>(Prisma.sql`
          WITH targets(path,url) AS (VALUES ${targets}), documents AS MATERIALIZED (${documents}),
          matches AS (
            SELECT targets.path, documents.id, documents.title, documents."parentId", row_number() OVER (PARTITION BY targets.path ORDER BY documents.id) AS n
            FROM documents JOIN targets ON position(targets.path in documents.content)>0 OR position(targets.url in documents.content)>0
          ) SELECT path,id,title,"parentId" FROM matches WHERE n<=21`)
      }, { maxWait: 1000, timeout: 2500 })
      for (const row of rows) results.find(item => item.path === row.path)?.references.push(reference(table, row))
    } catch (error) {
      // Only PostgreSQL undefined_table on the four optional builder tables is safe to skip.
      // Permission denied, connection errors and timeouts must continue to block deletion.
      const missing = optionalSources.has(table) && error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2010' && error.meta?.code === '42P01'
      for (const item of results) (missing ? item.missingTables : item.unchecked).push(table)
      if (!missing) console.error('[Media usage source]', table, error instanceof Error ? error.message : 'Unknown error')
    }
  }
  return results
}

export async function mediaUsage(url: string, path: string) {
  return (await mediaUsageBatch([{ path, url }]))[0]
}
