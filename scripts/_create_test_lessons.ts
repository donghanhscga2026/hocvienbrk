import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Find a course to add test lessons to (course 35 = "Nguồn thu nhập thứ 2")
  // We'll create a new dedicated test course instead
  const courseId = 35

  // Check existing lessons for this course to find next order number
  const existing = await prisma.lesson.findMany({
    where: { courseId },
    orderBy: { order: 'desc' },
    take: 1,
    select: { order: true },
  })
  let nextOrder = existing.length > 0 ? existing[0].order + 1 : 1

  const testLessons = [
    {
      title: '[TEST] YouTube + MP4 Playlist',
      videoUrl:
        '[YT Part]https://www.youtube.com/watch?v=UKa9fFGI140|' +
        '[MP4 Part]https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      type: 'VIDEO' as const,
      order: nextOrder++,
    },
    {
      title: '[TEST] Vimeo',
      videoUrl: 'https://vimeo.com/76979871',
      type: 'VIDEO' as const,
      order: nextOrder++,
    },
    {
      title: '[TEST] Dailymotion',
      videoUrl: 'https://www.dailymotion.com/video/x8d5e1',
      type: 'VIDEO' as const,
      order: nextOrder++,
    },
    {
      title: '[TEST] Direct MP4',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      type: 'VIDEO' as const,
      order: nextOrder++,
    },
  ]

  // DRY-RUN mode
  const isDryRun = !process.argv.includes('--execute')
  if (isDryRun) {
    console.log('=== DRY RUN === (add --execute to actually create)')
    console.log(`Course ID: ${courseId}`)
    console.log(`Will create ${testLessons.length} test lessons:\n`)
    for (const l of testLessons) {
      console.log(`  ${l.order}. ${l.title}`)
      console.log(`     URL: ${l.videoUrl.substring(0, 100)}...`)
    }
    console.log('\nRun with: npx tsx scripts/_create_test_lessons.ts --execute')
    return
  }

  console.log('Creating test lessons...')
  for (const lesson of testLessons) {
    const created = await prisma.lesson.create({
      data: {
        courseId,
        title: lesson.title,
        videoUrl: lesson.videoUrl,
        type: lesson.type,
        order: lesson.order,
      },
    })
    console.log(`  ✅ Created: "${created.title}" (id=${created.id})`)
  }

  console.log(`\nDone! Visit course 35 to test:`)
  console.log(`  http://localhost:3000/courses/${courseId}/learn`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
