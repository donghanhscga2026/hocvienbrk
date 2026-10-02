import { ECDH, randomUUID } from 'node:crypto'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { CrmError } from '@/lib/crm/service'
import { pushConfig, pushEndpointId, safePushEndpoint } from './web-push-config'

export const subscriptionBody = z.object({
  endpoint: z.string().max(2048).refine(safePushEndpoint,'Địa chỉ thông báo không hợp lệ.'),
  keys: z.object({
    p256dh: z.string().regex(/^[A-Za-z0-9_-]+$/).refine(value => {
      try { return Buffer.from(value,'base64url').length === 65 && ECDH.convertKey(Buffer.from(value,'base64url'),'prime256v1').length === 65 } catch { return false }
    },'Khóa thiết bị không hợp lệ.'),
    auth: z.string().regex(/^[A-Za-z0-9_-]+$/).refine(value=>Buffer.from(value,'base64url').length===16,'Khóa thiết bị không hợp lệ.'),
  }).strict(),
  publicKey: z.string().min(1).max(128),
}).strict()
export async function registerPushDevice(userId: number, origin: string, input: z.infer<typeof subscriptionBody>) {
  const config = pushConfig(origin)
  if (!config || input.publicKey !== config.publicKey) throw new CrmError('Thông báo trên thiết bị chưa được cấu hình. Hãy tải lại trang.',503)
  const data = subscriptionBody.parse(input)
  const id = pushEndpointId(data.endpoint)
  // Endpoint đã gắn tài khoản khác phải hủy ở trình duyệt trước, không tự chuyển chủ sở hữu.
  const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    INSERT INTO public."WebPushSubscription" (id,"userId",origin,endpoint,"p256dh",auth,"vapidPublicKey",version)
    VALUES (${id},${userId},${origin},${data.endpoint},${data.keys.p256dh},${data.keys.auth},${config.publicKey},${randomUUID()})
    ON CONFLICT (id) DO UPDATE SET "updatedAt"=CURRENT_TIMESTAMP
    WHERE "WebPushSubscription"."userId"=EXCLUDED."userId" AND "WebPushSubscription".origin=EXCLUDED.origin
      AND "WebPushSubscription"."p256dh"=EXCLUDED."p256dh" AND "WebPushSubscription".auth=EXCLUDED.auth
      AND "WebPushSubscription"."vapidPublicKey"=EXCLUDED."vapidPublicKey"
    RETURNING id`)
  if (!rows.length) throw new CrmError('Thiết bị đang gắn tài khoản hoặc khóa cũ. Hãy tắt thông báo rồi bật lại.',409)
  return { registered: true }
}
export async function pushDeviceStatus(userId: number, origin: string, id: string | null) {
  const config = pushConfig(origin)
  if (!config) return { configured: false, registered: false, publicKey: null }
  if (!id) return { configured: true, registered: false, publicKey: config.publicKey }
  const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT id FROM public."WebPushSubscription" WHERE id=${id} AND "userId"=${userId} AND origin=${origin} AND "vapidPublicKey"=${config.publicKey}`)
  return { configured: true, registered: !!rows.length, publicKey: config.publicKey }
}
export async function removePushDevice(userId: number, origin: string, id: string) {
  await prisma.$executeRaw(Prisma.sql`DELETE FROM public."WebPushSubscription" WHERE id=${id} AND "userId"=${userId} AND origin=${origin}`)
  return { registered: false }
}
export async function queueAnnouncementPush(tx: Prisma.TransactionClient, batchId: string, origin?: string, enqueue = true) {
  const config = pushConfig(origin)
  if (!config) return { pushRecipientCount: 0, pushDeviceCount: 0 }
  if (enqueue) await tx.$executeRaw(Prisma.sql`
    INSERT INTO public."WebPushDelivery" ("notificationId","subscriptionId","subscriptionVersion")
    SELECT n.id,s.id,s.version FROM public."AppNotification" n JOIN public."WebPushSubscription" s ON s."userId"=n."recipientId"
    WHERE n.kind='LESSON_ANNOUNCEMENT' AND n."eventKey" LIKE ${'lesson-announcement:' + batchId + ':%'}
      AND s.origin=${origin!} AND s."vapidPublicKey"=${config.publicKey}
    ON CONFLICT ("notificationId","subscriptionId") DO NOTHING`)
  const rows = await tx.$queryRaw<{ users: bigint; devices: bigint }[]>(Prisma.sql`
    SELECT count(DISTINCT n."recipientId") AS users,count(*) AS devices FROM public."WebPushDelivery" d
    JOIN public."AppNotification" n ON n.id=d."notificationId" JOIN public."WebPushSubscription" s ON s.id=d."subscriptionId"
    WHERE n."eventKey" LIKE ${'lesson-announcement:' + batchId + ':%'} AND s.origin=${origin!}`)
  return { pushRecipientCount: Number(rows[0].users), pushDeviceCount: Number(rows[0].devices) }
}
