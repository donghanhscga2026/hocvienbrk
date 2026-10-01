import { z } from 'zod'
import { parsePhoneNumberFromString } from 'libphonenumber-js'
import { CRM_STAGES } from './shared'

const id = z.number().int().nonnegative()
const recordId = z.number().int().positive()
const text = (max: number) => z.string().trim().max(max)
const phone = text(40).transform((value, ctx) => {
  if (!value) return null
  const parsed = parsePhoneNumberFromString(value, 'VN')
  if (!parsed?.isValid()) {
    ctx.addIssue({ code: 'custom', message: 'Số điện thoại không hợp lệ.' })
    return z.NEVER
  }
  return parsed.number as string
})
const email = text(254).transform(value => value.toLowerCase()).pipe(z.union([z.email(), z.literal('')]))
  .transform(value => value || null)
export const contactFields = z.object({
  name: text(150).min(1, 'Vui lòng nhập tên khách.'), email, phone,
  source: text(100).min(1, 'Vui lòng nhập nguồn khách.'), needs: text(4000),
  tags: z.array(text(40).min(1)).max(15).transform(values => [...new Set(values)]),
  ownerId: id.nullable(), archived: z.boolean(),
}).strict().refine(value => value.email || value.phone, { message: 'Cần ít nhất email hoặc số điện thoại.', path: ['email'] })
const opportunityFields = z.object({
  courseId: recordId.nullable().default(null),
  title: text(200).min(1, 'Vui lòng nhập tên cơ hội.'), stage: z.enum(CRM_STAGES),
  amount: z.number().int().min(0).max(2000000000), lostReason: text(1000),
}).strict().refine(value => value.stage !== 'LOST' || !!value.lostReason, {
  message: 'Vui lòng ghi lý do chưa thành công.', path: ['lostReason'],
})
const dueAt = z.iso.datetime({ offset: true }).transform(value => new Date(value))
export const crmCommand = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('care.update'), contactId: recordId, version: recordId,
    note: text(4000).min(1),
    opportunity: z.object({ id: recordId, version: recordId, stage: z.enum(CRM_STAGES), lostReason: text(1000) }).strict().nullable(),
    task: z.object({ title: text(200).min(1), dueAt }).strict().nullable(),
  }).strict(),
  z.object({ action: z.literal('contact.create'), data: contactFields }).strict(),
  z.object({ action: z.literal('contact.update'), contactId: recordId, version: recordId, data: contactFields }).strict(),
  z.object({ action: z.literal('activity.create'), contactId: recordId, type: z.enum(['NOTE', 'CALL', 'ZALO', 'EMAIL', 'MEETING']), content: text(4000).min(1) }).strict(),
  z.object({ action: z.literal('opportunity.create'), contactId: recordId, data: opportunityFields }).strict(),
  z.object({ action: z.literal('opportunity.update'), contactId: recordId, opportunityId: recordId, version: recordId, data: opportunityFields }).strict(),
  z.object({ action: z.literal('task.create'), contactId: recordId, title: text(200).min(1), dueAt }).strict(),
  z.object({ action: z.literal('task.toggle'), contactId: recordId, taskId: recordId, completed: z.boolean() }).strict(),
])
export type CrmCommand = z.infer<typeof crmCommand>
export const crmQuery = z.object({
  view: z.enum(['contacts', 'tasks', 'owners', 'detail']).default('contacts'),
  id: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  q: text(150).default(''), source: text(100).default(''), tag: text(40).default(''),
  stage: z.enum(CRM_STAGES).optional(), ownerId: z.coerce.number().int().nonnegative().optional(),
  archived: z.enum(['true', 'false']).default('false'),
  due: z.enum(['all', 'today', 'overdue', 'done', 'unscheduled']).default('all'),
  activityPage: z.coerce.number().int().min(1).max(100000).default(1),
}).strict()
