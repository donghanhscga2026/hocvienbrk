'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'
import { requireCourseAccessAction } from '@/lib/course/permissions'
import { queueCourseAnnouncementPush } from '@/lib/web-push-subscriptions'
import { resolveRecipients, processCampaignBatch } from '@/lib/email-campaign-runner'
import { getTeacherEmailStatus } from '@/lib/teacher-email'

// Giới hạn chống spam: mỗi giảng viên gửi tối đa 5 thông báo / khóa / ngày.
const DAILY_LIMIT_PER_COURSE = 5
const TITLE_MAX = 150
const BODY_MAX = 5000

function bodyToHtml(body: string) {
    const esc = body
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
    const paragraphs = esc
        .split(/\n{2,}/)
        .map(p => `<p>${p.replace(/\n/g, '<br/>')}</p>`)
        .join('')
    return `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#222">${paragraphs}</div>`
}

/**
 * Lấy bối cảnh cho trang gửi thông báo: thông tin khóa, số học viên đang học
 * (ACTIVE) và lịch sử thông báo đã gửi của khóa. Chỉ ADMIN hoặc giảng viên
 * sở hữu khóa mới xem được.
 */
export async function getCourseAnnouncementContextAction(courseId: number) {
    try {
        const course = await prisma.course.findUnique({
            where: { id: courseId },
            select: { id: true, name_lop: true, id_khoa: true, teacherId: true },
        })
        if (!course) return { success: false as const, error: 'Không tìm thấy khóa học' }

        const { denied, ctx } = await requireCourseAccessAction(course.teacherId)
        if (denied) return { success: false as const, error: denied.error }

        const [recipientCount, announcements] = await Promise.all([
            prisma.enrollment.count({ where: { courseId, status: 'ACTIVE' } }),
            prisma.courseAnnouncement.findMany({
                where: { courseId },
                orderBy: { createdAt: 'desc' },
                take: 20,
                select: { id: true, title: true, body: true, createdAt: true },
            }),
        ])

        // GĐ3: trạng thái hộp thư cá nhân (chỉ giảng viên mới cần)
        let emailStatus: { senderEmail: string | null; dailyLimit: number; sentToday: number; remaining: number } | null = null
        if (ctx?.isTeacher) {
            const st = await getTeacherEmailStatus(ctx.userId)
            emailStatus = {
                senderEmail: st.sender?.email ?? null,
                dailyLimit: st.dailyLimit,
                sentToday: st.sentToday,
                remaining: st.remaining,
            }
        }

        return {
            success: true as const,
            course: { id: course.id, name: course.name_lop, slug: course.id_khoa },
            recipientCount,
            emailStatus,
            announcements: announcements.map(a => ({
                id: a.id,
                title: a.title,
                body: a.body,
                createdAt: a.createdAt.toISOString(),
            })),
        }
    } catch (error: any) {
        return { success: false as const, error: error.message || 'Lỗi khi tải thông tin khóa học' }
    }
}

/**
 * Gửi thông báo của giảng viên tới toàn bộ học viên đang học (ACTIVE) của khóa:
 * - Tạo bản ghi CourseAnnouncement (nội dung đầy đủ để học viên xem lại).
 * - Tạo AppNotification cho từng học viên (kind COURSE_ANNOUNCEMENT) + xếp hàng web push.
 * - Nếu sendEmail = true: tạo thêm EmailCampaign nguồn DB_ACTIVE cho chính khóa này
 *   và kích hoạt gửi batch đầu (phần còn lại do cron process-email-campaigns chạy tiếp).
 * Quyền: ADMIN mọi khóa; TEACHER chỉ khóa của chính mình (requireCourseAccessAction).
 */
