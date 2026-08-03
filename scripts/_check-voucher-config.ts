import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const courses = await prisma.course.findMany({
    where: { voucherConfig: { not: 'WALLET' } },
    select: {
      id: true,
      id_khoa: true,
      name_lop: true,
      phi_coc: true,
      feeType: true,
      voucherConfig: true,
      type: true,
      status: true,
    },
    orderBy: { id: 'asc' },
  })

  const feeTypeLabels: Record<string, string> = {
    MIEN_PHI: 'Miễn phí',
    PHI_CAM_KET: 'Phí cam kết',
    PHI_TUY_TINH: 'Phí tùy tâm',
    PHI_DONG_HANH: 'Phí đồng hành',
    PHI_TOI_THIEU: 'Phí tối thiểu',
  }

  console.log(`Tổng khóa học voucherConfig != WALLET: ${courses.length}`)
  console.log('---')
  const byConfig: Record<string, number> = {}
  for (const c of courses) {
    byConfig[c.voucherConfig] = (byConfig[c.voucherConfig] || 0) + 1
    console.log(
      `[${c.voucherConfig}] #${c.id} | ${c.id_khoa} | ${c.name_lop} | phi_coc=${Number(c.phi_coc).toLocaleString('vi-VN')}đ | ${feeTypeLabels[c.feeType] || c.feeType} | type=${c.type} | status=${c.status}`
    )
  }
  console.log('---')
  console.log('Phân loại theo voucherConfig:')
  for (const [k, v] of Object.entries(byConfig)) {
    console.log(`  ${k}: ${v} khóa`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
