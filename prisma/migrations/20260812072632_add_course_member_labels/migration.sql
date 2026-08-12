-- AlterTable
ALTER TABLE "Course"
ADD COLUMN "memberLabels" JSONB NOT NULL DEFAULT '{}';
