import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const toolName = 'Quản Trị Hệ Thống'
  const toolUrl = '/tools/admin'

  const existingTool = await prisma.tool.findFirst({
    where: { url: toolUrl }
  })

  if (existingTool) {
    console.log('Tool already exists.')
    return
  }

  const maxOrder = await prisma.tool.findFirst({
    orderBy: { order: 'desc' },
    select: { order: true }
  })

  await prisma.tool.create({
    data: {
      name: toolName,
      slug: 'system-admin',
      url: toolUrl,
      icon: 'Settings',
      description: 'bgPurple500 | Quản lý cây hệ thống và các liên kết',
      roles: ['ADMIN'],
      order: (maxOrder?.order || 0) + 1,
      isActive: true
    }
  })

  console.log('Successfully added System Admin tool to database.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
