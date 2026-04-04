'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { TEMPLATE_DEFAULTS, TEMPLATE_OPTIONS } from '@/lib/landing/templates'

export async function getLandingPages() {
    const landings = await prisma.landingPage.findMany({
        include: {
            course: {
                select: { name_lop: true }
            },
            _count: {
                select: { clicks: true, conversions: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    })
    
    return landings
}

export async function getLandingPage(id: number) {
    const landing = await prisma.landingPage.findUnique({
        where: { id },
        include: {
            course: true,
            _count: {
                select: { clicks: true, conversions: true }
            }
        }
    })
    
    return landing
}

export async function createLandingPage(data: {
    slug: string
    title: string
    subtitle?: string
    description?: string
    heroImage?: string
    ctaText?: string
    ctaLink?: string
    template?: string
    config?: Record<string, unknown>
    courseId?: number
    customCommission?: { f1: number; f2: number; f3: number }
    isActive?: boolean
}) {
    try {
        // Check if slug already exists
        const existing = await prisma.landingPage.findUnique({
            where: { slug: data.slug }
        })
        
        if (existing) {
            return { success: false, error: 'Slug đã tồn tại' }
        }
        
        // Set default config if not provided
        const template = data.template || 'hero-cta'
        const defaultConfig = TEMPLATE_DEFAULTS[template as keyof typeof TEMPLATE_DEFAULTS] || {}
        const config = { ...defaultConfig, ...data.config }
        
        const landing = await prisma.landingPage.create({
            data: {
                slug: data.slug,
                title: data.title,
                subtitle: data.subtitle,
                description: data.description,
                heroImage: data.heroImage,
                ctaText: data.ctaText || 'Đăng ký ngay',
                ctaLink: data.ctaLink,
                template,
                config: Object.keys(config).length > 0 ? config as any : undefined,
                courseId: data.courseId,
                customCommission: data.customCommission as any,
                isActive: data.isActive ?? true
            }
        })
        
        revalidatePath('/admin/landings')
        
        return { success: true, landing }
    } catch (error) {
        console.error('[Landing] Create error:', error)
        return { success: false, error: 'Lỗi khi tạo landing page' }
    }
}

export async function updateLandingPage(id: number, data: {
    slug?: string
    title?: string
    subtitle?: string
    description?: string
    heroImage?: string
    ctaText?: string
    ctaLink?: string
    template?: string
    config?: Record<string, unknown>
    courseId?: number | null
    customCommission?: { f1: number; f2: number; f3: number } | null
    isActive?: boolean
}) {
    try {
        // Check if slug already exists (and not this page)
        if (data.slug) {
            const existing = await prisma.landingPage.findFirst({
                where: {
                    slug: data.slug,
                    NOT: { id }
                }
            })
            
            if (existing) {
                return { success: false, error: 'Slug đã tồn tại' }
            }
        }
        
        // Merge config if template changed
        let config = data.config
        if (data.template) {
            const defaultConfig = TEMPLATE_DEFAULTS[data.template as keyof typeof TEMPLATE_DEFAULTS] || {}
            config = { ...defaultConfig, ...data.config }
        }
        
        const landing = await prisma.landingPage.update({
            where: { id },
            data: {
                ...(data.slug && { slug: data.slug }),
                ...(data.title && { title: data.title }),
                ...(data.subtitle !== undefined && { subtitle: data.subtitle }),
                ...(data.description !== undefined && { description: data.description }),
                ...(data.heroImage !== undefined && { heroImage: data.heroImage }),
                ...(data.ctaText && { ctaText: data.ctaText }),
                ...(data.ctaLink !== undefined && { ctaLink: data.ctaLink }),
                ...(data.template && { template: data.template }),
                ...(config && { config: Object.keys(config as object).length > 0 ? config as any : undefined }),
                ...(data.courseId !== undefined && { courseId: data.courseId }),
                ...(data.customCommission !== undefined && { customCommission: data.customCommission as any }),
                ...(data.isActive !== undefined && { isActive: data.isActive })
            }
        })
        
        revalidatePath('/admin/landings')
        revalidatePath(`/landing/${landing.slug}`)
        
        return { success: true, landing }
    } catch (error) {
        console.error('[Landing] Update error:', error)
        return { success: false, error: 'Lỗi khi cập nhật landing page' }
    }
}

export async function deleteLandingPage(id: number) {
    try {
        const landing = await prisma.landingPage.delete({
            where: { id }
        })
        
        revalidatePath('/admin/landings')
        
        return { success: true }
    } catch (error) {
        console.error('[Landing] Delete error:', error)
        return { success: false, error: 'Lỗi khi xóa landing page' }
    }
}

export async function toggleLandingStatus(id: number) {
    try {
        const landing = await prisma.landingPage.findUnique({
            where: { id }
        })
        
        if (!landing) {
            return { success: false, error: 'Không tìm thấy landing page' }
        }
        
        await prisma.landingPage.update({
            where: { id },
            data: { isActive: !landing.isActive }
        })
        
        revalidatePath('/admin/landings')
        revalidatePath(`/landing/${landing.slug}`)
        
        return { success: true }
    } catch (error) {
        console.error('[Landing] Toggle error:', error)
        return { success: false, error: 'Lỗi khi thay đổi trạng thái' }
    }
}

export async function getLandingStats(id: number) {
    const landing = await prisma.landingPage.findUnique({
        where: { id },
        include: {
            clicks: {
                orderBy: { createdAt: 'desc' },
                take: 100
            },
            conversions: {
                include: {
                    commissions: true
                }
            },
            _count: {
                select: { clicks: true, conversions: true }
            }
        }
    })
    
    if (!landing) {
        return null
    }
    
    // Calculate stats
    const totalClicks = landing._count.clicks
    const totalConversions = landing._count.conversions
    const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks * 100).toFixed(2) : '0'
    
    // Revenue from conversions
    const totalRevenue = landing.conversions.reduce((sum, c) => sum + c.orderAmount, 0)
    const totalCommissions = landing.conversions.reduce(
        (sum, c) => sum + c.commissions.reduce((s, comm) => s + comm.netAmount, 0),
        0
    )
    
    // Recent clicks by day
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    
    const recentClicks = landing.clicks.filter(c => c.createdAt >= thirtyDaysAgo)
    const clicksByDay: Record<string, number> = {}
    
    for (const click of recentClicks) {
        const day = click.createdAt.toISOString().split('T')[0]
        clicksByDay[day] = (clicksByDay[day] || 0) + 1
    }
    
    return {
        ...landing,
        stats: {
            totalClicks,
            totalConversions,
            conversionRate,
            totalRevenue,
            totalCommissions,
            clicksByDay
        }
    }
}

export async function getCourses() {
    const courses = await prisma.course.findMany({
        where: { status: true },
        select: {
            id: true,
            id_khoa: true,
            name_lop: true,
            mo_ta_ngan: true,
            link_anh_bia: true
        },
        orderBy: { name_lop: 'asc' }
    })
    
    return courses
}
