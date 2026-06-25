'use server'

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seedToolHelp() {
  console.log('Seeding ToolHelp into AssistantGuide...')

  const genealogyGuide = {
    pagePath: '/tools/genealogy',
    title: 'Hướng dẫn Nhân mạch',
    toolSlug: 'genealogy',
    sections: [
      {
        type: 'color_legend',
        title: 'Ý nghĩa màu sắc',
        items: [
          { color: 'emerald', label: 'F1 (Nhánh 1)', desc: 'Người giới thiệu trực tiếp - chỉ có F1, chưa có F2 trở lên' },
          { color: 'sky', label: 'F2 (Nhánh 2)', desc: 'Người giới thiệu của F1 - có F2 (con của F1)' },
          { color: 'rose', label: 'F3+ (Nhánh 3+)', desc: 'Có F3 hoặc nhiều hơn - cây phân nhánh sâu hơn' }
        ]
      },
      {
        type: 'features',
        title: 'Các tính năng',
        items: [
          { feature: 'Chọn hệ thống', text: 'Dropdown chọn Học viên/TCA/KTC để xem cây tương ứng' },
          { feature: 'XEM', text: 'Tải và hiển thị cây nhân mạch của hệ thống đã chọn' },
          { feature: 'SỬA', text: 'Bật chế độ chỉnh sửa để thêm F1 mới hoặc xóa node' },
          { feature: 'Tìm kiếm', text: 'Nhập ID user để tìm nhanh vị trí trong cây' },
          { feature: 'Tạo mới', text: 'Admin tạo node root cho hệ thống mới (khi chưa có dữ liệu)' }
        ]
      },
      {
        type: 'tips',
        title: 'Mẹo sử dụng',
        items: [
          { text: 'Nhấn vào node để xem chi tiết thông tin' },
          { text: 'Dùng nút + để thêm F1 cho một node' },
          { text: 'Dùng nút X để xóa một node (chỉ khi không có con)' },
          { text: 'Chế độ Full hiển thị đầy đủ F1, F2, F3 cùng lúc' }
        ]
      }
    ],
    isActive: true
  }

  const existing = await prisma.assistantGuide.findFirst({
    where: { toolSlug: 'genealogy' }
  })

  if (!existing) {
    await prisma.assistantGuide.create({ data: genealogyGuide })
    console.log('Created: genealogy tool guide')
  } else {
    await prisma.assistantGuide.update({
      where: { id: existing.id },
      data: genealogyGuide
    })
    console.log('Updated: genealogy tool guide')
  }

  console.log('Seed completed!')
}

seedToolHelp()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
