import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// [OPTIMIZE] DATABASE_URL giờ trỏ qua Supabase connection pooler (transaction
// mode, cổng 6543, pgbouncer=true) thay vì nối thẳng vào Postgres — pooler tự
// quản lý việc dồn kết nối, nên giữ connection_limit=1 cho mỗi Prisma Client
// (đúng khuyến nghị của Supabase khi dùng transaction-mode pooler), không cần
// tự nâng lên 5 như trước (khi còn nối thẳng, phải tự nới để tránh treo).
const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
