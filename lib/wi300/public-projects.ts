import { unstable_cache } from 'next/cache'
import prisma from '@/lib/prisma'
import { readPublicProjects } from '@/lib/wi300/project-service'

/**
 * Danh sách dự án Wi công khai cho các bề mặt hiển thị (trang chủ Wi300,
 * trang dự án, huy hiệu dự án trên trang khóa học).
 *
 * [OPTIMIZE] readPublicProjects đọc + gộp toàn bộ cấu hình dự án từ
 * SystemConfig ở mọi lượt xem. Bọc unstable_cache 300 giây tại đây — tách
 * khỏi project-service để readPublicProjects gốc giữ nguyên hành vi tươi
 * cho quản trị và các test nghiệp vụ dự án.
 */
export const getPublicProjects = unstable_cache(
  async () => readPublicProjects(prisma),
  ['wi300-public-projects-v1'],
  { revalidate: 300, tags: ['wi300-public-projects'] },
)
