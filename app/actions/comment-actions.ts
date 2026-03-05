'use server'

import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function getCommentsByLesson(lessonId: string) {
    const comments = await prisma.lessonComment.findMany({
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
            createdAt: 'asc'
        }
    })

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
                avatar = `https://graph.facebook.com/${facebookAccount.providerAccountId}/picture`
            }
        }

        return {
            id: comment.id,
            content: comment.content,
            createdAt: comment.createdAt,
            userId: comment.userId,
            userName: comment.user.name,
            userAvatar: avatar
        }
    })
}

export async function createComment(lessonId: string, content: string) {
    const session = await auth()
    if (!session?.user?.id) {
        return { success: false, message: "Vui lòng đăng nhập để bình luận" }
    }

    const userId = parseInt(session.user.id as string)

    try {
        const comment = await prisma.lessonComment.create({
            data: {
                lessonId,
                userId,
                content: content.trim()
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

        revalidatePath('/')

        return {
            success: true,
            comment: {
                id: comment.id,
                content: comment.content,
                createdAt: comment.createdAt,
                userId: comment.userId,
                userName: comment.user.name,
                userAvatar: avatar
            }
        }
    } catch (error) {
        console.error("Create comment error:", error)
        return { success: false, message: "Gửi bình luận thất bại" }
    }
}
