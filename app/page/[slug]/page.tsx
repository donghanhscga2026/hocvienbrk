import { Metadata } from 'next'
import { cache } from 'react'
import { notFound } from 'next/navigation'

import { getSiteProfile, incrementProfileView } from '@/app/actions/site-profile-actions'
import ProfileHome from '@/components/website/ProfileHome'

// [OPTIMIZE] cache() giúp generateMetadata và component trang dùng chung 1
// lần query slug thay vì mỗi bên tự query lại (được gọi 2 lần/request) —
// cùng pattern đã dùng ở app/khoa-hoc/[id]/page.tsx và app/land/[slug]/page.tsx.
const getCachedSiteProfile = cache((slug: string) => getSiteProfile(slug))

const DEFAULT_OG_TITLE = 'MFC - Dòng chảy Phước Báu'
const DEFAULT_OG_DESCRIPTION = 'Môi trường chia sẻ cùng nhau học tập nâng cao nhận thức và năng lực tạo lập giá trị từ gốc, tích tạo phước báu thuận theo nhân quả'
const DEFAULT_OG_IMAGE = 'https://giautoandien.io.vn/og-image.png'

interface PageProps {
    params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params

    const profile = await getCachedSiteProfile(slug)

    if (!profile) return { title: 'Không tìm thấy' }


    const ogTitle = profile.metaTitle || profile.title || DEFAULT_OG_TITLE
    const ogDescription = profile.metaDescription || profile.subtitle || DEFAULT_OG_DESCRIPTION
    const ogImage = profile.metaImage || profile.heroImage || DEFAULT_OG_IMAGE

    return {
        title: ogTitle,
        description: ogDescription,
        openGraph: {
            title: ogTitle,
            description: ogDescription,
            images: [ogImage],
        },
        twitter: {
            card: 'summary_large_image',
            title: ogTitle,
            description: ogDescription,
            images: [ogImage],
        },
    }
}

export default async function PageSlugPage({ params }: PageProps) {
    const { slug } = await params

    const profile = await getCachedSiteProfile(slug)

    if (!profile) notFound()

    incrementProfileView(slug).catch(console.error)


    return <ProfileHome profile={profile} />
}
