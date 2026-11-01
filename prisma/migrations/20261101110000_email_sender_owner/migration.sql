-- AlterTable
ALTER TABLE "EmailSender" ADD COLUMN     "ownerId" INTEGER;

-- CreateIndex
CREATE INDEX "EmailSender_ownerId_idx" ON "EmailSender"("ownerId");

-- AddForeignKey
ALTER TABLE "EmailSender" ADD CONSTRAINT "EmailSender_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
