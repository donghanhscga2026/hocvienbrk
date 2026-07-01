import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seedSystemTree() {
  console.log('📁 Seeding SystemTree...')

  const systems = [
    { onSystem: 0, nameSystem: 'Học viên' },
    { onSystem: 1, nameSystem: 'TCA' },
    { onSystem: 2, nameSystem: 'KTC' },
    { onSystem: 3, nameSystem: 'YTB' },
    { onSystem: 4, nameSystem: 'BRK' },
  ]

  for (const sys of systems) {
    const existing = await prisma.systemTree.findUnique({
      where: { onSystem: sys.onSystem }
    })

    if (existing) {
      await prisma.systemTree.update({
        where: { onSystem: sys.onSystem },
        data: sys,
      })
      console.log(`   ℹ️ Đã cập nhật: ${sys.nameSystem} (onSystem=${sys.onSystem})`)
    } else {
      await prisma.systemTree.create({ data: sys })
      console.log(`   ✅ Đã tạo: ${sys.nameSystem} (onSystem=${sys.onSystem})`)
    }
  }

  console.log('✅ SystemTree done')
}

async function seedBrkProfile() {
  console.log('📁 Seeding BRK SiteProfile...')

  const existing = await prisma.siteProfile.findUnique({
    where: { slug: 'brk' }
  })

  if (existing) {
    console.log(`   ℹ️ BRK Profile đã tồn tại (ID=${existing.id}), bỏ qua`)
    return
  }

  const defaultTheme = await prisma.theme.findFirst({ where: { isActive: true } })
  const defaultCampaign = await prisma.affiliateCampaign.findFirst({ where: { isDefault: true } })

  const profile = await prisma.siteProfile.create({
    data: {
      slug: 'brk',
      userId: null,
      isActive: true,
      isDefault: true,
      title: 'NGÂN HÀNG PHƯỚC BÁU',
      subtitle: 'Tri thức là sức mạnh',
      heroImage: null,
      heroOverlay: 0.3,
      messageContent: 'Học hôm nay, thành công ngày mai',
      messageDetail: 'BRK mang đến những tri thức thực chiến giúp bạn phát triển bản thân và xây dựng sự nghiệp.',
      messageImage: null,
      showCommunity: true,
      showAllCourses: true,
      communityTitle: 'Cộng đồng BRK',
      coursesTitle: 'Khóa học nổi bật',
      allCoursesTitle: 'Tất cả khóa học',
      footerText: '© 2026 Ngân hàng Phước Báu. Mọi quyền được bảo lưu.',
      metaTitle: 'BRK - Ngân hàng Phước Báu',
      metaDescription: 'Môi trường chia sẻ cùng nhau học tập nâng cao nhận thức và năng lực tạo lập giá trị từ gốc, tích tạo phước báu thuận theo nhân quả',
      themeId: defaultTheme?.id || null,
      ...(defaultCampaign?.id ? { affiliateCampaign: { connect: { id: defaultCampaign.id } } } : {}),
    }
  })

  console.log(`   ✅ Đã tạo BRK Profile (ID=${profile.id})`)
  console.log('✅ SiteProfile done')
}

async function main() {
  console.log('🚀 Bắt đầu seed...\n')

  await seedSystemTree()
  console.log('')
  await seedBrkProfile()

  console.log('\n🎉 Hoàn tất!')
  console.log('')
  console.log('📊 SystemTree entries:', await prisma.systemTree.count())
  console.log('📊 SiteProfile entries:', await prisma.siteProfile.count())
}

main()
  .catch((e) => {
    console.error('❌ Lỗi:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
