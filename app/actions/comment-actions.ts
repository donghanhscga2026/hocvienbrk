'use server'

import { auth } from "@/auth"
import prisma from "@/lib/prisma"

const COMMENT_USER_SELECT = {
    id: true,
    name: true,
    image: true,
    accounts: {
        select: {
            provider: true,
            providerAccountId: true,
        }
    }
} as const

// Ưu tiên avatar: user.image > ảnh Google > ảnh Facebook > null
function resolveAvatar(user: { image: string | null; accounts: { provider: string; providerAccountId: string }[] }): string | null {
    if (user.image) return user.image
    const googleAccount = user.accounts.find(a => a.provider === 'google')
    if (googleAccount) return `https://www.googleapis.com/plus/v1/people/${googleAccount.providerAccountId}?picture`
    const facebookAccount = user.accounts.find(a => a.provider === 'facebook')
    if (facebookAccount) return `https://graph.facebook.com/${facebookAccount.providerAccountId}/picture?type=large`
    return null
}

function mapComment(comment: any) {
    return {
        id: comment.id,
        content: comment.content,
        imageUrl: comment.imageUrl,
        createdAt: comment.createdAt,
        editedAt: comment.editedAt,
        userId: comment.userId,
        userName: comment.user.name,
        userAvatar: resolveAvatar(comment.user),
        parentId: comment.parentId
    }
}

/**
 * [PAGINATE] Chỉ tải `limit` bình luận GỐC (thread cấp cao nhất) MỚI NHẤT mỗi
 * lần, kèm TOÀN BỘ reply của riêng các thread đó (không cắt reply giữa
 * chừng). `offset` = số thread gốc đã tải trước đó (để tải tiếp các thread
 * CŨ HƠN — dùng cho nút "Xem thêm bình luận khác". Sắp xếp mặc định MỚI NHẤT
 * TRƯỚC (client hiển thị y nguyên thứ tự này). Trả kèm `totalTopLevel`/
 * `loadedTopLevel` để client tính số còn lại.
 */
export async function getCommentsByLesson(lessonId: string, options?: { limit?: number; offset?: number }) {
    const limit = options?.limit ?? 20
    const offset = options?.offset ?? 0

    const totalTopLevel = await prisma.lessonComment.count({
        where: { lessonId, parentId: null }
    })

    const topLevel = await prisma.lessonComment.findMany({
        where: { lessonId, parentId: null },
        include: { user: { select: COMMENT_USER_SELECT } },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
    })

    const topLevelIds = topLevel.map(c => c.id)
    const replies = topLevelIds.length > 0 ? await prisma.lessonComment.findMany({
        where: { parentId: { in: topLevelIds } },
        include: { user: { select: COMMENT_USER_SELECT } },
        orderBy: { createdAt: 'asc' },
    }) : []

    return {
        comments: [...topLevel, ...replies].map(mapComment),
        totalTopLevel,
        loadedTopLevel: offset + topLevel.length,
    }
}

export async function hasUserCommentedOnLesson(lessonId: string) {
    const __t0 = Date.now() // [PERF-TEST] tạm đo, sẽ xoá sau khi có số liệu
    console.log(`[PERF-TEST] COMMENT_CHECK_START t=${__t0}`)
    const session = await auth()
    if (!session?.user?.id) return false

    const userId = parseInt(session.user.id as string)

    const comment = await prisma.lessonComment.findFirst({
        where: { lessonId, userId }
    })

    console.log(`[PERF-TEST] COMMENT_CHECK_END t=${Date.now()} (+${Date.now() - __t0}ms)`)
    return !!comment
}

export async function createComment(lessonId: string, content: string, parentId?: number | null, imageUrl?: string | null) {
    const session = await auth()
    if (!session?.user?.id) {
        return { success: false, message: "Vui lòng đăng nhập để bình luận" }
    }

    const trimmedContent = content.trim()
    if (!trimmedContent && !imageUrl) {
        return { success: false, message: "Bình luận trống" }
    }

    const userId = parseInt(session.user.id as string)

    try {
        // Chỉ cho reply vào bình luận CÙNG bài học, tránh gắn nhầm parentId lệch lesson
        if (parentId) {
            const parent = await prisma.lessonComment.findUnique({ where: { id: parentId }, select: { lessonId: true } })
            if (!parent || parent.lessonId !== lessonId) parentId = null
        }

        const comment = await prisma.lessonComment.create({
            data: {
                lessonId,
                userId,
                content: trimmedContent,
                imageUrl: imageUrl || null,
                parentId: parentId || null
            },
            include: { user: { select: COMMENT_USER_SELECT } }
        })

        // Auto-complete lesson for NORMAL course type
        const lesson = await prisma.lesson.findUnique({
            where: { id: lessonId },
            select: {
                course: {
                    select: { type: true }
                }
            }
        })

        if (lesson?.course?.type === 'NORMAL') {
            const enrollment = await prisma.enrollment.findFirst({
                where: {
                    userId,
                    course: { lessons: { some: { id: lessonId } } },
                    status: 'ACTIVE'
                }
            })

            if (enrollment) {
                await prisma.lessonProgress.upsert({
                    where: {
                        enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId }
                    },
                    create: {
                        enrollmentId: enrollment.id,
                        lessonId,
                        status: 'COMPLETED',
                        totalScore: 0
                    },
                    update: {
                        status: 'COMPLETED'
                    }
                })
            }
        }

        return {
            success: true,
            comment: mapComment(comment)
        }
    } catch (error) {
        console.error("Create comment error:", error)
        return { success: false, message: "Gửi bình luận thất bại" }
    }
}

export async function updateComment(commentId: number, content: string, imageUrl?: string | null) {
    const session = await auth()
    if (!session?.user?.id) {
        return { success: false, message: "Vui lòng đăng nhập" }
    }

    const trimmedContent = content.trim()
    if (!trimmedContent && !imageUrl) {
        return { success: false, message: "Bình luận trống" }
    }

    const userId = parseInt(session.user.id as string)

    try {
        // Chỉ chủ bình luận mới được sửa — kiểm tra quyền sở hữu trước khi update
        const existing = await prisma.lessonComment.findUnique({
            where: { id: commentId },
            select: { userId: true }
        })
        if (!existing) {
            return { success: false, message: "Bình luận không tồn tại" }
        }
        if (existing.userId !== userId) {
            return { success: false, message: "Bạn chỉ có thể sửa bình luận của chính mình" }
        }

        const comment = await prisma.lessonComment.update({
            where: { id: commentId },
            data: {
                content: trimmedContent,
                imageUrl: imageUrl === undefined ? undefined : (imageUrl || null),
                editedAt: new Date(),
            }
        })

        return {
            success: true,
            comment: {
                id: comment.id,
                content: comment.content,
                imageUrl: comment.imageUrl,
                editedAt: comment.editedAt,
            }
        }
    } catch (error) {
        console.error("Update comment error:", error)
        return { success: false, message: "Cập nhật bình luận thất bại" }
    }
}
