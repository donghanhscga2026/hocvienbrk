import { PrismaClient, Role } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const tool = await prisma.tool.upsert({
    where: { slug: 'assistant-guide' },
    update: {},
    create: {
      slug: 'assistant-guide',
      name: 'Trợ lý ảo',
      description: 'bgViolet500|Quản lý nội dung trợ lý toàn trang',
      icon: 'Settings',
      url: '/tools/assistant-guide',
      roles: [Role.ADMIN],
      order: 12,
      isActive: true,
    },
  })

  console.log(`Tool "${tool.name}" (${tool.slug}) ready.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
