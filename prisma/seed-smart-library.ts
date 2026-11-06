// Seed CHỈ cho môi trường test local của Thư viện bài giảng thông minh (GĐ1).
// KHÔNG nằm trong seed.ts chính, KHÔNG chạy lên production.
//
// Chế độ mặc định: DRY-RUN — chỉ in ra dữ liệu sẽ tạo, không ghi DB.
// Chạy thật:  npx tsx prisma/seed-smart-library.ts --execute
// (DATABASE_URL phải trỏ vào DB test local.)
//
// Dữ liệu: 1 GV + 1 học viên (mật khẩu Test123!), 1 khóa, 2 bài học:
// - Bài 1 gắn video YouTube công khai dài (freeCodeCamp) + 22 đoạn Buổi 1
//   chép nguyên từ preview Giai đoạn 0 đã được duyệt (PUBLISHED; 3 đoạn có
//   tóm tắt/từ khóa) + 1 cue transcript ở 27:15 thuộc đoạn 27:00.
// - Bài 2 không có đoạn — dùng kiểm chứng giao diện cũ không đổi.

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { normalizeVietnamese } from '../lib/course/segments'

const prisma = new PrismaClient()
const EXECUTE = process.argv.includes('--execute')

const TEACHER = { email: 'gv.test.smartlib@wi300.local', phone: '0900000002', name: 'GV Test Thư Viện' }
const STUDENT = { email: 'hv.test.smartlib@wi300.local', phone: '0900000001', name: 'Học Viên Test Thư Viện' }
const PASSWORD = 'Test123!'
const COURSE_ID_KHOA = 'TEST-SMARTLIB-BUOI1'
const VIDEO_URL = 'https://www.youtube.com/watch?v=rfscVS0vtbw' // Learn Python - Full Course (freeCodeCamp, video dài > 4 giờ)
const VIDEO_URL_PLAIN = 'https://www.youtube.com/watch?v=aqz-KE-bpKQ' // Big Buck Bunny — bài không có đoạn

const TOTAL_SEC = 6738 // 1:52:18 như buổi gốc trong video mẫu
const RAW_SEGMENTS: { startSec: number; title: string; summary?: string; keywords?: string[] }[] = [
    { startSec: 0, title: 'Mở đầu và chia sẻ mong chờ' },
    { startSec: 450, title: 'Nghi lễ và lộ trình khóa học' },
    { startSec: 720, title: 'Giá trị chương trình và vai trò AI' },
    { startSec: 990, title: 'Nỗi đau học viên đến từ tâm thức' },
    { startSec: 1140, title: 'Con đường Phật - Pháp - Tăng' },
    { startSec: 1320, title: 'Điều con người thật sự muốn' },
    {
        startSec: 1620, title: 'Làm chủ thế giới bên trong',
        summary: 'Có Pháp, có Tăng đoàn: việc còn lại là làm chủ thế giới bên trong. Thầy yêu cầu bỏ các lý do tâm thức (bận, khó, ngại, sợ), xác lập nhận thức trong 21 ngày và nhấn mạnh làm chủ tâm thức để đổi tần số và thực tại.',
        keywords: ['làm chủ tâm thức', 'tần số rung động', 'xác lập nhận thức', 'phương pháp', 'môi trường'],
    },
    { startSec: 2040, title: 'Tiến trình nhân - duyên - quả' },
    { startSec: 2400, title: 'Quản trị năng lượng và vị thế' },
    {
        startSec: 2700, title: 'Ba giai đoạn doanh nghiệp số',
        summary: 'Ba giai đoạn doanh nghiệp số: định vị, đóng gói, dòng tiền. Mỗi ngày dành hai tiếng làm bài tập; AI chỉ hỗ trợ tốt khi được nạp dữ liệu về mình. Giai đoạn định vị trả lời: tôi là ai, bán cho ai, thông điệp cốt lõi là gì.',
        keywords: ['định vị', 'đóng gói', 'hệ thống dòng tiền', 'ICP', 'CV nạp AI'],
    },
    { startSec: 3000, title: 'Định vị bản thân và tìm USP' },
    { startSec: 3360, title: 'Đóng gói sản phẩm và offer' },
    {
        startSec: 3720, title: 'Nhu cầu thị trường và dòng tiền',
        summary: 'Thấu cảm nhu cầu thị trường, case study 80 tỷ và mô hình dòng tiền. Bắt đầu từ nhu cầu xã hội chứ không từ cái mình có; case study người dùng AI nghiên cứu thị trường bán sản phẩm cho nhóm tập luyện; hiểu ICP để tạo offer và thiết kế money model.',
        keywords: ['thấu cảm nhu cầu', 'case study', 'ICP', 'money model', 'nghiên cứu thị trường'],
    },
    { startSec: 4080, title: 'Thực hành định vị và ICP với AI' },
    { startSec: 4500, title: 'Bốn thứ cần chuẩn bị' },
    { startSec: 4860, title: 'Huấn luyện AI bằng NotebookLM' },
    { startSec: 5310, title: 'Chân dung khách hàng do AI tạo' },
    { startSec: 5550, title: 'Chuẩn bị cho ngày học mai' },
    { startSec: 5910, title: 'Bài tập và tuyên bố sứ mệnh' },
    { startSec: 6120, title: 'Hỏi đáp: bắt đầu từ đâu, Ikigai' },
    { startSec: 6420, title: 'Hỏi đáp: lợi thế và thứ tự offer' },
    { startSec: 6600, title: 'Kết buổi và lời chúc' },
]

