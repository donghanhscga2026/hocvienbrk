import { Prisma, PrismaClient } from '@prisma/client'
import { z } from 'zod'

type Db = PrismaClient | Prisma.TransactionClient
export function isCrmCampaign(filter: Prisma.JsonValue | null) {
  return !!filter && typeof filter === 'object' && !Array.isArray(filter) && filter.crm === true
}
export async function resolveCrmEmailRecipients(db: Db, raw: string) {
  // Kiểm tra lại trước mỗi lượt gửi của công cụ email, kể cả sau khi tạo nháp.
  const parsed = z.array(z.object({ contactId: z.number().int().positive(), email: z.email(), name: z.string().max(150) })).max(500).safeParse(JSON.parse(raw))
  if (!parsed.success || !parsed.data.length) return []
  const contacts = await db.crmContact.findMany({ where: { id: { in: parsed.data.map(r => r.contactId) }, archived: false, marketingEmailAllowed: true }, select: { id: true, email: true } })
  const blacklist = await db.emailBlacklist.findMany({ where: { OR: parsed.data.map(r => ({ email: { equals: r.email, mode: 'insensitive' as const } })) }, select: { email: true } })
  const denied = new Set(blacklist.map(r => r.email.toLowerCase()))
  const seen = new Set<string>()
  return parsed.data.filter(r => { const email = r.email.toLowerCase(); if (denied.has(email) || seen.has(email) || !contacts.some(c => c.id === r.contactId && c.email?.toLowerCase() === email)) return false; seen.add(email); return true }).map(r => ({ email: r.email, name: r.name }))
}
