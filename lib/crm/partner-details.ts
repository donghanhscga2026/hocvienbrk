import { z } from 'zod'

const intake = z.object({ kind: z.enum(['TEACHER', 'BUSINESS', 'BOTH']), organization: z.string(), expertise: z.string(), proposal: z.string(), portfolio: z.string() })
export function partnerDetails(content: string, history: unknown) {
  const event = Array.isArray(history) ? history.find(row => row && typeof row === 'object' && row.action === 'PARTNER_INTAKE') : null
  const structured = intake.safeParse(event?.partner)
  if (structured.success) return { ...structured.data, legacy: false }
  // Legacy multiline answers cannot be reliably split by user-editable labels.
  // Classify only the exact first line; keep original content in detail/export.
  const first = content.split('\n')[0]
  const kind = first === 'Đăng ký: Doanh nghiệp' ? 'BUSINESS' : first === 'Đăng ký: Giảng viên' ? 'TEACHER' : first === 'Đăng ký: Giảng viên và doanh nghiệp' ? 'BOTH' : 'UNKNOWN'
  const organization = content.split('\n')[1]?.startsWith('Doanh nghiệp: ') ? content.split('\n')[1].slice(14) : ''
  return { kind, organization, expertise: '', proposal: '', portfolio: '', legacy: true } as const
}
