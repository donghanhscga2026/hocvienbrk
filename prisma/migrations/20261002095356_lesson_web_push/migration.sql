-- Bổ sung riêng bảng đăng ký thiết bị và hàng đợi; không sửa/xóa dữ liệu cũ.
BEGIN;
CREATE TABLE public."WebPushSubscription" (
  id TEXT PRIMARY KEY, "userId" INTEGER NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  origin TEXT NOT NULL, endpoint TEXT NOT NULL, p256dh TEXT NOT NULL, auth TEXT NOT NULL,
  "vapidPublicKey" TEXT NOT NULL, version TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "WebPushSubscription_userId_origin_idx" ON public."WebPushSubscription"("userId",origin);
CREATE TABLE public."WebPushDelivery" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "notificationId" TEXT NOT NULL REFERENCES public."AppNotification"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  "subscriptionId" TEXT NOT NULL REFERENCES public."WebPushSubscription"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  "subscriptionVersion" TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','PROCESSING','SENT','SKIPPED','FAILED')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leaseUntil" TIMESTAMP(3), "leaseToken" TEXT, "sentAt" TIMESTAMP(3), "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WebPushDelivery_notificationId_subscriptionId_key" UNIQUE ("notificationId","subscriptionId")
);
CREATE INDEX "WebPushDelivery_subscriptionId_idx" ON public."WebPushDelivery"("subscriptionId");
CREATE INDEX "WebPushDelivery_status_nextAttemptAt_idx" ON public."WebPushDelivery"(status,"nextAttemptAt");
ALTER TABLE public."WebPushSubscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."WebPushDelivery" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."WebPushSubscription",public."WebPushDelivery" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."WebPushSubscription",public."WebPushDelivery" TO service_role;
COMMIT;
