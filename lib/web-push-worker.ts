import { createHash, randomUUID } from 'node:crypto'
import { Prisma } from '@prisma/client'
import webPush from 'web-push'
import prisma from '@/lib/prisma'
import { pushConfig, safePushEndpoint } from './web-push-config'

type Job = {
  id: string; notificationId: string; subscriptionId: string; subscriptionVersion: string; attempts: number;
  origin: string; endpoint: string; p256dh: string; auth: string; vapidPublicKey: string; version: string;
  recipientId: number; title: string; slug: string; lessonId: string; eligible: boolean; fresh: boolean
}
// Mặc định chỉ xem số lượt đang chờ; execute=true mới gọi dịch vụ push.
export async function processWebPush(options: { execute?: boolean; origin?: string; milliseconds?: number } = {}) {
  const filter = options.origin ? Prisma.sql`AND s.origin=${options.origin}` : Prisma.empty
  const pending = await prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`
    SELECT count(*) AS count FROM public."WebPushDelivery" d JOIN public."WebPushSubscription" s ON s.id=d."subscriptionId"
    WHERE (d.status='PENDING' OR (d.status='PROCESSING' AND d."leaseUntil"<CURRENT_TIMESTAMP))
      AND d."nextAttemptAt"<=CURRENT_TIMESTAMP ${filter}`)
  const summary = { pending: Number(pending[0].count), sent: 0, skipped: 0, retry: 0, failed: 0, execute: options.execute === true }
  if (!options.execute) return summary
  const deadline = Date.now() + (options.milliseconds ?? 40000)
  while (Date.now() < deadline - 6500) {
    const token = randomUUID()
    // SKIP LOCKED + lease ngăn hai worker xử lý cùng lượt; khóa DB không giữ trong lúc gọi mạng.
    const rows = await prisma.$queryRaw<Job[]>(Prisma.sql`
      WITH candidates AS (
        SELECT d.id FROM public."WebPushDelivery" d JOIN public."WebPushSubscription" s ON s.id=d."subscriptionId"
        WHERE (d.status='PENDING' OR (d.status='PROCESSING' AND d."leaseUntil"<CURRENT_TIMESTAMP))
          AND d."nextAttemptAt"<=CURRENT_TIMESTAMP ${filter}
        ORDER BY d."createdAt",d.id LIMIT 5 FOR UPDATE OF d SKIP LOCKED
      ), claimed AS (
        UPDATE public."WebPushDelivery" d SET status='PROCESSING',"leaseToken"=${token},
          "leaseUntil"=CURRENT_TIMESTAMP + interval '2 minutes',attempts=attempts+1,"updatedAt"=CURRENT_TIMESTAMP
        WHERE d.id IN (SELECT id FROM candidates) RETURNING d.*
      )
      SELECT d.id,d."notificationId",d."subscriptionId",d."subscriptionVersion",d.attempts,
        s.origin,s.endpoint,s.p256dh,s.auth,s."vapidPublicKey",s.version,n."recipientId",n.title,c.id_khoa AS slug,n."lessonId",
        (n.kind='LESSON_ANNOUNCEMENT' AND n."notBefore"<=CURRENT_TIMESTAMP AND l.id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public."Enrollment" e WHERE e."userId"=s."userId" AND e."courseId"=n."courseId" AND e.status='ACTIVE'
        ) AND n."recipientId"=s."userId") AS eligible,
        (d."createdAt">CURRENT_TIMESTAMP-interval '1 day') AS fresh
      FROM claimed d JOIN public."WebPushSubscription" s ON s.id=d."subscriptionId"
      JOIN public."AppNotification" n ON n.id=d."notificationId"
      LEFT JOIN public."Course" c ON c.id=n."courseId"
      LEFT JOIN public."Lesson" l ON l.id=n."lessonId" AND l."courseId"=n."courseId"`)
    if (!rows.length) break
    await Promise.all(rows.map(async job => {
      const config = pushConfig(job.origin)
      let state = 'SKIPPED'; let reason: string | null = 'not_eligible'
      let next = new Date()
      if (config && job.eligible && job.fresh && job.version===job.subscriptionVersion
        && job.vapidPublicKey===config.publicKey && safePushEndpoint(job.endpoint)) {
        try {
          await webPush.sendNotification({ endpoint:job.endpoint,keys:{p256dh:job.p256dh,auth:job.auth} },
            JSON.stringify({ id:job.notificationId,userId:String(job.recipientId),
              title:'Bài học mới',body:job.title.slice(0,180),
              url:'/courses/' + encodeURIComponent(job.slug) + '/learn?lesson=' + encodeURIComponent(job.lessonId) }),
            { vapidDetails:{subject:config.subject,publicKey:config.publicKey,privateKey:config.privateKey},
              TTL:86400,timeout:5000,urgency:'normal',topic:createHash('sha256').update(job.notificationId).digest('base64url').slice(0,32) })
          state='SENT'; reason=null; summary.sent++
        } catch (error) {
          const status = (error as { statusCode?: number }).statusCode
          // Endpoint bị hủy: xóa đúng phiên đăng ký, không đụng phiên mới.
          if (status===404 || status===410) {
            await prisma.$executeRaw(Prisma.sql`DELETE FROM public."WebPushSubscription" WHERE id=${job.subscriptionId} AND version=${job.subscriptionVersion}`)
            summary.skipped++; return
          }
          state = job.attempts>=5 || (status!=null && status>=400 && status<500 && status!==429) ? 'FAILED' : 'PENDING'
          reason = status ? 'http_' + status : 'network_error'
          next = new Date(Date.now() + Math.min(60,2 ** Math.min(job.attempts-1,6)) * 60000)
          if (state==='FAILED') summary.failed++; else summary.retry++
        }
      } else summary.skipped++
      await prisma.$executeRaw(Prisma.sql`UPDATE public."WebPushDelivery" SET status=${state},"lastError"=${reason},
        "nextAttemptAt"=${next},"sentAt"=${state==='SENT' ? new Date() : null},"leaseToken"=NULL,"leaseUntil"=NULL,"updatedAt"=CURRENT_TIMESTAMP
        WHERE id=${job.id} AND "leaseToken"=${token}`)
    }))
  }
  return summary
}
