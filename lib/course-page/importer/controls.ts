import { z } from 'zod'

// Cấu hình chỉ chứa dữ liệu; không nhận selector hoặc mã JavaScript tùy ý.
const key = z.string().regex(/^(control|target)-\d+$/)
export const bindingSchema = z.object({ id: key, action: z.enum(['pending','keep','link','course','register','scroll','tab']), target: z.string().max(2000) }).strict().superRefine((b, ctx) => {
  const fail = () => ctx.addIssue({ code: 'custom', message: 'Đích điều hướng không hợp lệ.' })
  if (['scroll','tab'].includes(b.action) && !/^target-\d+$/.test(b.target)) fail()
  if (b.action === 'course' || (b.action === 'register' && b.target)) { if (!/^\/khoa-hoc\/[A-Za-z0-9_-]+$/.test(b.target)) fail() }
  if (b.action === 'link' && !safeControlLink(b.target)) fail()
})
export function safeControlLink(value: string) {
  if (/^\/(?!\/)/.test(value) && !/[\\\x00-\x20]/.test(value)) return true
  try { const url = new URL(value); return ['https:','http:','mailto:','tel:'].includes(url.protocol) && !url.username && !url.password } catch { return false }
}
export const controlsSchema = z.object({
  items: z.array(z.object({ id: key, label: z.string().max(180), context: z.string().max(180), originalHref: z.string().max(2000) }).strict()).max(150),
  targets: z.array(z.object({ id: key, label: z.string().max(180), originalId: z.string().max(180) }).strict()).max(150),
  bindings: z.array(bindingSchema).max(150),
}).strict().superRefine((c, ctx) => {
  const ids = new Set(c.items.map(i=>i.id)), targets = new Set(c.targets.map(t=>t.id)), used = new Set<string>()
  if (ids.size !== c.items.length || targets.size !== c.targets.length) ctx.addIssue({code:'custom',message:'ID nút bị trùng.'})
  for (const b of c.bindings) {
    if (!ids.has(b.id) || used.has(b.id) || (['tab','scroll'].includes(b.action) && !targets.has(b.target))) ctx.addIssue({code:'custom',message:'Cấu hình nút không khớp template.'})
    used.add(b.id)
  }
})
export type TemplateControls = z.infer<typeof controlsSchema>
export type ControlBinding = z.infer<typeof bindingSchema>

// Tính đích trong parent; iframe không được tự gửi URL để vượt cấu hình đã lưu.
export function resolveControlAction(binding: ControlBinding, currentUrl: string, allowedCourses?: string[]): {kind:'registration'}|{kind:'link';url:string}|{kind:'blocked'}|{kind:'local'} {
  const parsed=bindingSchema.safeParse(binding)
  if(!parsed.success)return {kind:'blocked'}
  const b=parsed.data, current=new URL(currentUrl)
  if(['course','register'].includes(b.action) && b.target && allowedCourses && !allowedCourses.includes(b.target))return {kind:'blocked'}
  if(b.action==='register' && (!b.target || current.pathname===b.target))return {kind:'registration'}
  if(!['link','course','register'].includes(b.action))return {kind:'local'}
  const target=new URL(b.target,current.origin)
  if(b.action==='register')target.searchParams.set('register','1')
  if(['course','register'].includes(b.action) && current.searchParams.has('ref'))target.searchParams.set('ref',current.searchParams.get('ref')!)
  return {kind:'link',url:target.toString()}
}
