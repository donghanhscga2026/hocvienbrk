import { Metadata } from 'next'
import { cache } from 'react'
import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { LandingPageClient } from '@/components/landing/LandingPageClient'

const DEFAULT_OG_TITLE = 'BRK - Ngân hàng Phước Báu'
const DEFAULT_OG_DESCRIPTION = 'Môi trường chia sẻ cùng nhau học tập nâng cao nhận thức và năng lực tạo lập giá trị từ gốc, tích tạo phước báu thuận theo nhân quả'
const DEFAULT_OG_IMAGE = 'https://giautoandien.io.vn/og-image.png'

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

    const landing = await getActiveLandingBySlug(slug)

    if (!landing) return { title: 'Không tìm thấy' }

    return {
        title: landing.title,
        description: landing.subtitle || landing.description || DEFAULT_OG_DESCRIPTION,
        openGraph: {
            title: landing.title,
            description: landing.subtitle || landing.description || DEFAULT_OG_DESCRIPTION,
            images: landing.heroImage ? [landing.heroImage] : [DEFAULT_OG_IMAGE],
        },
        twitter: {
            card: 'summary_large_image',
            title: landing.title,
            description: landing.subtitle || landing.description || DEFAULT_OG_DESCRIPTION,
            images: landing.heroImage ? [landing.heroImage] : [DEFAULT_OG_IMAGE],
        },
    }
}

export default async function LandPage({ params }: PageProps) {
    const { slug } = await params

    const landing = await getActiveLandingBySlug(slug)

    if (!landing) notFound()

    return <LandingPageClient landing={landing} />
}
