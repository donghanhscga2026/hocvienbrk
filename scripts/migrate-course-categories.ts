import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'
import * as path from 'path'

config({ path: path.resolve(process.cwd(), '.env.local') })

const prisma = new PrismaClient()

const DEFAULT_COLORS = [
  '#6366f1', // Indigo
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#ef4444', // Red
  '#8b5cf6', // Violet
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#84cc16', // Lime
  '#ec4899', // Pink
  '#14b8a6', // Teal
]

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[àáảãạâầấẩẫậăằắẳẵặ]/g, 'a')
    .replace(/[èéẻẽẹêềếểễệ]/g, 'e')
    .replace(/[ìíỉĩị]/g, 'i')
    .replace(/[òóỏõọôồốổỗộơờớởỡợ]/g, 'o')
    .replace(/[ùúủũụưừứửữự]/g, 'u')
    .replace(/[ỳýỷỹỵ]/g, 'y')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

async function main() {
  console.log('=== Migrate Course Categories ===')

  // 1. Get distinct categories from Course
  const distinct = await prisma.course.findMany({
    select: { category: true },
    distinct: ['category'],
  })
  const distinctCategories = distinct.map(c => c.category)

  console.log(`Found ${distinctCategories.length} distinct categories: ${distinctCategories.join(', ')}`)

  // 2. Create CourseCategory for each
  const categoryMap: Record<string, number> = {}
  let colorIdx = 0

  for (const catName of distinctCategories) {
    const slug = slugify(catName)
    const existing = await prisma.courseCategory.findUnique({ where: { slug } })
    if (existing) {
      console.log(`  Category "${catName}" already exists (id=${existing.id})`)
      categoryMap[catName] = existing.id
      continue
    }

    const created = await prisma.courseCategory.create({
      data: {
        name: catName,
        slug,
        order: 0,
        color: DEFAULT_COLORS[colorIdx % DEFAULT_COLORS.length],
      },
    })
    console.log(`  Created category "${catName}" (id=${created.id}, slug=${slug})`)
    categoryMap[catName] = created.id
    colorIdx++
  }

  // 3. Update courses with categoryId
  for (const [catName, catId] of Object.entries(categoryMap)) {
    const result = await prisma.course.updateMany({
      where: { category: catName, categoryId: null },
      data: { categoryId: catId },
    })
    if (result.count > 0) {
      console.log(`  Updated ${result.count} courses: "${catName}" → categoryId=${catId}`)
    }
  }

  const totalCourses = await prisma.course.count()
  const withCategory = await prisma.course.count({ where: { categoryId: { not: null } } })
  const withoutCategory = totalCourses - withCategory

  console.log(`\n=== Summary ===`)
  console.log(`Total courses: ${totalCourses}`)
  console.log(`With categoryId: ${withCategory}`)
  console.log(`Without categoryId: ${withoutCategory}`)
  console.log('=== Done! ===')
}

main()
  .catch((e) => {
    console.error('ERROR:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
