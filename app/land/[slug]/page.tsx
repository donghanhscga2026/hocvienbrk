import { Metadata } from 'next'
import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { LandingPageClient } from '@/components/landing/LandingPageClient'

const DEFAULT_OG_TITLE = 'BRK - Ngân hàng Phước Báu'
const DEFAULT_OG_DESCRIPTION = 'Môi trường chia sẻ cùng nhau học tập nâng cao nhận thức và năng lực tạo lập giá trị từ gốc, tích tạo phước báu thuận theo nhân quả'
const DEFAULT_OG_IMAGE = 'https://giautoandien.io.vn/og-image.png'

interface PageProps {
    params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params

    const landing = await (prisma as any).landingPage.findUnique({
        where: { slug }
    })

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

    const landing = await (prisma as any).landingPage.findUnique({
        where: {
            slug,
            isActive: true
        },
        include: {
            course: true
        }
    })

    if (!landing) notFound()

    return <LandingPageClient landing={landing} />
}
