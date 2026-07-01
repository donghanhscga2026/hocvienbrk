import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seedMessages() {
  console.log('📁 Seeding Messages...')

  const messages = [
    { content: 'Học hôm nay, thành công ngày mai', detail: 'BRK mang đến những tri thức thực chiến giúp bạn phát triển bản thân và xây dựng sự nghiệp.' },
    { content: 'Đầu tư vào tri thức là đầu tư sinh lợi nhất', detail: 'Mỗi ngày học một điều mới là mỗi ngày bạn đang xây dựng tương lai vững chắc.' },
    { content: 'Thành công không phải đích đến, mà là hành trình', detail: 'Hãy tận hưởng từng bước đi trên con đường phát triển bản thân.' },
    { content: 'Tri thức là sức mạnh - Nâng tầm năng lực thực chiến', detail: 'BRK đồng hành cùng bạn trên con đường chinh phục tri thức và kiến tạo giá trị.' },
    { content: 'Kết nối - Chia sẻ - Phát triển', detail: 'Cùng nhau học tập, cùng nhau lớn mạnh trong cộng đồng BRK.' },
  ]

  for (const msg of messages) {
    await prisma.message.create({ data: { ...msg, isActive: true } })
  }

  console.log(`   ✅ ${messages.length} messages created`)
}

async function seedPostCategories() {
  console.log('📁 Seeding PostCategories...')

  const categories = [
    { name: 'Thông báo', slug: 'thong-bao', description: 'Thông báo từ Học viện BRK', order: 1 },
    { name: 'Chia sẻ', slug: 'chia-se', description: 'Bài viết chia sẻ từ cộng đồng', order: 2 },
  ]

  for (const cat of categories) {
    await prisma.postCategory.upsert({
      where: { slug: cat.slug },
      update: cat,
      create: cat,
    })
  }

  console.log(`   ✅ ${categories.length} post categories created`)
}

async function seedPosts() {
  console.log('📁 Seeding Posts...')

  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' }, orderBy: { id: 'asc' } })
  if (!admin) { console.log('   ⚠️ No admin found, skipping posts'); return }

  const category = await prisma.postCategory.findFirst({ where: { slug: 'thong-bao' } })

  const posts = [
    {
      title: 'Chào mừng bạn đến với Học viện BRK',
      content: `Chào mừng bạn đến với Học viện BRK - Ngân hàng Phước Báu!

Đây là nơi chúng ta cùng nhau học tập, chia sẻ và phát triển. BRK cam kết mang đến những giá trị thực chiến nhất giúp bạn nâng tầm năng lực và kiến tạo thành công.

Hãy bắt đầu hành trình của bạn ngay hôm nay!`,
      published: true,
      pin: true,
      authorId: admin.id,
      categoryId: category?.id || null,
    },
    {
      title: 'Hướng dẫn sử dụng các công cụ học tập',
      content: `Học viện BRK cung cấp đầy đủ các công cụ hỗ trợ học tập:

1. 📹 YouTube Tools - Quản lý video học tập
2. 📧 Email MKT - Tiếp thị qua email
3. 🌳 Nhân Mạch - Quản lý cây phả hệ
4. 🎯 Lộ Trình - Xây dựng lộ trình học cá nhân hóa

Hãy khám phá tất cả công cụ tại mục "Công cụ" trên thanh điều hướng.`,
      published: true,
      pin: false,
      authorId: admin.id,
      categoryId: category?.id || null,
    },
    {
      title: 'Cộng đồng BRK - Kết nối và phát triển',
      content: `Cộng đồng BRK là nơi hội tụ những người cùng chí hướng, cùng nhau học tập và phát triển.

Tại đây, bạn có thể:
• 🤝 Kết nối với các học viên khác
• 💡 Chia sẻ kiến thức và kinh nghiệm
• 📚 Học hỏi từ những người đi trước
• 🌟 Tham gia các sự kiện và thử thách

Chúng tôi tin rằng, sức mạnh của cộng đồng sẽ giúp mỗi cá nhân phát triển vượt bậc.`,
      published: true,
      pin: false,
      authorId: admin.id,
      categoryId: category?.id || null,
    },
  ]

  for (const post of posts) {
    await prisma.post.create({ data: post })
  }

  console.log(`   ✅ ${posts.length} posts created`)
}

async function seedRoadmapPoints() {
  console.log('📁 Seeding RoadmapPoints...')

  const points = [
    { pointId: 1, name: 'Nền tảng số', courseIds: '1,6,10' },
    { pointId: 2, name: 'Nhân hiệu', courseIds: '2,9,11' },
    { pointId: 3, name: 'Bán hàng', courseIds: '3,4,12' },
    { pointId: 4, name: 'Nội dung số', courseIds: '5,7,8' },
    { pointId: 5, name: 'Ứng dụng AI', courseIds: '11,12' },
  ]

  for (const pt of points) {
    await prisma.roadmapPoint.upsert({
      where: { pointId: pt.pointId },
      update: pt,
      create: pt,
    })
  }

  console.log(`   ✅ ${points.length} roadmap points created`)
}

