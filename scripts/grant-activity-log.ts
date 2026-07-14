import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const table = 'public."activity_log"';

  await prisma.$executeRawUnsafe(`GRANT ALL PRIVILEGES ON TABLE ${table} TO authenticated`);
  await prisma.$executeRawUnsafe(`GRANT ALL PRIVILEGES ON TABLE ${table} TO service_role`);
  await prisma.$executeRawUnsafe(`GRANT SELECT ON TABLE ${table} TO anon`);
  await prisma.$executeRawUnsafe(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);

  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'activity_log_authenticated_all') THEN
        CREATE POLICY activity_log_authenticated_all ON ${table}
          FOR ALL TO authenticated USING (true) WITH CHECK (true);
      END IF;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'activity_log_anon_select') THEN
        CREATE POLICY activity_log_anon_select ON ${table}
          FOR SELECT TO anon USING (true);
      END IF;
    END $$;
  `);

  console.log("GRANTs + RLS for activity_log done");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
