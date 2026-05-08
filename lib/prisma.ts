import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Cấu hình Prisma với khả năng chịu lỗi và log chi tiết hơn trong môi trường dev
const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasources: {
      db: {
        // Tăng timeout và connection limit để tránh treo server khi DB chậm phản hồi
        url: process.env.DATABASE_URL?.replace('?connection_limit=1', '?connection_limit=5&pool_timeout=10'),
      },
    },
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
