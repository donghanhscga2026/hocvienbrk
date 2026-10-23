-- Đặt lịch hẹn coach 1:1 — Giai đoạn 1 (tham khảo Bookify, ní Cương chốt 23/10/2026).
-- Sinh bằng prisma migrate diff từ schema master (675fcae) sang schema có 5 bảng booking;
-- chỉ tạo enum + bảng + khóa ngoại mới, không đụng dữ liệu hiện có.
-- Cuối file có khối Grant + Rls cho bảng mới theo mục G trong AGENTS.md của repo.

-- CreateEnum
CREATE TYPE "BookingSessionStatus" AS ENUM ('ACTIVE', 'PAUSED');

-- CreateEnum
CREATE TYPE "BookingMode" AS ENUM ('ZOOM', 'MEET', 'OFFLINE');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('HELD', 'PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "BookingWaitlistStatus" AS ENUM ('WAITING', 'NOTIFIED', 'BOOKED', 'EXPIRED');

-- CreateTable
CREATE TABLE "BookingSession" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "expertId" INTEGER NOT NULL,
    "courseId" INTEGER,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "coverUrl" TEXT,
    "durationMin" INTEGER NOT NULL DEFAULT 30,
    "mode" "BookingMode" NOT NULL DEFAULT 'ZOOM',
    "meetingUrl" TEXT,
    "price" INTEGER NOT NULL DEFAULT 0,
    "isPrivate" BOOLEAN NOT NULL DEFAULT true,
    "formSchema" JSONB NOT NULL DEFAULT '[]',
    "autoConfirm" BOOLEAN NOT NULL DEFAULT true,
    "cancelBeforeHours" INTEGER NOT NULL DEFAULT 3,
    "minNoticeHours" INTEGER NOT NULL DEFAULT 2,
    "maxDaysAhead" INTEGER NOT NULL DEFAULT 30,
    "bufferMin" INTEGER NOT NULL DEFAULT 0,
    "status" "BookingSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpertAvailability" (
    "id" SERIAL NOT NULL,
    "expertId" INTEGER NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startMin" INTEGER NOT NULL,
    "endMin" INTEGER NOT NULL,

    CONSTRAINT "ExpertAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilityException" (
    "id" SERIAL NOT NULL,
    "expertId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "isOff" BOOLEAN NOT NULL DEFAULT true,
    "startMin" INTEGER,
    "endMin" INTEGER,
    "note" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "AvailabilityException_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "expertId" INTEGER NOT NULL,
    "userId" INTEGER,
    "contactId" INTEGER,
    "guestName" TEXT NOT NULL,
    "guestEmail" TEXT NOT NULL,
    "guestPhone" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'HELD',
    "formAnswers" JSONB NOT NULL DEFAULT '{}',
    "source" TEXT,
    "tags" TEXT,
    "holdExpiresAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingWaitlist" (
    "id" SERIAL NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "note" TEXT NOT NULL DEFAULT '',
    "status" "BookingWaitlistStatus" NOT NULL DEFAULT 'WAITING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingWaitlist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BookingSession_code_key" ON "BookingSession"("code");

-- CreateIndex
CREATE INDEX "BookingSession_expertId_status_idx" ON "BookingSession"("expertId", "status");

-- CreateIndex
CREATE INDEX "ExpertAvailability_expertId_weekday_idx" ON "ExpertAvailability"("expertId", "weekday");

-- CreateIndex
CREATE UNIQUE INDEX "ExpertAvailability_expertId_weekday_startMin_key" ON "ExpertAvailability"("expertId", "weekday", "startMin");

-- CreateIndex
CREATE INDEX "AvailabilityException_expertId_date_idx" ON "AvailabilityException"("expertId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "AvailabilityException_expertId_date_key" ON "AvailabilityException"("expertId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_code_key" ON "Booking"("code");

-- CreateIndex
CREATE INDEX "Booking_expertId_startsAt_idx" ON "Booking"("expertId", "startsAt");

-- CreateIndex
CREATE INDEX "Booking_sessionId_startsAt_idx" ON "Booking"("sessionId", "startsAt");

-- CreateIndex
CREATE INDEX "Booking_guestEmail_idx" ON "Booking"("guestEmail");

-- CreateIndex
CREATE INDEX "Booking_status_holdExpiresAt_idx" ON "Booking"("status", "holdExpiresAt");

-- CreateIndex
CREATE INDEX "BookingWaitlist_sessionId_date_status_idx" ON "BookingWaitlist"("sessionId", "date", "status");

-- CreateIndex
CREATE INDEX "BookingWaitlist_email_idx" ON "BookingWaitlist"("email");

-- AddForeignKey
ALTER TABLE "BookingSession" ADD CONSTRAINT "BookingSession_expertId_fkey" FOREIGN KEY ("expertId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingSession" ADD CONSTRAINT "BookingSession_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpertAvailability" ADD CONSTRAINT "ExpertAvailability_expertId_fkey" FOREIGN KEY ("expertId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityException" ADD CONSTRAINT "AvailabilityException_expertId_fkey" FOREIGN KEY ("expertId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "BookingSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_expertId_fkey" FOREIGN KEY ("expertId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "CrmContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingWaitlist" ADD CONSTRAINT "BookingWaitlist_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "BookingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Grant + Rls cho bảng mới (mục G, AGENTS.md của repo; app truy cập qua Prisma direct
-- connection là chính, khối này để tuân thủ chính sách Supabase từ 30/10/2026)
GRANT ALL PRIVILEGES ON TABLE public."BookingSession" TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public."BookingSession" TO service_role;
GRANT SELECT ON TABLE public."BookingSession" TO anon;
GRANT ALL PRIVILEGES ON TABLE public."ExpertAvailability" TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public."ExpertAvailability" TO service_role;
GRANT SELECT ON TABLE public."ExpertAvailability" TO anon;
GRANT ALL PRIVILEGES ON TABLE public."AvailabilityException" TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public."AvailabilityException" TO service_role;
GRANT SELECT ON TABLE public."AvailabilityException" TO anon;
GRANT ALL PRIVILEGES ON TABLE public."Booking" TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public."Booking" TO service_role;
GRANT SELECT ON TABLE public."Booking" TO anon;
GRANT ALL PRIVILEGES ON TABLE public."BookingWaitlist" TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public."BookingWaitlist" TO service_role;
GRANT SELECT ON TABLE public."BookingWaitlist" TO anon;

ALTER TABLE public."BookingSession" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "BookingSession_authenticated_all" ON public."BookingSession" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "BookingSession_anon_select" ON public."BookingSession" FOR SELECT TO anon USING (true);
ALTER TABLE public."ExpertAvailability" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ExpertAvailability_authenticated_all" ON public."ExpertAvailability" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "ExpertAvailability_anon_select" ON public."ExpertAvailability" FOR SELECT TO anon USING (true);
ALTER TABLE public."AvailabilityException" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "AvailabilityException_authenticated_all" ON public."AvailabilityException" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "AvailabilityException_anon_select" ON public."AvailabilityException" FOR SELECT TO anon USING (true);
ALTER TABLE public."Booking" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Booking_authenticated_all" ON public."Booking" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Booking_anon_select" ON public."Booking" FOR SELECT TO anon USING (true);
ALTER TABLE public."BookingWaitlist" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "BookingWaitlist_authenticated_all" ON public."BookingWaitlist" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "BookingWaitlist_anon_select" ON public."BookingWaitlist" FOR SELECT TO anon USING (true);
