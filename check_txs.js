const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const txs = await prisma.brkTransaction.findMany({
        where: { walletId: 3066 },
        orderBy: { createdAt: 'asc' }
    });
    console.log(JSON.stringify(txs, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
