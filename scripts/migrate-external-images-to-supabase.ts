// Migrate ảnh bìa khoá học / ảnh bài viết đang trỏ tới các host ngoài không ổn
// định (postimg.cc, imgur, ibb.co...) sang Supabase Storage, dùng chung logic
// tải-nén-upload với resolveImageUrl() trong lib/image-utils.ts (áp dụng khi
// admin dán link mới). Chạy 1 lần để dứt điểm dữ liệu ảnh cũ đang gây lỗi
// "upstream image response timed out" ở next/image.
//
// Chạy: npm run migrate-external-images
import prisma from '../lib/prisma'
import { resolveImageUrl } from '../lib/image-utils'

const EXTERNAL_HOSTS = ['postimg.cc', 'i.imgur.com', 'imgur.com', 'i.ibb.co', 'ibb.co']

function isExternalHost(url: string): boolean {
    try {
        const hostname = new URL(url).hostname.toLowerCase()
        return EXTERNAL_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`))
    } catch {
        return false
    }
}

async function migrateCourses() {
    const courses = await prisma.course.findMany({
        where: { link_anh_bia: { not: null } },
        select: { id: true, id_khoa: true, link_anh_bia: true }
    })

    const targets = courses.filter((c) => c.link_anh_bia && isExternalHost(c.link_anh_bia))
    console.log(`\n📚 Khoá học cần migrate: ${targets.length}/${courses.length}`)

    let migrated = 0
    let failed = 0
    for (const course of targets) {
        const newUrl = await resolveImageUrl(course.link_anh_bia, 'courses')
        if (newUrl && newUrl !== course.link_anh_bia) {
            await prisma.course.update({ where: { id: course.id }, data: { link_anh_bia: newUrl } })
            console.log(`  ✅ [${course.id_khoa}] ${course.link_anh_bia} -> ${newUrl}`)
            migrated++
        } else {
            console.warn(`  ⚠️ [${course.id_khoa}] Không migrate được, giữ nguyên: ${course.link_anh_bia}`)
            failed++
        }
    }
    console.log(`📚 Khoá học: ${migrated} thành công, ${failed} thất bại/giữ nguyên`)
}

async function migratePosts() {
    const posts = await prisma.post.findMany({
        where: { image: { not: null } },
        select: { id: true, title: true, image: true }
    })

    const targets = posts.filter((p) => p.image && isExternalHost(p.image))
    console.log(`\n📝 Bài viết cần migrate: ${targets.length}/${posts.length}`)

    let migrated = 0
    let failed = 0
    for (const post of targets) {
        const newUrl = await resolveImageUrl(post.image, 'posts')
        if (newUrl && newUrl !== post.image) {
            await prisma.post.update({ where: { id: post.id }, data: { image: newUrl } })
            console.log(`  ✅ [${post.title}] ${post.image} -> ${newUrl}`)
            migrated++
        } else {
            console.warn(`  ⚠️ [${post.title}] Không migrate được, giữ nguyên: ${post.image}`)
            failed++
        }
    }
    console.log(`📝 Bài viết: ${migrated} thành công, ${failed} thất bại/giữ nguyên`)
}

async function main() {
    console.log('🚀 Bắt đầu migrate ảnh từ host ngoài sang Supabase Storage...')
    await migrateCourses()
    await migratePosts()
    console.log('\n✅ Hoàn tất.')
}

main()
    .catch((error) => {
        console.error('❌ Migrate thất bại:', error)
        process.exitCode = 1
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
