import type { Prisma } from '@prisma/client'
import { z } from 'zod'
import { appFrameOrigin, appFrameKey } from './app-frame-domains'

export const appFrameStateSchema = z
  .object({
    revision: z.number().int().min(0),
    origins: z.array(z.string().transform(appFrameOrigin)).max(50),
  })
  .strict()
type Reader = Pick<Prisma.TransactionClient, 'systemConfig'>
export async function readAppFrameSettings(db: Reader, key = appFrameKey()) {
  const row = await db.systemConfig.findUnique({ where: { key }, select: { value: true } })
  if (row) return appFrameStateSchema.parse(row.value)
  if (key.includes(':preview:')) {
    const live = await db.systemConfig.findUnique({
      where: { key: key.split(':preview:')[0] },
      select: { value: true },
    })
    if (live) return { ...appFrameStateSchema.parse(live.value), revision: 0 }
  }
  return { revision: 0, origins: [] as string[] }
}
