'use server'

import prisma from "@/lib/prisma"

export async function getRandomMessage() {
    try {
        const count = await prisma.message.count({ 
            where: { isActive: true } 
        })
        
        if (count === 0) return null
        
        const random = Math.floor(Math.random() * count)
        return await prisma.message.findFirst({
            where: { isActive: true },
            skip: random
        })
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
