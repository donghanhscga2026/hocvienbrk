DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'EnrollmentMode' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public."EnrollmentMode" AS ENUM ('ACTIVE', 'AUDITOR');
  END IF;
END $$;

ALTER TABLE public."Enrollment"
  ALTER COLUMN "studyMode" DROP DEFAULT;

ALTER TABLE public."Enrollment"
  ALTER COLUMN "studyMode" TYPE public."EnrollmentMode"
  USING CAST("studyMode" AS public."EnrollmentMode");

ALTER TABLE public."Enrollment"
  ALTER COLUMN "studyMode" SET DEFAULT 'ACTIVE';
