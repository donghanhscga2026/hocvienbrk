'use server'

import { auth } from "@/auth"
import prisma from "@/lib/prisma"

export async function getCommentsByLesson(lessonId: string) {
    // [OPTIMIZE] Trước đây không giới hạn số dòng — bài học càng nhiều bình luận
    // càng tải chậm. Lấy 200 bình luận MỚI NHẤT (desc + take) rồi đảo lại thành
    // thứ tự cũ->mới để giữ nguyên cách hiển thị hiện tại.
    const commentsDesc = await prisma.lessonComment.findMany({
        where: { lessonId },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    image: true,
                    accounts: {
                        select: {
                            provider: true,
                            providerAccountId: true,
                        }
                    }
                }
            }
        },
        orderBy: {
            createdAt: 'desc'
        },
        take: 200
    })
    const comments = commentsDesc.reverse()

    return comments.map((comment: any) => {
        // Get avatar priority: user.image > Google image > Facebook image > null
        let avatar = comment.user.image
        
        if (!avatar) {
            const googleAccount = comment.user.accounts.find((a: any) => a.provider === 'google')
            if (googleAccount) {
                avatar = `https://www.googleapis.com/plus/v1/people/${googleAccount.providerAccountId}?picture`
            }
        }

        if (!avatar) {
            const facebookAccount = comment.user.accounts.find((a: any) => a.provider === 'facebook')
            if (facebookAccount) {
                avatar = `https://graph.facebook.com/${facebookAccount.providerAccountId}/picture?type=large`
            }
        }

        return {
            id: comment.id,
            content: comment.content,
            imageUrl: comment.imageUrl,
            createdAt: comment.createdAt,
            editedAt: comment.editedAt,
            userId: comment.userId,
            userName: comment.user.name,
            userAvatar: avatar,
            parentId: comment.parentId
        }
    })
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
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                        accounts: {
                            select: {
                                provider: true,
                                providerAccountId: true,
                            }
                        }
                    }
                }
            }
        })

        // Get avatar with same priority logic
        let avatar = comment.user.image
        if (!avatar) {
            const googleAccount = comment.user.accounts.find((a: any) => a.provider === 'google')
            if (googleAccount) {
                avatar = `https://www.googleapis.com/plus/v1/people/${googleAccount.providerAccountId}?picture`
            }
        }
        
        if (!avatar) {
            const facebookAccount = comment.user.accounts.find((a: any) => a.provider === 'facebook')
            if (facebookAccount) {
                avatar = `https://graph.facebook.com/${facebookAccount.providerAccountId}/picture?type=large`
            }
        }

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
            comment: {
                id: comment.id,
                content: comment.content,
                imageUrl: comment.imageUrl,
                createdAt: comment.createdAt,
                editedAt: comment.editedAt,
                userId: comment.userId,
                userName: comment.user.name,
                userAvatar: avatar,
                parentId: comment.parentId
            }
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