export async function sendCourseAnnouncementAction(
    courseId: number,
    title: string,
    body: string,
    sendEmail: boolean
) {
    try {
        const cleanTitle = (title || '').trim()
        const cleanBody = (body || '').trim()
        if (!cleanTitle) return { success: false as const, error: 'Hãy nhập tiêu đề thông báo' }
        if (!cleanBody) return { success: false as const, error: 'Hãy nhập nội dung thông báo' }
        if (cleanTitle.length > TITLE_MAX) return { success: false as const, error: `Tiêu đề tối đa ${TITLE_MAX} ký tự` }
        if (cleanBody.length > BODY_MAX) return { success: false as const, error: `Nội dung tối đa ${BODY_MAX} ký tự` }

        const course = await prisma.course.findUnique({
            where: { id: courseId },
            select: { id: true, name_lop: true, id_khoa: true, teacherId: true },
        })
        if (!course) return { success: false as const, error: 'Không tìm thấy khóa học' }

        const { denied, ctx } = await requireCourseAccessAction(course.teacherId)
        if (denied) return { success: false as const, error: denied.error }
        if (!ctx) return { success: false as const, error: 'Unauthorized' }

        // Chống spam: tối đa DAILY_LIMIT_PER_COURSE thông báo / khóa / ngày / người gửi
        const startOfDay = new Date()
        startOfDay.setHours(0, 0, 0, 0)
        const sentToday = await prisma.courseAnnouncement.count({
            where: { courseId, teacherId: ctx.userId, createdAt: { gte: startOfDay } },
        })
        if (sentToday >= DAILY_LIMIT_PER_COURSE) {
            return {
                success: false as const,
                error: `Đã đạt giới hạn ${DAILY_LIMIT_PER_COURSE} thông báo cho khóa này trong hôm nay. Hãy gửi tiếp vào ngày mai.`,
            }
        }

        const enrollments = await prisma.enrollment.findMany({
            where: { courseId, status: 'ACTIVE' },
            select: { id: true, userId: true },
        })
        if (enrollments.length === 0) {
            return { success: false as const, error: 'Khóa học chưa có học viên đang học (ACTIVE) để gửi thông báo' }
        }

        const origin = (await headers()).get('origin') || undefined
        const notifTitle = `${course.name_lop} — ${cleanTitle}`.slice(0, 180)

        const announcement = await prisma.$transaction(async tx => {
            const created = await tx.courseAnnouncement.create({
                data: { courseId, teacherId: ctx.userId, title: cleanTitle, body: cleanBody },
            })
            await tx.appNotification.createMany({
                data: enrollments.map(e => ({
                    eventKey: `course-announcement:${created.id}:${e.userId}`,
                    recipientId: e.userId,
                    kind: 'COURSE_ANNOUNCEMENT',
                    title: notifTitle,
                    courseId,
                    enrollmentId: e.id,
                })),
                skipDuplicates: true,
            })
            await queueCourseAnnouncementPush(tx, created.id, origin)
            return created
        })

        // Kênh email (tùy chọn): tạo chiến dịch DB_ACTIVE cho chính khóa này rồi kích hoạt gửi.
        let emailCampaignId: number | null = null
        let emailNote: string | null = null
        if (sendEmail) {
            try {
                // GĐ3: giảng viên phải có Gmail riêng và còn hạn mức email hôm nay
                let kickBatchSize = 20
                if (ctx.isTeacher) {
                    const emailStatus = await getTeacherEmailStatus(ctx.userId)
                    if (!emailStatus.sender) throw new Error('__NO_SENDER__')
                    if (emailStatus.remaining <= 0) throw new Error('__QUOTA__')
                    kickBatchSize = Math.min(20, emailStatus.remaining)
                }
                const campaign = await prisma.emailCampaign.create({
                    data: {
                        title: `[Thông báo khóa học] ${cleanTitle}`.slice(0, 190),
                        notificationType: 'THONG_BAO',
                        recipientSource: 'DB_ACTIVE',
                        recipientFilter: { courseId },
                        subject: cleanTitle,
                        htmlContent: bodyToHtml(cleanBody),
                        createdBy: ctx.userId,
                        status: 'DRAFT',
                    },
                })
                emailCampaignId = campaign.id
                const recipients = await resolveRecipients(campaign.id)
                await prisma.emailCampaign.update({
                    where: { id: campaign.id },
                    data: { totalRecipients: recipients.length },
                })
                if (recipients.length > 0) {
                    const kick = await processCampaignBatch(campaign.id, kickBatchSize)
                    emailNote = kick && (kick as any).success === false
                        ? 'Đã tạo chiến dịch email, hệ thống sẽ gửi qua Email MKT trong ít phút tới.'
                        : `Đã bắt đầu gửi email tới ${recipients.length} học viên (theo dõi tiến độ ở Email MKT).`
                } else {
                    emailNote = 'Đã tạo chiến dịch email nhưng chưa có địa chỉ email hợp lệ nào để gửi.'
                }
            } catch (emailError: any) {
                if (emailError.message === '__NO_SENDER__') {
                    emailNote = 'Thông báo trong hệ thống đã gửi. Phần email chưa gửi: bạn chưa kết nối Gmail cá nhân — vào Email MKT → Hộp thư của tôi để kết nối Gmail rồi gửi lại.'
                } else if (emailError.message === '__QUOTA__') {
                    emailNote = 'Thông báo trong hệ thống đã gửi. Phần email chưa gửi: bạn đã đạt hạn mức email của hôm nay — hãy gửi tiếp vào ngày mai.'
                } else {
                    emailNote = `Thông báo trong hệ thống đã gửi, nhưng phần email gặp lỗi: ${emailError.message || 'không rõ'}. Hãy tạo lại từ Email MKT.`
                }
            }
        }

        revalidatePath('/tools/courses')
        revalidatePath(`/courses/${course.id_khoa}/announcements`)

        return {
            success: true as const,
            announcementId: announcement.id,
            recipientCount: enrollments.length,
            emailCampaignId,
            emailNote,
            message: `Đã gửi thông báo tới ${enrollments.length} học viên đang học của khóa "${course.name_lop}"`,
        }
    } catch (error: any) {
        return { success: false as const, error: error.message || 'Lỗi khi gửi thông báo' }
    }
}
