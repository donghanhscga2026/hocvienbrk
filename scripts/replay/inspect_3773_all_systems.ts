import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const userId = 3773

  console.log("=== KIỂM TRA THÀNH VIÊN #3773 TRÊN TẤT CẢ CÁC BẢNG ===")

  // 1. Thông tin user gốc
  const user = await prisma.user.findUnique({ where: { id: userId } })
  console.log("User gốc:", { id: user?.id, name: user?.name, email: user?.email, phone: user?.phone })

  // 2. TCA Member (Hệ thống 1)
  const tca = await prisma.tCAMember.findFirst({ where: { userId } })
  console.log("\nTCAMember (Hệ thống 1 - TCA):", tca ? {
    level: tca.level,
    personalScore: Number(tca.personalScore),
    totalScore: Number(tca.totalScore),
    chuc_danh: tca.chuc_danh,
    tcaId: tca.tcaId
  } : "Không tồn tại")

  // 3. System 1 (TCA)
  const sys1 = await prisma.system.findUnique({ where: { userId_onSystem: { userId, onSystem: 1 } } })
  console.log("\nSystem #1 (TCA):", sys1 ? {
    autoId: sys1.autoId,
    level: sys1.level,
    totalPoints: Number(sys1.totalPoints)
  } : "Không tồn tại")

  // 4. System 4 (MB - Ngân hàng phước báu)
  const sys4 = await prisma.system.findUnique({ where: { userId_onSystem: { userId, onSystem: 4 } } })
  console.log("\nSystem #4 (MB - Ngân hàng phước báu):", sys4 ? {
    autoId: sys4.autoId,
    level: sys4.level,
    totalPoints: Number(sys4.totalPoints)
  } : "Không tồn tại")

  // 5. Ví BRK Wallet chung
  const wallet = await prisma.brkWallet.findUnique({ where: { userId } })
  console.log("\nVí BRK Wallet chung:", wallet ? {
    balance: Number(wallet.balance),
    brkd: Number(wallet.brkd),
    voucherBalance: Number(wallet.voucherBalance),
    totalEarned: Number(wallet.totalEarned)
  } : "Không tồn tại")
}

main().finally(() => prisma.$disconnect())
