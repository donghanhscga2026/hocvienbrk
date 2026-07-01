import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function upsertTool(slug: string, data: any) {
  const existing = await prisma.tool.findFirst({ where: { slug } })
  if (existing) {
    await prisma.tool.update({ where: { id: existing.id }, data })
    console.log(`  ✅ Updated: ${slug}`)
  } else {
    const maxOrder = await prisma.tool.findFirst({ orderBy: { order: 'desc' }, select: { order: true } })
    await prisma.tool.create({ data: { ...data, slug, order: (maxOrder?.order || 0) + 1 } })
    console.log(`  ✅ Created: ${slug}`)
  }
}

async function main() {
  console.log('=== Registering merged tools ===')

  await upsertTool('ho-tro', {
    name: 'Hỗ trợ',
    description: 'bgViolet500| Quản lý trợ lý tài khoản & ảo',
    icon: 'Settings',
    url: '/tools/ho-tro',
    roles: ['ADMIN'],
    isActive: true,
  })

  await upsertTool('pages', {
    name: 'Page',
    description: 'bgOrange500| Trang cá nhân, Landing, Site Profile',
    icon: 'Layout',
    url: '/tools/pages',
    roles: ['STUDENT', 'AFFILIATE', 'TEACHER', 'ADMIN'],
    isActive: true,
  })

  console.log('=== Done! ===')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
