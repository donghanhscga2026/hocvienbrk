/**
 * Seed Affiliate v2 — Phase 1 (schema mới, chưa có engine tính hoa hồng).
 *
 * Chế độ dry-run MẶC ĐỊNH: chỉ in ra những gì sẽ thay đổi, KHÔNG ghi DB.
 * Thực thi:           npx tsx prisma/seed-affiliate-v2.ts --execute
 * Dry-run:            npx tsx prisma/seed-affiliate-v2.ts
 *
 * Cần biến môi trường DATABASE_URL trỏ tới DB muốn seed.
 * LƯU Ý: chạy `npx prisma generate` với schema mới TRƯỚC khi chạy script này,
 * vì @prisma/client phải có các model mới (SystemAffiliateConfig, ProductAffiliateConfig).
 * KHÔNG chạy vào production khi chưa có phê duyệt.
 *
 * Nội dung seed (idempotent — chạy lại nhiều lần an toàn):
 *  (a) Upsert SystemAffiliateConfig id=1 (cấu hình chung, singleton):
 *      gratitudeRate=2 (hoa hồng tri ân 2%), taxRate=0 (chờ cập nhật theo
 *      quy định thuế mới nhất), pendingDays=30, minPayout=200000.
 *  (b) Với mỗi Course hiện có: upsert ProductAffiliateConfig
 *      { productType: 'COURSE', productId: course.id, directRate: 10, isActive: true }
 *      — tỷ lệ trực tiếp mặc định 10% (= F1 của engine cũ), admin/teacher chỉnh
 *      lại từng khóa trong UI cấu hình ở Phase 2/3.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const EXECUTE = process.argv.includes('--execute')

async function main() {
  console.log(`Chế độ: ${EXECUTE ? 'THỰC THI (ghi DB)' : 'DRY-RUN (chỉ xem, không ghi)'}`)

  // ── (a) SystemAffiliateConfig (singleton id=1) ──────────────────────────
  const sysCfg = {
    gratitudeRate: 2,
    taxRate: 0,
    pendingDays: 30,
    minPayout: 200000,
  }
  const existingSys = await (prisma as any).systemAffiliateConfig.findUnique({ where: { id: 1 } })
  console.log(
    `- [SystemAffiliateConfig#1] ${existingSys ? 'Cập nhật' : 'Tạo mới'}: ` +
    `gratitudeRate=${sysCfg.gratitudeRate}%, taxRate=${sysCfg.taxRate} (chờ quy định mới), ` +
    `pendingDays=${sysCfg.pendingDays}, minPayout=${sysCfg.minPayout}`,
  )
  if (EXECUTE) {
    await (prisma as any).systemAffiliateConfig.upsert({
      where: { id: 1 },
      update: { ...sysCfg },
      create: { id: 1, ...sysCfg },
    })
  }

  // ── (b) ProductAffiliateConfig cho từng Course ──────────────────────────
  const courses = await prisma.course.findMany({
    select: { id: true, name_khoa: true, name_lop: true },
    orderBy: { id: 'asc' },
  })
  console.log(`\nSố khóa học trong DB: ${courses.length}`)

  let created = 0
  let kept = 0
  for (const c of courses) {
    const label = c.name_khoa || c.name_lop || `Course #${c.id}`
    const existing = await (prisma as any).productAffiliateConfig.findUnique({
      where: { productType_productId: { productType: 'COURSE', productId: c.id } },
    })
    if (existing) {
      kept++
      console.log(`- [COURSE#${c.id}] "${label}" — đã có config (giữ nguyên, không ghi đè)`)
      continue
    }
    created++
    console.log(`- [COURSE#${c.id}] "${label}" — ${EXECUTE ? 'tạo' : 'sẽ tạo'} config: directRate=10%, isActive=true`)
    if (EXECUTE) {
      await (prisma as any).productAffiliateConfig.create({
        data: { productType: 'COURSE', productId: c.id, directRate: 10, isActive: true },
      })
    }
  }

  console.log(`\nTổng: ${courses.length} khóa học — ${created} tạo mới, ${kept} giữ nguyên.`)
  if (!EXECUTE) {
    console.log('Dry-run xong — chưa ghi gì vào DB. Thêm --execute để thực thi (cần phê duyệt trước khi chạy vào production).')
  }
}

main()
  .catch((e) => {
    console.error('Seed lỗi:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
