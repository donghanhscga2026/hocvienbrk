-- CreateEnum
CREATE TYPE "EnrollmentMemberRole" AS ENUM ('TV', 'PS');

-- AlterTable
ALTER TABLE "Enrollment"
ADD COLUMN "memberRole" "EnrollmentMemberRole" NOT NULL DEFAULT 'TV',
ADD COLUMN "team" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "group" INTEGER NOT NULL DEFAULT 1;
