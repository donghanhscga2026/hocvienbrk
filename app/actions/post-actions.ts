'use server'

import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { Role } from "@prisma/client"

/**
 * Lấy danh sách bài viết (CÓ PHÂN TRANG)
 * [OPTIMIZE] Thêm take/skip để tránh tải toàn bộ posts
 */
export async function getPostsAction(page: number = 0, limit: number = 10) {
    try {
        const skip = page * limit
        
        const [posts, total] = await Promise.all([
            prisma.post.findMany({
                where: { published: true },
                include: {
                    author: { select: { name: true, image: true } },
                    _count: { select: { comments: true } }
                },
                orderBy: [{ pin: 'desc' }, { createdAt: 'desc' }],
                take: limit,
                skip: skip
            }),
            prisma.post.count({ where: { published: true } })
        ])
        
        return { success: true, posts, total, page, totalPages: Math.ceil(total / limit) }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

/**
 * Tạo bài viết mới (Chỉ Admin)
 */
export async function createPostAction(data: { title: string, content: string, image?: string }) {
    const session = await auth()
    if (session?.user?.role !== Role.ADMIN) {
        return { success: false, error: "Chỉ quản trị viên mới có quyền đăng bài." }
    }

    try {
        const { resolveImageUrl } = await import("@/lib/image-utils")
        // Ảnh bài viết có thể là base64 (upload file) hoặc link dán tay
        // (postimg.cc, imgur...) -> đều được đưa về Supabase Storage để
        // next/image không phải fetch trực tiếp host ngoài không ổn định.
        const finalImageUrl = await resolveImageUrl(data.image ?? null, 'posts');

        const post = await prisma.post.create({
            data: {
                title: data.title,
                content: data.content,
                image: finalImageUrl,
                authorId: parseInt(session.user.id!)
            }
        })
        revalidatePath('/')
        return { success: true, post }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

/**
 * Lấy chi tiết bài viết kèm bình luận
 */
export async function getPostDetailAction(postId: string) {
    try {
        const post = await prisma.post.findUnique({
            where: { id: postId },
            include: {
                author: { select: { name: true, image: true } },
                comments: {
                    include: {
                        user: { select: { name: true, image: true } }
                    },
                    orderBy: { createdAt: 'asc' }
                }
            }
        })
        return { success: true, post }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

/**
 * Bình luận vào bài viết
 */
export async function commentOnPostAction(postId: string, content: string) {
    const session = await auth()
    if (!session?.user?.id) {
        return { success: false, error: "Vui lòng đăng nhập để bình luận." }
    }

    try {
        const comment = await prisma.postComment.create({
            data: {
                postId,
                userId: parseInt(session.user.id),
                content
            }
        })
        revalidatePath('/')
        return { success: true, comment }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

/** Cập nhật bài viết: chỉ quản trị viên; giữ tác giả, ngày đăng và bình luận. */
export async function updatePostAction(postId: string, data: { title: string; content: string; image?: string }) {
    const session = await auth()
    if (session?.user?.role !== Role.ADMIN) {
        return { success: false, error: "Chỉ quản trị viên mới có quyền sửa bài viết." }
    }
    if (typeof postId !== 'string' || !postId.trim() || typeof data?.title !== 'string' || typeof data?.content !== 'string'
        || !data.title.trim() || !data.content.trim() || data.title.length > 300 || data.content.length > 100000
        || (data.image !== undefined && typeof data.image !== 'string')) {
        return { success: false, error: "Vui lòng nhập tiêu đề và nội dung hợp lệ (tiêu đề tối đa 300 ký tự)." }
    }
    const image = data.image?.trim()
    if (image && !/^https?:\/\//i.test(image) && !/^\/(?!\/)/.test(image) && !/^data:image\/(?:png|jpeg|webp|gif);base64,/i.test(image)) {
        return { success: false, error: "Ảnh phải là liên kết ảnh hoặc ảnh tải lên hợp lệ." }
    }
    try {
        const existing = await prisma.post.findUnique({ where: { id: postId } })
        if (!existing) return { success: false, error: "Không tìm thấy bài viết." }
        // Không tải/lưu lại ảnh khi chỉ sửa chữ; bỏ trống ảnh nghĩa là gỡ ảnh.
        let finalImage = existing.image
        if (image !== undefined && image !== (existing.image || '')) {
            const { resolveImageUrl } = await import("@/lib/image-utils")
            finalImage = await resolveImageUrl(image || null, 'posts')
        }
        const post = await prisma.post.update({
            where: { id: postId },
            data: { title: data.title.trim(), content: data.content.trim(), image: finalImage }
        })
        revalidatePath('/')
        revalidatePath('/kham-pha')
        revalidatePath('/tools/posts')
        return { success: true, post }
    } catch {
        return { success: false, error: "Chưa thể lưu bài viết. Vui lòng thử lại." }
    }
}
