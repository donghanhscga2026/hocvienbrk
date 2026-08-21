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
            createdAt: comment.createdAt,
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

export async function createComment(lessonId: string, content: string, parentId?: number | null) {
    const session = await auth()
    if (!session?.user?.id) {
        return { success: false, message: "Vui lòng đăng nhập để bình luận" }
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
                content: content.trim(),
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
                createdAt: comment.createdAt,
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
