/**
 * Script: update-course-theme-100ngay.ts
 * Mục đích: Cập nhật theme tokens cho CoursePage của khóa 100-NGAY-LAN-TOA-TRI-THUC (id=39)
 * theo đúng Design System Spec
 * 
 * Chạy: npx tsx scripts/update-course-theme-100ngay.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const COURSE_ID_KHOA = '100-NGAY-LAN-TOA-TRI-THUC'

const NEW_THEME = {
  primaryColor:     '#C86B3D',
  secondaryColor:   '#C86B3D',
  accentColor:      '#D97949',
  backgroundColor:  '#171823',
  surfaceColor:     '#22242E',
  textColor:        '#F8F1E6',
  mutedTextColor:   '#C8C3BA',
  borderRadius:     '16px',
  buttonRadius:     '8px',
}

async function main() {
  console.log(`\n🎨 Cập nhật theme Design System cho khóa: ${COURSE_ID_KHOA}\n`)

  // Tìm CoursePage theo slug
  const coursePage = await (prisma as any).coursePage.findFirst({
    where: { slug: { contains: '100-ngay', mode: 'insensitive' } },
    select: { id: true, slug: true, name: true, theme: true }
  })

  if (!coursePage) {
    console.error(`❌ Không tìm thấy CoursePage slug chứa '100-ngay'`)
    process.exit(1)
  }

  console.log(`✅ Tìm thấy CoursePage: [${coursePage.id}] slug=${coursePage.slug} name=${coursePage.name}`)

  const oldTheme = coursePage.theme as Record<string, string>
  console.log('\n📌 Theme cũ:')
  Object.entries(oldTheme).forEach(([k, v]) => console.log(`   ${k}: ${v}`))

  // Update
  const updated = await (prisma as any).coursePage.update({
    where: { id: coursePage.id },
    data: { theme: NEW_THEME },
    select: { id: true, theme: true }
  })

  console.log('\n🎉 Theme mới (đã cập nhật):')
  Object.entries(updated.theme as Record<string, string>).forEach(([k, v]) => console.log(`   ${k}: ${v}`))

  console.log('\n✅ Hoàn tất cập nhật theme!\n')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
