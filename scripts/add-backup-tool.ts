import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('==========================================')
  console.log('Adding Backup Tool to database...')
  console.log('==========================================')

  const existingTool = await prisma.tool.findFirst({
    where: { slug: 'backup' }
  })

  if (existingTool) {
    console.log('Backup tool already exists. Updating...')
    await prisma.tool.update({
      where: { id: existingTool.id },
      data: {
        name: 'Sao lưu dữ liệu',
        description: 'bgBlue500| Sao lưu & khôi phục CSDL',
        icon: 'HardDrive',
        url: '/tools/backup',
        roles: ['ADMIN'],
        order: 100,
        isActive: true
      }
    })
    console.log('Backup tool updated!')
  } else {
    const maxOrder = await prisma.tool.findFirst({
      orderBy: { order: 'desc' },
      select: { order: true }
    })

    await prisma.tool.create({
      data: {
        name: 'Sao lưu dữ liệu',
        slug: 'backup',
        description: 'bgBlue500| Sao lưu & khôi phục CSDL',
        icon: 'HardDrive',
        url: '/tools/backup',
        roles: ['ADMIN'],
        order: (maxOrder?.order || 0) + 1,
        isActive: true
      }
    })
    console.log('Backup tool added!')
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
