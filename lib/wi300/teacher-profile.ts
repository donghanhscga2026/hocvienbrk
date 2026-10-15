import { z } from 'zod'
import { safeProjectUrl } from './projects'

export const teacherProfileSchema = z.object({
  headline: z.string().trim().max(160).default(''),
  introduction: z.string().trim().max(3000).default(''),
  fields: z.array(z.string().trim().min(1).max(60)).max(8).default([]),
  website: z.string().trim().max(1000).refine(safeProjectUrl, 'Dùng URL HTTPS hợp lệ.').default(''),
}).strict()
export const teacherProfileKey = (id: number) => `wi300:teacher-profile:v1:${id}`
export const teacherHref = (id: number | string) => `/giang-vien/${encodeURIComponent(String(id))}`
