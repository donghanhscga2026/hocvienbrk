import { PrismaClient, Role } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const tool = await prisma.tool.findUnique({ where: { slug: 'my-site' } })
  if (!tool) {
    console.log('Tool my-site NOT found. Creating...')
    await prisma.tool.create({
      data: {
        slug: 'my-site',
        name: 'Trang của tôi',
        description: 'bgEmerald500|Quản lý trang chủ cá nhân',
        icon: 'Layout',
        url: '/tools/my-site',
        roles: [Role.TEACHER],
        order: 2,
        isActive: true
      }
    })
    console.log('Tool my-site created successfully.')
  } else {
    console.log('Tool my-site already exists:', tool)
  }
}

main().finally(() => prisma.$disconnect())
