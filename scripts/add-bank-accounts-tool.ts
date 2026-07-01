import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('==========================================')
  console.log('Adding Bank Accounts Tool to database...')
  console.log('==========================================')

  const existingTool = await prisma.tool.findFirst({
    where: { slug: 'bank-accounts' }
  })

  if (existingTool) {
    console.log('Bank Accounts tool already exists. Updating...')
    await prisma.tool.update({
      where: { id: existingTool.id },
      data: {
        name: 'Tài khoản nhận tiền',
        description: 'bgGreen500| Quản lý TK ngân hàng',
        icon: 'CreditCard',
        url: '/tools/bank-accounts',
        roles: ['ADMIN'],
        order: 95,
        isActive: true
      }
    })
    console.log('Bank Accounts tool updated!')
  } else {
    const maxOrder = await prisma.tool.findFirst({
      orderBy: { order: 'desc' },
      select: { order: true }
    })

    await prisma.tool.create({
      data: {
        name: 'Tài khoản nhận tiền',
        slug: 'bank-accounts',
        description: 'bgGreen500| Quản lý TK ngân hàng',
        icon: 'CreditCard',
        url: '/tools/bank-accounts',
        roles: ['ADMIN'],
        order: (maxOrder?.order || 0) + 1,
        isActive: true
      }
    })
    console.log('Bank Accounts tool added!')
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
