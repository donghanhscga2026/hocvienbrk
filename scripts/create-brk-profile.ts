import prisma from '../lib/prisma'

async function main() {
  console.log('🚀 Tạo BRK Default Profile...')

  // Lấy dữ liệu mặc định hiện có
  const defaultMessage = await prisma.message.findFirst({ where: { isActive: true } })
  const defaultTheme = await prisma.theme.findFirst({ where: { isActive: true } })
  const defaultCampaign = await prisma.affiliateCampaign.findFirst({ where: { isDefault: true } })

  // Kiểm tra profile BRK đã tồn tại chưa
  const existingBrk = await prisma.siteProfile.findUnique({
    where: { slug: 'brk' }
  })

  if (existingBrk) {
    console.log('⚠️ BRK Profile đã tồn tại, bỏ qua...')
    console.log(`   Profile ID: ${existingBrk.id}`)
    console.log(`   URL: /brk`)
    return
  }

  // Tạo BRK Profile
  const brkProfile = await prisma.siteProfile.create({
    data: {
      slug: 'brk',
      userId: null,
      isActive: true,
      isDefault: true,
      title: 'NGÂN HÀNG PHƯỚC BÁU',
      subtitle: 'Tri thức là sức mạnh',
      heroImage: null,
      heroOverlay: 0.3,
      messageContent: defaultMessage?.content || 'Học hôm nay, thành công ngày mai',
      messageDetail: defaultMessage?.detail || 'BRK mang đến những tri thức thực chiến giúp bạn phát triển bản thân và xây dựng sự nghiệp.',
      messageImage: defaultMessage?.imageUrl || null,
      showCommunity: true,
      showAllCourses: true,
      communityTitle: 'Cộng đồng BRK',
      coursesTitle: 'Khóa học nổi bật',
      allCoursesTitle: 'Tất cả khóa học',
      footerText: '© 2026 Ngân hàng Phước Báu. Mọi quyền được bảo lưu.',
      metaTitle: 'Học viện BRK - Ngân hàng Phước Báu',
      metaDescription: 'Học viện đào tạo kỹ năng thực chiến hàng đầu Việt Nam',
      themeId: defaultTheme?.id || null,
      affiliateCampaignId: defaultCampaign?.id || null,
    }
  })

  console.log('✅ BRK Profile đã được tạo thành công!')
  console.log('')
  console.log('📋 Thông tin Profile:')
  console.log(`   ID: ${brkProfile.id}`)
  console.log(`   Slug: ${brkProfile.slug}`)
  console.log(`   URL: /${brkProfile.slug}`)
  console.log(`   Tiêu đề: ${brkProfile.title}`)
  console.log(`   Trạng thái: ${brkProfile.isActive ? 'Hoạt động' : 'Không hoạt động'}`)
  console.log('')
  console.log('🎉 Hoàn tất!')
}

main()
  .catch((e) => {
    console.error('❌ Lỗi khi tạo BRK Profile:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
