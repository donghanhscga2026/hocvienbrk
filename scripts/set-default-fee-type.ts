const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Setting default feeType based on phi_coc...\n')

  const courses = await prisma.course.findMany({
    select: { id: true, id_khoa: true, name_lop: true, phi_coc: true, feeType: true }
  })

  let updated = 0
  for (const c of courses) {
    if (c.phi_coc === 0 && c.feeType !== 'MIEN_PHI') {
      await prisma.course.update({ where: { id: c.id }, data: { feeType: 'MIEN_PHI' } })
      console.log(`  ✅ #${c.id} ${c.id_khoa} → MIEN_PHI (phi_coc=0)`)
      updated++
    } else if (c.phi_coc > 0 && c.feeType === 'MIEN_PHI') {
      await prisma.course.update({ where: { id: c.id }, data: { feeType: 'PHI_CAM_KET' } })
      console.log(`  ✅ #${c.id} ${c.id_khoa} → PHI_CAM_KET (phi_coc=${c.phi_coc})`)
      updated++
    } else {
      console.log(`  ⏭️ #${c.id} ${c.id_khoa} — already ${c.feeType}, skip`)
    }
  }

  console.log(`\n✅ Done. Updated ${updated}/${courses.length} courses.`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
