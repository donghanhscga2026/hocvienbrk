import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { z } from 'zod'
import { auth } from '@/auth'
import { requireAdmin } from '@/lib/api-auth'
import prisma from '@/lib/prisma'
import { mediaKey, mediaPath, mediaStorage, mediaUsage, metadataFields } from '@/lib/admin-media'
import { trashKey, trashRecordSchema, TRASH_PREFIX } from '@/lib/media-trash'
import { POST as mediaBatch } from './batch/route'

export const dynamic = 'force-dynamic'
const metadataSchema = metadataFields.extend({ path: mediaPath })
function failure(error: unknown) {
  console.error('[Admin media]', error)
  const configuration = error instanceof Error && error.message.startsWith('Cần cấu hình')
  return NextResponse.json({ error: configuration ? error.message : 'Không thể xử lý media. Kiểm tra cấu hình Storage hoặc thử lại.' }, { status: configuration ? 503 : 500 })
}

export async function GET(request: Request) {
  const denied = await requireAdmin(); if (denied) return denied
  const params = new URL(request.url).searchParams
  const path = params.get('path') || ''
  if (path && !mediaPath.safeParse(path).success) return NextResponse.json({ error: 'Đường dẫn không hợp lệ.' }, { status: 400 })
  try {
    const storage = mediaStorage()
    if (params.get('usage') === '1' && path) {
      return NextResponse.json(await mediaUsage(storage.getPublicUrl(path).data.publicUrl, path))
    }
    const parsedPage = Number(params.get('page') || 0)
    if (!Number.isSafeInteger(parsedPage) || parsedPage < 0 || parsedPage > 10000) return NextResponse.json({ error: 'Trang không hợp lệ.' }, { status: 400 })
    if (params.get('trash') === '1') {
      const records = await prisma.systemConfig.findMany({ where: { key: { startsWith: TRASH_PREFIX } }, select: { key: true, value: true } })
      const rows = records.flatMap(record => { const parsed = trashRecordSchema.safeParse(record.value); return parsed.success ? [parsed.data] : [] })
        .filter(row => !params.get('q') || row.path.toLowerCase().includes(params.get('q')!.toLowerCase()))
        .sort((a,b) => b.trashedAt.localeCompare(a.trashedAt))
      const entries = rows.slice(parsedPage * 60, parsedPage * 60 + 60)
      const metadata = await prisma.systemConfig.findMany({ where: { key: { in: entries.map(row => mediaKey(row.path)) } }, select: { key: true, value: true } })
      return NextResponse.json({ items: entries.map(row => { const saved = metadata.find(meta => meta.key === mediaKey(row.path))?.value; return { ...(saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {}), ...row, filename: row.path.split('/').pop(), folder: false, url: storage.getPublicUrl(row.path).data.publicUrl } }), hasMore: rows.length > (parsedPage + 1) * 60 }, { headers: { 'Cache-Control': 'no-store' } })
    }
    const { data, error } = await storage.list(path, { limit: 61, offset: parsedPage * 60, sortBy: { column: 'name', order: 'asc' }, search: (params.get('q') || '').slice(0, 200) })
    if (error) throw error
    const entries = (data || []).slice(0, 60)
    const keys = entries.filter(item => item.id).map(item => mediaKey(path ? path + '/' + item.name : item.name))
    const records = keys.length ? await prisma.systemConfig.findMany({ where: { key: { in: keys } }, select: { key: true, value: true } }) : []
    const trashed = await prisma.systemConfig.findMany({ where: { key: { in: entries.filter(item => item.id).map(item => trashKey(path ? path + '/' + item.name : item.name)) } }, select: { key: true } })
    const hidden = new Set(trashed.map(row => row.key))
    const items = entries.filter(item => !hidden.has(trashKey(path ? path + '/' + item.name : item.name))).map(item => {
      const fullPath = path ? path + '/' + item.name : item.name
      const meta = records.find(record => record.key === mediaKey(fullPath))?.value
      const saved = meta && typeof meta === 'object' && !Array.isArray(meta) ? meta : {}
      return { path: fullPath, filename: item.name, folder: !item.id, url: item.id ? storage.getPublicUrl(fullPath).data.publicUrl : '', size: Number(item.metadata?.size || 0), mime: String(item.metadata?.mimetype || ''), createdAt: item.created_at, ...saved }
    })
    return NextResponse.json({ items, hasMore: (data || []).length > 60 }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return failure(error) }
}

export async function PATCH(request: Request) {
  const denied = await requireAdmin(); if (denied) return denied
  const parsed = metadataSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Tên hoặc mô tả không hợp lệ.' }, { status: 400 })
  try {
    const { path, name, description } = parsed.data
    const key = mediaKey(path)
    const existing = await prisma.systemConfig.findUnique({ where: { key } })
    const old = existing?.value && typeof existing.value === 'object' && !Array.isArray(existing.value) ? existing.value : {}
    const value = { ...old, name, description }
    await prisma.systemConfig.upsert({ where: { key }, create: { key, value }, update: { value } })
    return NextResponse.json({ success: true })
  } catch (error) { return failure(error) }
}

export async function POST(request: Request) {
  const denied = await requireAdmin(); if (denied) return denied
  try {
    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File) || !file.size || file.size > 4 * 1024 * 1024) return NextResponse.json({ error: 'Chọn file có dung lượng tối đa 4 MB.' }, { status: 400 })
    let buffer: Buffer = Buffer.from(await file.arrayBuffer())
    let ext: string, mime: string
    // Không nhận SVG/HTML hoặc tin phần mở rộng do trình duyệt gửi.
    if (['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      buffer = await sharp(buffer, { limitInputPixels: 40000000 }).rotate().webp({ quality: 85 }).toBuffer()
      ext = 'webp'; mime = 'image/webp'
    } else if (file.type === 'application/pdf' && buffer.subarray(0, 5).toString() === '%PDF-') { ext = 'pdf'; mime = 'application/pdf' }
    else if (['application/zip', 'application/x-zip-compressed'].includes(file.type) && buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 3 && buffer[3] === 4) { ext = 'zip'; mime = 'application/zip' }
    else if (file.type === 'text/plain') { ext = 'txt'; mime = 'text/plain' }
    else return NextResponse.json({ error: 'Hỗ trợ ảnh JPG/PNG/WebP/GIF, PDF, ZIP và TXT.' }, { status: 400 })
    const storage = mediaStorage()
    const path = 'media/' + randomUUID() + '.' + ext
    const { error } = await storage.upload(path, buffer, { contentType: mime, upsert: false })
    if (error) throw error
    const session = await auth()
    const key = mediaKey(path)
    try {
      await prisma.systemConfig.create({ data: { key, value: { name: file.name.slice(0, 200), description: '', uploadedBy: session!.user!.id, uploaderName: session!.user!.name || session!.user!.id } } })
    } catch (error) {
      // File vẫn được liệt kê trực tiếp từ Storage nếu lưu metadata bị lỗi.
      console.error('[Media metadata]', error)
    }
    return NextResponse.json({ path, url: storage.getPublicUrl(path).data.publicUrl }, { status: 201 })
  } catch (error) { return failure(error) }
}

export async function DELETE(request: Request) {
  const denied = await requireAdmin(); if (denied) return denied
  // Legacy clients also move to trash; permanent deletion requires the explicit purge action.
  const parsed = z.object({ path: mediaPath, execute: z.boolean().default(false), confirm: z.literal('DELETE').optional() }).strict().safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Yêu cầu không hợp lệ.' }, { status: 400 })
  const response = await mediaBatch(new Request(request.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paths: [parsed.data.path], execute: parsed.data.execute, confirm: parsed.data.confirm, action: 'trash' }) }))
  if (!response.ok) return response
  const body = await response.json()
  if (body.dryRun) return NextResponse.json({ dryRun: true, ...body.items[0] })
  if (body.blocked.length || body.failed.length) return NextResponse.json({ error: 'Chưa chuyển được file vào thùng rác.', ...body }, { status: 409 })
  return NextResponse.json({ success: true, ...body })
}
