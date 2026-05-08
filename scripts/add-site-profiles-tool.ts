import prisma from '../lib/prisma'

async function main() {
  console.log('🚀 Thêm Site Profiles Tool vào database...')

  // Kiểm tra tool đã tồn tại chưa
  const existingTool = await prisma.tool.findFirst({
    where: { slug: 'site-profiles' }
  })

  if (existingTool) {
    console.log('⚠️ Tool Site Profiles đã tồn tại, bỏ qua...')
    console.log(`   Tool ID: ${existingTool.id}`)
    return
  }

  // Tạo tool mới
  const tool = await prisma.tool.create({
    data: {
      slug: 'site-profiles',
      name: 'Site Profiles',
      description: 'bgOrange500|Quản lý trang chủ',
      icon: 'Layout',
      url: '/tools/site-profiles',
      roles: ['ADMIN'],
      order: 1,
      isActive: true
    }
  })

  console.log('✅ Tool Site Profiles đã được tạo thành công!')
  console.log('')
  console.log('📋 Thông tin Tool:')
  console.log(`   ID: ${tool.id}`)
  console.log(`   Name: ${tool.name}`)
  console.log(`   URL: ${tool.url}`)
  console.log(`   Roles: ${tool.roles.join(', ')}`)
  console.log('')
  console.log('🎉 Hoàn tất!')
}

main()
  .catch((e) => {
    console.error('❌ Lỗi khi tạo Tool:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
