import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('==========================================')
  console.log('Adding TCA Sync Tool to database...')
  console.log('==========================================')

  // Check if tool already exists
  const existingTool = await prisma.tool.findFirst({
    where: { slug: 'tca-sync' }
  })

  if (existingTool) {
    console.log('TCA Sync tool already exists. Updating...')
    await prisma.tool.update({
      where: { id: existingTool.id },
      data: {
        name: 'TCA Sync',
        description: 'bgGreen500| Đồng bộ dữ liệu TCA từ Portal',
        icon: 'Settings',
        url: '/tools/tca-sync',
        roles: ['ADMIN'],
        order: 100,
        isActive: true
      }
    })
    console.log('TCA Sync tool updated!')
  } else {
    // Get max order
    const maxOrder = await prisma.tool.findFirst({
      orderBy: { order: 'desc' },
      select: { order: true }
    })

    await prisma.tool.create({
      data: {
        name: 'TCA Sync',
        slug: 'tca-sync',
        description: 'bgGreen500| Đồng bộ dữ liệu TCA từ Portal',
        icon: 'Settings',
        url: '/tools/tca-sync',
        roles: ['ADMIN'],
        order: (maxOrder?.order || 0) + 1,
        isActive: true
      }
    })
    console.log('TCA Sync tool added!')
  }

  console.log('==========================================')
  console.log('Done!')
  console.log('==========================================')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
