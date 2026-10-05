import { Metadata } from 'next'
import { cache } from 'react'
import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { LandingPageClient } from '@/components/landing/LandingPageClient'
import { getCurrentSiteProfile } from '@/lib/site-profile/runtime'

interface PageProps {
    params: Promise<{ slug: string }>
}

// [OPTIMIZE] cache() giúp generateMetadata và component trang dùng chung 1 lần
// query thay vì mỗi bên tự query lại cùng 1 row LandingPage (được gọi 2 lần/request).
const getActiveLandingBySlug = cache((slug: string) =>
    (prisma as any).landingPage.findUnique({
        where: { slug, isActive: true },
        include: { course: true }
    })
)

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params

    const [landing, siteProfile] = await Promise.all([
        getActiveLandingBySlug(slug),
        getCurrentSiteProfile(),
    ])

    if (!landing) return { title: 'Không tìm thấy' }

    const defaultDescription = siteProfile?.metaDescription || siteProfile?.subtitle || undefined
    const defaultImage = siteProfile?.metaImage || siteProfile?.heroImage || '/og-image.png'

    return {
        title: landing.title,
        description: landing.subtitle || landing.description || defaultDescription,
        openGraph: {
            title: landing.title,
            description: landing.subtitle || landing.description || defaultDescription,
            images: landing.heroImage ? [landing.heroImage] : [defaultImage],
        },
        twitter: {
            card: 'summary_large_image',
            title: landing.title,
            description: landing.subtitle || landing.description || defaultDescription,
            images: landing.heroImage ? [landing.heroImage] : [defaultImage],
        },
    }
}

export default async function LandPage({ params }: PageProps) {
    const { slug } = await params

    const landing = await getActiveLandingBySlug(slug)

    if (!landing) notFound()

    return <LandingPageClient landing={landing} />
}
