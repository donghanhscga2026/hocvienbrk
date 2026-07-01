import { PrismaClient, Role } from '@prisma/client'

const prisma = new PrismaClient()

const TOOLS = [
  {
    slug: 'landings',
    name: 'Landing Pages',
    description: 'bgPink500|Quản lý các trang đích marketing',
    icon: 'Globe',
    url: '/tools/landings',
    roles: [Role.ADMIN],
    order: 12,
  },
  {
    slug: 'email-settings',
    name: 'Cấu Hình Email',
    description: 'bgBlue500|Cấu hình gửi email',
    icon: 'Settings',
    url: '/tools/email-settings',
    roles: [Role.ADMIN],
    order: 13,
  },
  {
    slug: 'brk',
    name: 'BRK (Phước Báu)',
    description: 'bgAmber500|Hệ thống kinh doanh BRK',
    icon: 'Wallet',
    url: '/tools/brk',
    roles: [Role.STUDENT],
    order: 14,
  },
]

async function main() {
  console.log('🚀 Adding missing tools...')

  for (const tool of TOOLS) {
    const existing = await prisma.tool.findUnique({ where: { slug: tool.slug } })

    if (existing) {
      await prisma.tool.update({
        where: { slug: tool.slug },
        data: tool,
      })
      console.log(`✅ Updated "${tool.name}" (${tool.slug})`)
    } else {
      await prisma.tool.create({
        data: tool,
      })
      console.log(`✅ Created "${tool.name}" (${tool.slug})`)
    }
  }

  console.log('🎉 Done!')
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
