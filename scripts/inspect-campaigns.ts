import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const senders = await prisma.emailSender.findMany({ orderBy: { createdAt: 'desc' } })
  for (const s of senders) {
    const effectiveLimit = Math.min(
      s.dailyLimit,
      (() => { const days = Math.floor((Date.now() - s.createdAt.getTime()) / 86400000); if (days < 7) return 10; if (days < 14) return 25; if (days < 21) return 50; if (days < 30) return 100; return 200; })()
    )
    const inCooldown = s.cooldownUntil && s.cooldownUntil > new Date()
    const hasQuota = s.sentToday < effectiveLimit
    console.log(
      '#' + s.id + ' | ' + s.email + ' | active:' + s.isActive +
      ' | sentToday:' + s.sentToday + '/' + effectiveLimit +
      ' | cooldown:' + (inCooldown ? 'YES until ' + s.cooldownUntil : 'NO') +
      ' | ok:' + (s.isActive && !inCooldown && hasQuota)
    )
  }
}
main().catch(e => console.error(e)).finally(() => prisma.$disconnect())
