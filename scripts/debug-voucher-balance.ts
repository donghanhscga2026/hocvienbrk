import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log("=== KIỂM TRA SỐ DƯ VÍ VOUCHER THỰC TẾ ===")
  
  const wallets = await prisma.brkWallet.findMany({
    where: { voucherBalance: { gt: 0 } },
    include: { user: { select: { id: true, name: true, email: true, phone: true } } }
  })
  
  console.log(`Tìm thấy ${wallets.length} ví có số dư > 0:`)
  console.log(JSON.stringify(wallets, null, 2))
}

main()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect())
