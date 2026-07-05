const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  // Show all affected transactions (for Nguyễn Thị Bê and BÙI THỊ PHƯƠNG ANH)
  const affectedUsers = [965, 1010, 1075, 26, 3773];
  
  for (const uid of affectedUsers) {
    const wallet = await prisma.brkWallet.findUnique({ where: { userId: uid } });
    const txns = await prisma.brkTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'asc' }
    });
    const user = await prisma.user.findUnique({ where: { id: uid }, select: { name: true } });
    console.log('\n=== ' + user.name.trim() + ' (#' + uid + ') ===');
    for (const t of txns) {
      console.log(
        '  ' + String(t.type).padEnd(15) +
        ' | ' + String(t.amount).padStart(12) +
        ' | ' + (t.description || '').trim()
      );
    }
  }

  // Summary of what #709 triggered
  console.log('\n\n=== TỔNG KẾT COMMISSION TỪ #709 KÍCH HOẠT ===');
  console.log('Fee: 26,868 | earnPct = 9% | Commission: 26,868 x 9% = 2,418.12');
  console.log('BRKD: 12,868,686 x 9% = 1,158,182');
  console.log('\nNguyễn Thị Bê (#965 Lv2): +2,418.12 VND + 1,158,182 BRKD (9%)');
  console.log('BÙI THỊ PHƯƠNG ANH (#1010 Lv3): +2,418.12 VND + 1,158,182 BRKD (9%)');
  
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
