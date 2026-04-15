'use server'

import prisma from "@/lib/prisma"

export async function getRandomMessage() {
    const count = await prisma.message.count({ 
        where: { isActive: true } 
    })
    
    if (count === 0) return null
    
    const random = Math.floor(Math.random() * count)
    return await prisma.message.findFirst({
        where: { isActive: true },
        skip: random
    })
}

export async function getAllMessages() {
    return await prisma.message.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' }
    })
}

// [SITE_PROFILE] Lấy hero message cho profile cụ thể
export async function getHeroMessageForProfile(slug: string) {
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
}