const CUE = {
    startSec: 1635, // 27:15
    endSec: 1645,
    text: 'Còn có một phương pháp thì người thường cũng trở thành phi thường hết. Nên cả nhà ở đây, cả nhà…',
    segmentStartSec: 1620,
}

async function main() {
    const segments = RAW_SEGMENTS.map((s, i) => ({
        ...s,
        endSec: i + 1 < RAW_SEGMENTS.length ? RAW_SEGMENTS[i + 1].startSec : TOTAL_SEC,
        order: i + 1,
    }))

    console.log(`[seed-smart-library] Chế độ: ${EXECUTE ? 'EXECUTE (ghi DB)' : 'DRY-RUN (không ghi)'}`)
    console.log(`  GV: ${TEACHER.email} / ${TEACHER.phone}; Học viên: ${STUDENT.email} / ${STUDENT.phone}; mật khẩu chung: ${PASSWORD}`)
    console.log(`  Khóa: ${COURSE_ID_KHOA}; Bài 1: 22 đoạn PUBLISHED + 1 cue 27:15; Bài 2: không đoạn`)

    if (!EXECUTE) {
        console.log('  DRY-RUN xong — thêm --execute để ghi vào DB test.')
        return
    }

    const passwordHash = await bcrypt.hash(PASSWORD, 10)

    const teacher = await prisma.user.upsert({
        where: { email: TEACHER.email },
        update: { password: passwordHash, phone: TEACHER.phone, role: 'TEACHER', name: TEACHER.name },
        create: { email: TEACHER.email, phone: TEACHER.phone, name: TEACHER.name, password: passwordHash, role: 'TEACHER' },
    })
    const student = await prisma.user.upsert({
        where: { email: STUDENT.email },
        update: { password: passwordHash, phone: STUDENT.phone, role: 'STUDENT', name: STUDENT.name },
        create: { email: STUDENT.email, phone: STUDENT.phone, name: STUDENT.name, password: passwordHash, role: 'STUDENT' },
    })

    const course = await prisma.course.upsert({
        where: { id_khoa: COURSE_ID_KHOA },
        update: { teacherId: teacher.id, name_lop: 'Buổi 1 - Xây dựng doanh nghiệp số (test thư viện)', status: true },
        create: {
            id_khoa: COURSE_ID_KHOA,
            name_lop: 'Buổi 1 - Xây dựng doanh nghiệp số (test thư viện)',
            name_khoa: 'Khóa test thư viện bài giảng thông minh',
            teacherId: teacher.id,
            status: true,
            feeType: 'MIEN_PHI',
            phi_coc: 0,
        },
    })

    // Dọn dữ liệu cũ của chính khóa test này để seed chạy lại được (idempotent)
    await prisma.lesson.deleteMany({ where: { courseId: course.id } })

    const lesson1 = await prisma.lesson.create({
        data: {
            courseId: course.id,
            title: 'Buổi 1: Xây Dựng Doanh Nghiệp Số',
            videoUrl: VIDEO_URL,
            order: 1,
            type: 'VIDEO',
        },
    })
    const lesson2 = await prisma.lesson.create({
        data: {
            courseId: course.id,
            title: 'Bài không có đoạn (kiểm chứng giao diện cũ)',
            videoUrl: VIDEO_URL_PLAIN,
            order: 2,
            type: 'VIDEO',
        },
    })

    const createdSegments = []
    for (const seg of segments) {
        const created = await prisma.lessonSegment.create({
            data: {
                lessonId: lesson1.id,
                videoIndex: 0,
                startSec: seg.startSec,
                endSec: seg.endSec,
                title: seg.title,
                summary: seg.summary ?? null,
                keywords: seg.keywords ?? [],
                order: seg.order,
                status: 'PUBLISHED',
            },
        })
        createdSegments.push(created)
    }

    const cueSegment = createdSegments.find(s => s.startSec === CUE.segmentStartSec)
    if (!cueSegment) throw new Error('Không tìm thấy đoạn chứa cue 27:15')
    await prisma.transcriptCue.create({
        data: {
            lessonId: lesson1.id,
            videoIndex: 0,
            startSec: CUE.startSec,
            endSec: CUE.endSec,
            text: CUE.text,
            textNorm: normalizeVietnamese(CUE.text),
            segmentId: cueSegment.id,
        },
    })

    const startedAt = new Date()
    startedAt.setUTCHours(0, 0, 0, 0)
    const enrollment = await prisma.enrollment.upsert({
        where: { userId_courseId: { userId: student.id, courseId: course.id } },
        update: { status: 'ACTIVE', startedAt },
        create: { userId: student.id, courseId: course.id, status: 'ACTIVE', startedAt, phi_coc: 0 },
    })

    console.log(`  Đã ghi: course.id=${course.id}, lesson1=${lesson1.id}, lesson2=${lesson2.id}, segments=${createdSegments.length}, enrollment=${enrollment.id}`)
    console.log(`  Đăng nhập học viên: SĐT ${STUDENT.phone} / ${PASSWORD}; GV: SĐT ${TEACHER.phone} / ${PASSWORD}`)
    console.log(`  Trang học: /courses/${COURSE_ID_KHOA}/learn`)
}

main()
    .catch(e => { console.error(e); process.exit(1) })
    .finally(() => prisma.$disconnect())
