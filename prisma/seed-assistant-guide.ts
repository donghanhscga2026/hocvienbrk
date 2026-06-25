import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const guides = [
  {
    pagePath: '/',
    title: 'Chào mừng đến với BRK',
    script: 'Chào mừng bạn đến với Học viện BRK - Ngân hàng Phước Báu. Tôi là trợ lý ảo của bạn. Tại đây, bạn có thể khám phá các khóa học, theo dõi lộ trình phát triển bản thân và kết nối với cộng đồng. Hãy bắt đầu hành trình của bạn ngay hôm nay!',
    textContent: `Chào mừng bạn đến với Học viện BRK!

BRK - Ngân hàng Phước Báu là nền tảng đào tạo trực tuyến, nơi bạn có thể:
• Khám phá các khóa học đa dạng về Nội tâm, Sức khỏe, Mối quan hệ, Tài chính - Kinh doanh - Đầu tư và Công nghệ AI
• Theo dõi lộ trình phát triển cá nhân
• Kết nối với cộng đồng học viên
• Tham gia hệ thống Affiliate để kiếm thêm thu nhập

Hãy sử dụng menu điều hướng phía trên để bắt đầu!`,
    videoUrl: null,
    agentVideoUrl: null,
  },
  {
    pagePath: '/tools',
    title: 'Hướng dẫn Tools',
    script: 'Đây là trang công cụ dành cho học viên và quản trị viên. Bạn có thể quản lý khóa học, học viên, thanh toán, cây nhân mạch và nhiều tính năng khác. Chọn một công cụ từ danh sách để bắt đầu.',
    textContent: `Trang Tools tập hợp tất cả công cụ quản trị và học tập:

• Quản lý Khóa học: Thêm, sửa, xóa bài giảng
• Quản lý Học viên: Xem danh sách, thông tin chi tiết
• Quản lý Thanh toán: Xác nhận và theo dõi giao dịch
• Cây Nhân mạch: Theo dõi hệ thống tổ chức
• Email Marketing: Tạo chiến dịch email
• Affiliate: Quản lý hoa hồng và liên kết

Chọn một công cụ từ menu bên trái hoặc danh sách bên dưới.`,
    videoUrl: null,
    agentVideoUrl: null,
  },
]

async function main() {
  console.log('Seeding assistant guides...')

  for (const guide of guides) {
    await prisma.assistantGuide.upsert({
      where: { pagePath: guide.pagePath },
      update: {
        title: guide.title,
        script: guide.script,
        textContent: guide.textContent,
        videoUrl: guide.videoUrl,
        isActive: true,
      },
      create: {
        pagePath: guide.pagePath,
        title: guide.title,
        script: guide.script,
        textContent: guide.textContent,
        videoUrl: guide.videoUrl,
        isActive: true,
      },
    })
    console.log(`  ✓ Guide for "${guide.pagePath}"`)
  }

  console.log('Seeding assistant guides completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
