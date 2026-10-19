import 'server-only'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { mediaKey, mediaPath, mediaStorage, mediaUsageBatch } from '@/lib/admin-media'

export const TRASH_PREFIX = 'admin-media:trash:'
export const trashKey = (path: string) => TRASH_PREFIX + mediaKey(path).slice('admin-media:'.length)
export const trashRecordSchema = z.object({ path: mediaPath, trashedAt: z.string().datetime(), trashedBy: z.string(), size: z.number().nonnegative(), mime: z.string(), createdAt: z.string().optional() })
export const mediaBatchInput = z.object({
  paths: z.array(mediaPath).min(1).max(20).refine(paths => new Set(paths).size === paths.length),
  action: z.enum(['trash', 'restore', 'purge']).default('trash'),
  execute: z.boolean().default(false), confirm: z.enum(['TRASH', 'RESTORE', 'DELETE']).optional(),
}).strict()

/** Soft deletion preserves bytes and the original URL. No automatic expiry. */
export async function processMediaBatch(input: z.infer<typeof mediaBatchInput>, actorId: string) {
  const { paths, action, execute, confirm } = input
  if (execute && !(action === 'trash' ? confirm === 'TRASH' || confirm === 'DELETE' : action === 'restore' ? confirm === 'RESTORE' : confirm === 'DELETE')) throw new Error('Cần xác nhận thao tác.')
  const storage = mediaStorage()
  const items = action === 'restore' ? paths.map(path => ({ path, references: [], unchecked: [], missingTables: [], note: '' })) : await mediaUsageBatch(paths.map(path => ({ path, url: storage.getPublicUrl(path).data.publicUrl })))
  if (!execute) return { dryRun: true, action, items }
  const eligible = items.filter(item => !item.references.length && !item.unchecked.length).map(item => item.path)
  const processed: string[] = [], failed: { path: string; error: string }[] = []
  const infos = new Map<string, z.infer<typeof trashRecordSchema>>()
  let cursor = 0
  // At most four Storage reads at once, without occupying DB connections.
  if (action !== 'purge') await Promise.all(Array.from({ length: Math.min(4, eligible.length) }, async () => {
    while (cursor < eligible.length) {
      const path = eligible[cursor++]
      try {
        const { data, error } = await storage.info(path)
        if (error || !data) throw new Error('Không đọc được file gốc; chưa thay đổi trạng thái.')
        infos.set(path, { path, trashedAt: new Date().toISOString(), trashedBy: actorId, size: data.size || 0, mime: data.contentType || '', ...(data.createdAt ? { createdAt: data.createdAt } : {}) })
      } catch (error) { failed.push({ path, error: error instanceof Error ? error.message : 'Không đọc được file gốc.' }) }
    }
  }))
  await prisma.$transaction(async tx => {
    // Serialize trash/restore/purge, including operations from concurrent admins.
    await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext('admin-media-trash'))`)
    const purgePaths: string[] = []
    for (const path of eligible) {
      if (action !== 'purge' && !infos.has(path)) continue
      const key = trashKey(path), existing = await tx.systemConfig.findUnique({ where: { key } })
      if (action === 'trash') {
        if (!existing) await tx.systemConfig.create({ data: { key, value: infos.get(path)! } })
        processed.push(path)
      } else if (!existing) failed.push({ path, error: 'File không còn trong thùng rác. Hãy tải lại danh sách.' })
      else if (action === 'restore') { await tx.systemConfig.deleteMany({ where: { key } }); processed.push(path) }
      else purgePaths.push(path)
    }
    if (purgePaths.length) {
      const { data, error } = await storage.remove(purgePaths)
      if (error) throw error
      const removed = new Set((data || []).map(item => item.name))
      for (const path of purgePaths) {
        if (removed.has(path)) {
          await tx.systemConfig.deleteMany({ where: { key: { in: [trashKey(path), mediaKey(path)] } } })
          processed.push(path)
        } else failed.push({ path, error: 'Storage chưa xác nhận xóa vĩnh viễn; vẫn giữ mục trong thùng rác.' })
      }
    }
  }, { maxWait: 3000, timeout: 15000 })
  return { action, processed, deleted: processed, failed, blocked: items.filter(item => item.references.length || item.unchecked.length) }
}
