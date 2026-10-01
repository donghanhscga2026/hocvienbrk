import { z } from 'zod'
import { CRM_STAGES } from './shared'

const text = (max: number) => z.string().trim().max(max)
export const segmentFilter = z.object({
  source: text(100).default(''), tag: text(40).default(''),
  stage: z.enum(CRM_STAGES).optional(), ownerId: z.number().int().nonnegative().nullable().optional(),
}).strict()
const token = z.string().min(1).max(1000)
export const phaseThreeCommand = z.discriminatedUnion('action', [
  z.object({ action: z.literal('segment.preview'), filter: segmentFilter }).strict(),
  z.object({ action: z.literal('campaign.draft'), filter: segmentFilter, token, title: text(150).min(1), subject: text(200).min(1), body: text(20000).min(1) }).strict(),
  z.object({ action: z.literal('consent.set'), contactId: z.number().int().positive(), version: z.number().int().positive(), allowed: z.boolean(), note: text(500).min(1) }).strict(),
  z.object({ action: z.literal('settings.save'), version: z.number().int().nonnegative(), lead: z.boolean(), enrollment: z.boolean(), payment: z.boolean() }).strict(),
  z.object({ action: z.literal('automation.preview') }).strict(),
  z.object({ action: z.literal('automation.execute'), token }).strict(),
])
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => { const date = new Date(value + 'T00:00:00Z'); return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value }, 'Ngày không hợp lệ.')
export const phaseThreeQuery = z.object({
  view: z.enum(['reports', 'reminders', 'settings', 'consent']),
  from: day.optional(), to: day.optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  contactId: z.coerce.number().int().positive().optional(),
}).strict()

// Ngày lọc là nhãn ngày Việt Nam; đổi đúng một lần sang thời điểm UTC.
export function reportRange(from?: string, to?: string, now = new Date()) {
  const label = (date: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
  const first = from || label(new Date(now.getTime() - 29 * 86400000))
  const last = to || label(now)
  const gte = new Date(first + 'T00:00:00+07:00')
  const lt = new Date(new Date(last + 'T00:00:00+07:00').getTime() + 86400000)
  if (!Number.isFinite(gte.getTime()) || !Number.isFinite(lt.getTime()) || lt <= gte || lt.getTime() - gte.getTime() > 366 * 86400000) throw new Error('Khoảng báo cáo từ 1 đến 366 ngày.')
  return { first, last, gte, lt }
}
