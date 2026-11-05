import { z } from 'zod'
export const intakeStateSchema = z.object({
  version: z.number().int().min(0).default(0),
  submittedAt: z.string().default(''),
  answers: z
    .array(z.object({ id: z.string(), label: z.string(), value: z.string() }))
    .max(20)
    .default([]),
})
export const intakeKey = (courseId: number, userId: number) => `catalog:service-intake:${courseId}:${userId}`