async function seedSurvey() {
  console.log('📁 Seeding Survey...')

  const existing = await prisma.survey.findFirst({ where: { isActive: true } })
  if (existing) {
    console.log(`   ℹ️ Active survey already exists (ID=${existing.id}), skipping`)
    return
  }

  const courses = await prisma.course.findMany({ where: { status: true }, select: { id: true, name_lop: true } })
  const courseMap = Object.fromEntries(courses.map(c => [c.id, c.name_lop]))

  const flow = {
    nodes: [
      {
        id: 'q1',
        type: 'questionNode',
        position: { x: 400, y: 50 },
        data: { label: 'Bạn muốn học để làm gì?', type: 'CHOICE', description: 'Xác định hướng đi chính của bạn tại Học viện BRK.' },
      },
      {
        id: 'opt_q1_branding',
        type: 'optionNode',
        position: { x: 100, y: 300 },
        data: { label: 'Xây dựng nhân hiệu' },
      },
      {
        id: 'opt_q1_selling',
        type: 'optionNode',
        position: { x: 400, y: 300 },
        data: { label: 'Bán hàng online' },
      },
      {
        id: 'opt_q1_spreading',
        type: 'optionNode',
        position: { x: 700, y: 300 },
        data: { label: 'Lan tỏa giá trị' },
      },
      {
        id: `course_2`,
        type: 'courseNode',
        position: { x: 100, y: 500 },
        data: { courseId: 2, courseName: courseMap[2] || 'Nhân hiệu từ gốc', pointId: 2 },
      },
      {
        id: `course_9`,
        type: 'courseNode',
        position: { x: 100, y: 680 },
        data: { courseId: 9, courseName: courseMap[9] || 'Tạo ảnh Nhân hiệu với AI', pointId: 2 },
      },
      {
        id: `course_3`,
        type: 'courseNode',
        position: { x: 400, y: 500 },
        data: { courseId: 3, courseName: courseMap[3] || 'Tiếp thị liên kết', pointId: 3 },
      },
      {
        id: `course_4`,
        type: 'courseNode',
        position: { x: 400, y: 680 },
        data: { courseId: 4, courseName: courseMap[4] || 'Live stream bán hàng', pointId: 3 },
      },
      {
        id: `course_5`,
        type: 'courseNode',
        position: { x: 700, y: 500 },
        data: { courseId: 5, courseName: courseMap[5] || 'Lan tỏa tri thức', pointId: 4 },
      },
      {
        id: 'finish_goal',
        type: 'finishNode',
        position: { x: 400, y: 870 },
        data: { label: 'Chốt mục tiêu', type: 'INPUT_GOAL' },
      },
    ],
    edges: [
      { id: 'e_q1_branding', source: 'q1', target: 'opt_q1_branding' },
      { id: 'e_q1_selling', source: 'q1', target: 'opt_q1_selling' },
      { id: 'e_q1_spreading', source: 'q1', target: 'opt_q1_spreading' },
      { id: 'e_branding_c2', source: 'opt_q1_branding', target: `course_2` },
      { id: 'e_branding_c9', source: `course_2`, target: `course_9` },
      { id: 'e_selling_c3', source: 'opt_q1_selling', target: `course_3` },
      { id: 'e_selling_c4', source: `course_3`, target: `course_4` },
      { id: 'e_spreading_c5', source: 'opt_q1_spreading', target: `course_5` },
      { id: 'e_c9_finish', source: `course_9`, target: 'finish_goal' },
      { id: 'e_c4_finish', source: `course_4`, target: 'finish_goal' },
      { id: 'e_c5_finish', source: `course_5`, target: 'finish_goal' },
    ],
  }

  await prisma.survey.create({
    data: {
      name: 'Khảo sát định hướng BRK',
      description: 'Bài khảo sát giúp xác định lộ trình học tập phù hợp với bạn',
      flow: JSON.parse(JSON.stringify(flow)),
      isActive: true,
    },
  })

  console.log('   ✅ Survey created with react-flow format')
}

async function main() {
  console.log('🚀 Bắt đầu seed dữ liệu cho trang chủ...\n')

  await seedMessages()
  console.log('')
  await seedPostCategories()
  console.log('')
  await seedPosts()
  console.log('')
  await seedRoadmapPoints()
  console.log('')
  await seedSurvey()

  console.log('\n🎉 Hoàn tất!')
  console.log(`📊 Messages: ${await prisma.message.count()}`)
  console.log(`📊 Posts: ${await prisma.post.count()}`)
  console.log(`📊 PostCategories: ${await prisma.postCategory.count()}`)
  console.log(`📊 RoadmapPoints: ${await prisma.roadmapPoint.count()}`)
  console.log(`📊 Surveys: ${await prisma.survey.count()}`)
}

main()
  .catch(e => {
    console.error('❌ Lỗi:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
