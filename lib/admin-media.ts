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
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }).storage.from('uploads')
}

/** Chỉ trả về loại nội dung và ID; không đưa dữ liệu hồ sơ/mật khẩu ra client. */
export async function mediaUsage(url: string, path: string) {
  const sources = ['Course', 'Lesson', 'Post', 'SiteProfile', 'LandingPage', 'CoursePage', 'CourseSection', 'CoursePageVersion', 'CoursePageTemplate', 'LessonComment', 'Payment', 'SystemConfig']
  const references: { type: string; id: string }[] = []
  const unchecked: string[] = []
  // PostgreSQL position() so tên file có % hoặc _ không bị coi là wildcard.
  for (const table of sources) {
    try {
      const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
        SELECT COALESCE(to_jsonb(t)->>'id',to_jsonb(t)->>'key','') AS id
        FROM ${Prisma.raw('"' + table + '"')} t
        WHERE (position(${url} in to_jsonb(t)::text)>0 OR position(${path} in to_jsonb(t)::text)>0)
          AND COALESCE(to_jsonb(t)->>'key','') NOT LIKE 'admin-media:%'
        LIMIT 21`)
      references.push(...rows.map(row => ({ type: table, id: row.id })))
    } catch { unchecked.push(table) }
  }
  try {
    const users = await prisma.user.findMany({ where: { image: { contains: path } }, select: { id: true }, take: 21 })
    references.push(...users.map(row => ({ type: 'Ảnh đại diện', id: String(row.id) })))
  } catch { unchecked.push('User') }
  return { references, unchecked, note: 'Kiểm tra các nội dung chính trong cơ sở dữ liệu; không xác định được mọi liên kết trong mã nguồn, website ngoài hoặc file HTML/ZIP đã tải lên.' }
}
