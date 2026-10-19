import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/api-auth'
import prisma from '@/lib/prisma'
import { mediaKey, mediaPath, mediaStorage, mediaUsageBatch } from '@/lib/admin-media'

const input = z.object({ paths: z.array(mediaPath).min(1).max(20).refine(paths => new Set(paths).size === paths.length), execute: z.boolean().default(false), confirm: z.literal('DELETE').optional() }).strict()

export async function POST(request: Request) {
  const denied = await requireAdmin(); if (denied) return denied
  const parsed = input.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Chọn từ 1 đến 20 file khác nhau.' }, { status: 400 })
  const { paths, execute, confirm } = parsed.data
  if (execute && confirm !== 'DELETE') return NextResponse.json({ error: 'Cần xác nhận xóa.' }, { status: 400 })
  try {
    const storage = mediaStorage()
    const items = await mediaUsageBatch(paths.map(path => ({ path, url: storage.getPublicUrl(path).data.publicUrl })))
    if (!execute) return NextResponse.json({ dryRun: true, items }, { headers: { 'Cache-Control': 'no-store' } })
    // Recheck every requested file; the client's earlier preview is never trusted.
    const eligible = items.filter(item => !item.references.length && !item.unchecked.length).map(item => item.path)
    const deleted: string[] = []
    const failed: { path: string; error: string }[] = []
    if (eligible.length) {
      const { data, error } = await storage.remove(eligible)
      if (error) throw error
      // Supabase can return an empty/partial deletion result. Never label those files deleted.
      const removed = new Set((data || []).map(item => item.name))
      for (const path of eligible) {
        if (removed.has(path)) deleted.push(path)
        else failed.push({ path, error: 'Storage chưa xác nhận đã xóa file. Hãy tải lại danh sách và thử lại.' })
      }
      if (deleted.length) await prisma.systemConfig.deleteMany({ where: { key: { in: deleted.map(mediaKey) } } }).catch(error => console.error('[Media metadata cleanup]', error))
    }
    return NextResponse.json({ deleted, failed, blocked: items.filter(item => item.references.length || item.unchecked.length) }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[Media batch]', error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.json({ error: 'Không hoàn tất xử lý media. File có thể chưa được xóa; hãy tải lại danh sách trước khi thử lại.' }, { status: 503 })
  }
}
