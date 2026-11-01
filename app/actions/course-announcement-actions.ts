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
 * Lọc HTML từ ô soạn có định dạng của giảng viên: chỉ giữ các thẻ định dạng cơ bản
 * (đoạn văn, đậm, nghiêng, gạch chân, danh sách, link http/https/mailto), bỏ mọi
 * thuộc tính nguy hiểm (onclick, style chứa mã...), bỏ thẻ script/style kèm nội dung.
 * Chuỗi đã lọc mới được lưu vào CourseAnnouncement.body và đưa vào email.
 */
const RICH_ALLOWED_TAGS = new Set([
    'p', 'br', 'div', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'a', 'span',
])
const RICH_DROP_WITH_CONTENT = new Set(['script', 'style', 'iframe', 'object', 'embed', 'textarea', 'title', 'noscript'])

function escapeTextNode(text: string) {
    return text
        .replace(/&(?!(amp|lt|gt|quot|#\d+|nbsp);)/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
}

function sanitizeAnnouncementHtml(input: string): string {
    const html = String(input || '')
    let out = ''
    let i = 0
    let skipDepth = 0
    while (i < html.length) {
        const lt = html.indexOf('<', i)
        if (lt === -1) {
            if (skipDepth === 0) out += escapeTextNode(html.slice(i))
            break
        }
        if (lt > i && skipDepth === 0) out += escapeTextNode(html.slice(i, lt))
        const gt = html.indexOf('>', lt)
        if (gt === -1) {
            if (skipDepth === 0) out += escapeTextNode(html.slice(lt))
            break
        }
        const rawTag = html.slice(lt, gt + 1)
        const m = rawTag.match(/^<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9]*)/)
        if (!m) {
            // Không phải thẻ hợp lệ (ví dụ dấu < trong văn bản) — coi là chữ thường
            if (skipDepth === 0) out += escapeTextNode('<')
            i = lt + 1
            continue
        }
        const isClose = m[1] === '/'
        const tag = m[2].toLowerCase()
        i = gt + 1
        if (RICH_DROP_WITH_CONTENT.has(tag)) {
            if (isClose) skipDepth = Math.max(0, skipDepth - 1)
            else if (!rawTag.endsWith('/>')) skipDepth += 1
            continue
        }
        if (skipDepth > 0) continue
        if (!RICH_ALLOWED_TAGS.has(tag)) continue // bỏ thẻ lạ, giữ lại phần chữ bên trong
        if (tag === 'br') {
            out += '<br>'
            continue
        }
        if (isClose) {
            out += `</${tag}>`
            continue
        }
        if (tag === 'a') {
            const hrefMatch = rawTag.match(/href\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i)
            const href = (hrefMatch?.[2] ?? hrefMatch?.[3] ?? hrefMatch?.[4] ?? '').trim()
            if (/^(https?:\/\/|mailto:)/i.test(href)) {
                const safeHref = href.replace(/"/g, '&quot;')
                out += `<a href="${safeHref}" target="_blank" rel="noopener noreferrer">`
            } else {
                out += '<a>'
            }
            continue
        }
        out += `<${tag}>`
    }
    return out.trim()
}

/** Chữ thuần nhìn thấy được của một đoạn HTML (để kiểm tra rỗng / đếm ký tự). */
function htmlToVisibleText(html: string): string {
    return String(html || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ')
        .trim()
}

/** HTML hoàn chỉnh cho email: giữ định dạng giảng viên đã soạn, bọc khung chữ như cũ. */
function richBodyToEmailHtml(sanitizedHtml: string, visibleText: string) {
    if (/<(p|div|li|br)[\s>]/i.test(sanitizedHtml)) {
        return `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#222">${sanitizedHtml}</div>`
    }
    return bodyToHtml(visibleText)
}

type SendOptions = {
    /** Gửi thông báo trong hệ thống (chuông + web push) */
    notify: boolean
    /** Gửi kèm qua email */
    email: boolean
    /** null = tất cả học viên đang học; mảng = chỉ những userId được chọn */
    userIds: number[] | null
}

/**
 * Bối cảnh cho trang gửi thông báo: thông tin khóa, số học viên đang học,
 * trạng thái hộp thư cá nhân của giảng viên (GĐ3) và LỊCH SỬ GỬI gộp
 * (thông báo trong hệ thống + các chiến dịch email của khóa này) để giảng viên theo dõi.
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

        const startOfDay = new Date()
        startOfDay.setHours(0, 0, 0, 0)
        const [recipientCount, announcements, campaigns, notifySentToday] = await Promise.all([
            prisma.enrollment.count({ where: { courseId, status: 'ACTIVE' } }),
            prisma.courseAnnouncement.findMany({
                where: { courseId },
                orderBy: { createdAt: 'desc' },
                take: 20,
                select: { id: true, title: true, body: true, createdAt: true, recipientUserIds: true },
            }),
            prisma.emailCampaign.findMany({
                where: {
                    createdBy: ctx?.userId ?? -1,
                    recipientFilter: { path: ['courseId'], equals: courseId },
                },
                orderBy: { createdAt: 'desc' },
                take: 20,
                select: {
                    id: true,
                    subject: true,
                    status: true,
                    totalRecipients: true,
                    sentCount: true,
                    failedCount: true,
                    createdAt: true,
                    recipientSource: true,
                },
            }),
            prisma.courseAnnouncement.count({
                where: { courseId, teacherId: ctx?.userId ?? -1, createdAt: { gte: startOfDay } },
            }),
        ])

        // GĐ3: trạng thái hộp thư cá nhân (chỉ giảng viên mới cần)
        let emailStatus: { senderEmail: string | null; dailyLimit: number; sentToday: number; remaining: number } | null = null
        if (ctx && ctx.isTeacher) {
            const st = await getTeacherEmailStatus(ctx.userId)
            emailStatus = {
                senderEmail: st.sender?.email ?? null,
                dailyLimit: st.dailyLimit,
                sentToday: st.sentToday,
                remaining: st.remaining,
            }
        }

        const history = [
            ...announcements.map(a => ({
                kind: 'ANNOUNCEMENT' as const,
                id: a.id,
                title: a.title,
                body: a.body,
                createdAt: a.createdAt.toISOString(),
                scope: Array.isArray(a.recipientUserIds)
                    ? `Chọn lọc: ${(a.recipientUserIds as number[]).length} học viên`
                    : 'Tất cả học viên đang học',
                status: null as string | null,
                sentCount: null as number | null,
                totalRecipients: null as number | null,
                failedCount: null as number | null,
            })),
            ...campaigns.map(c => ({
                kind: 'EMAIL' as const,
                id: c.id,
                title: c.subject,
                body: '',
                createdAt: c.createdAt.toISOString(),
                scope: c.recipientSource === 'SELECTED_LIST' ? 'Chọn lọc theo danh sách' : 'Tất cả học viên đang học',
                status: c.status as string,
                sentCount: c.sentCount,
                totalRecipients: c.totalRecipients,
                failedCount: c.failedCount,
            })),
        ].sort((x, y) => (x.createdAt < y.createdAt ? 1 : -1))

        return {
            success: true as const,
            course: { id: course.id, name: course.name_lop, slug: course.id_khoa },
            recipientCount,
            notifyStatus: {
                sentToday: notifySentToday,
                limit: DAILY_LIMIT_PER_COURSE,
                remaining: Math.max(0, DAILY_LIMIT_PER_COURSE - notifySentToday),
            },
            emailStatus,
            history,
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

/** Danh sách học viên của khóa (mọi trạng thái ghi danh) để giảng viên tick chọn người nhận. */
export async function getCourseStudentsAction(courseId: number) {
    try {
        const course = await prisma.course.findUnique({
            where: { id: courseId },
            select: { id: true, teacherId: true },
        })
        if (!course) return { success: false as const, error: 'Không tìm thấy khóa học' }

        const { denied } = await requireCourseAccessAction(course.teacherId)
        if (denied) return { success: false as const, error: denied.error }

        const enrollments = await prisma.enrollment.findMany({
            where: { courseId },
            orderBy: { createdAt: 'desc' },
            take: 500,
            select: {
                userId: true,
                status: true,
                user: { select: { name: true, email: true } },
            },
        })

        return {
            success: true as const,
            students: enrollments.map(e => ({
                userId: e.userId,
                name: e.user.name || '',
                email: e.user.email || '',
                status: e.status as string,
            })),
        }
    } catch (error: any) {
        return { success: false as const, error: error.message || 'Lỗi khi tải danh sách học viên' }
    }
}

/**
 * Gửi thông báo/email của giảng viên tới học viên của khóa:
 * - options.notify: tạo CourseAnnouncement + AppNotification (kind COURSE_ANNOUNCEMENT) + web push.
 * - options.email: tạo EmailCampaign (DB_ACTIVE khi gửi tất cả; SELECTED_LIST khi chọn lọc)
 *   và kích hoạt gửi batch đầu; giảng viên chỉ gửi từ Gmail của chính mình (GĐ3) + hạn mức ngày.
 * - options.userIds: null = mọi học viên ACTIVE; mảng = chỉ các học viên được chọn
 *   (thông báo chỉ tới người ACTIVE trong nhóm chọn; email tới người có email hợp lệ).
 * Quyền: ADMIN mọi khóa; TEACHER chỉ khóa của chính mình.
 */
export async function sendCourseAnnouncementAction(
    courseId: number,
    title: string,
    body: string,
    options: SendOptions
) {
    try {
        const cleanTitle = (title || '').trim()
        const cleanBody = sanitizeAnnouncementHtml(body || '')
        const visibleBody = htmlToVisibleText(cleanBody)
        if (!cleanTitle) return { success: false as const, error: 'Hãy nhập tiêu đề thông báo' }
        if (!visibleBody) return { success: false as const, error: 'Hãy nhập nội dung thông báo' }
        if (cleanTitle.length > TITLE_MAX) return { success: false as const, error: `Tiêu đề tối đa ${TITLE_MAX} ký tự` }
        if (visibleBody.length > BODY_MAX) return { success: false as const, error: `Nội dung tối đa ${BODY_MAX} ký tự` }
        if (!options.notify && !options.email) {
            return { success: false as const, error: 'Hãy chọn ít nhất một kênh gửi: Thông báo hoặc Email' }
        }

        const selectedIds = Array.isArray(options.userIds)
            ? [...new Set(options.userIds.map(n => Number(n)).filter(n => Number.isFinite(n) && n > 0))]
            : null
        if (selectedIds && selectedIds.length === 0) {
            return { success: false as const, error: 'Hãy chọn ít nhất một học viên để gửi' }
        }

        const course = await prisma.course.findUnique({
            where: { id: courseId },
            select: { id: true, name_lop: true, id_khoa: true, teacherId: true },
        })
        if (!course) return { success: false as const, error: 'Không tìm thấy khóa học' }

        const { denied, ctx } = await requireCourseAccessAction(course.teacherId)
        if (denied) return { success: false as const, error: denied.error }
        if (!ctx) return { success: false as const, error: 'Unauthorized' }

        // Chống spam: giới hạn số thông báo / khóa / ngày (chỉ tính kênh thông báo)
        if (options.notify) {
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
        }

        // Tập học viên đích: theo lựa chọn (mọi ACTIVE của khóa, hoặc nhóm được tick chọn)
        const baseEnrollments = await prisma.enrollment.findMany({
            where: selectedIds
                ? { courseId, userId: { in: selectedIds } }
                : { courseId, status: 'ACTIVE' },
            select: { id: true, userId: true, status: true, user: { select: { email: true, name: true } } },
        })
        const notifyTargets = baseEnrollments.filter(e => e.status === 'ACTIVE')
        const emailTargets = baseEnrollments.filter(e => e.user?.email && e.user.email.includes('@'))

        if (options.notify && notifyTargets.length === 0) {
            return { success: false as const, error: 'Không có học viên đang học (ACTIVE) nào trong nhóm đã chọn để nhận thông báo' }
        }
        if (options.email && !options.notify && emailTargets.length === 0) {
            return { success: false as const, error: 'Không có học viên nào trong nhóm đã chọn có email hợp lệ' }
        }

        // ── Kênh thông báo trong hệ thống ──────────────────────────────
        let announcementId: number | null = null
        if (options.notify) {
            const origin = (await headers()).get('origin') || undefined
            const notifTitle = `${course.name_lop} — ${cleanTitle}`.slice(0, 180)
            const announcement = await prisma.$transaction(async tx => {
                const created = await tx.courseAnnouncement.create({
                    data: {
                        courseId,
                        teacherId: ctx.userId,
                        title: cleanTitle,
                        body: cleanBody,
                        recipientUserIds: selectedIds ?? undefined,
                    },
                })
                await tx.appNotification.createMany({
                    data: notifyTargets.map(e => ({
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
            announcementId = announcement.id
        }

        // ── Kênh email ──────────────────────────────────────────────────
        let emailCampaignId: number | null = null
        let emailNote: string | null = null
        if (options.email) {
            if (emailTargets.length === 0) {
                emailNote = 'Phần email: không có học viên nào trong nhóm đã chọn có email hợp lệ.'
            } else {
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
                            recipientSource: selectedIds ? 'SELECTED_LIST' : 'DB_ACTIVE',
                            recipientFilter: { courseId },
                            recipientCsvData: selectedIds
                                ? JSON.stringify(
                                      emailTargets.map(e => ({
                                          email: e.user!.email,
                                          name: e.user?.name || '',
                                          userId: e.userId,
                                      }))
                                  )
                                : undefined,
                            subject: cleanTitle,
                            htmlContent: richBodyToEmailHtml(cleanBody, visibleBody),
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
                            : `Đã bắt đầu gửi email tới ${recipients.length} học viên (theo dõi tiến độ ở mục Lịch sử bên dưới hoặc Email MKT).`
                    } else {
                        emailNote = 'Đã tạo chiến dịch email nhưng chưa có địa chỉ email hợp lệ nào để gửi.'
                    }
                } catch (emailError: any) {
                    if (emailError.message === '__NO_SENDER__') {
                        emailNote = 'Phần email chưa gửi: bạn chưa kết nối Gmail cá nhân — vào Email MKT → Hộp thư của tôi để kết nối Gmail rồi gửi lại.'
                    } else if (emailError.message === '__QUOTA__') {
                        emailNote = 'Phần email chưa gửi: bạn đã đạt hạn mức email của hôm nay — hãy gửi tiếp vào ngày mai.'
                    } else {
                        emailNote = `Phần email gặp lỗi: ${emailError.message || 'không rõ'}. Hãy tạo lại từ Email MKT.`
                    }
                    // Nếu chỉ gửi email (không kèm thông báo) mà email lỗi thì báo thất bại hẳn
                    if (!options.notify && (emailError.message === '__NO_SENDER__' || emailError.message === '__QUOTA__')) {
                        return { success: false as const, error: emailNote }
                    }
                }
            }
        }

        revalidatePath('/tools/courses')
        revalidatePath(`/courses/${course.id_khoa}/announcements`)

        const parts: string[] = []
        if (options.notify) parts.push(`thông báo tới ${notifyTargets.length} học viên`)
        if (options.email && emailCampaignId) parts.push(`email tới ${emailTargets.length} học viên`)

        return {
            success: true as const,
            announcementId,
            recipientCount: notifyTargets.length,
            emailCampaignId,
            emailNote,
            message:
                `Đã gửi ${parts.join(' và ')} của khóa "${course.name_lop}".` +
                (emailNote ? ` ${emailNote}` : ''),
        }
    } catch (error: any) {
        return { success: false as const, error: error.message || 'Lỗi khi gửi thông báo' }
    }
}
