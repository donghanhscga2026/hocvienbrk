'use server'

import prisma from "@/lib/prisma"
import { unstable_cache } from "next/cache"

// [OPTIMIZE] Danh sách thông điệp đang bật thay đổi hiếm; cache 300s để
// trang chủ không phải chạy 2 truy vấn (count + findFirst) ở mọi lượt xem.
// Việc chọn ngẫu nhiên vẫn diễn ra theo từng lượt xem trên danh sách đã cache.
const getActiveMessages = unstable_cache(
    async () => prisma.message.findMany({
        where: { isActive: true },
        orderBy: { id: 'asc' }
    }),
    ['active-messages-v1'],
    { revalidate: 300, tags: ['site-messages'] }
)

export async function getRandomMessage() {
    try {
        const messages = await getActiveMessages()

        if (messages.length === 0) return null

        const random = Math.floor(Math.random() * messages.length)
        return messages[random]
    } catch (error) {
        console.error("[DB ERROR] getRandomMessage:", error)
        return null
    }
}

export async function getAllMessages() {
    try {
        return await prisma.message.findMany({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' }
        })
    } catch (error) {
        console.error("[DB ERROR] getAllMessages:", error)
        return []
    }
}

// [SITE_PROFILE] Lấy hero message cho profile cụ thể
export async function getHeroMessageForProfile(slug: string) {
    try {
        // Thử lấy từ SiteProfile trước
        const profile = await prisma.siteProfile.findUnique({
            where: { slug, isActive: true },
            select: {
                messageContent: true,
                messageDetail: true,
                messageImage: true,
                heroImage: true
            }
        })

        if (profile?.messageContent) {
            return {
                content: profile.messageContent,
                detail: profile.messageDetail || '',
                imageUrl: profile.messageImage || profile.heroImage || null
            }
        }

        // Fallback: Lấy message ngẫu nhiên từ bảng Message
        return getRandomMessage()
    } catch (error) {
        console.error(`[DB ERROR] getHeroMessageForProfile(${slug}):`, error)
        return null
    }
}
