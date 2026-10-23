import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { getCurrentDeploymentBrand } from '@/lib/site-profile/deployment-runtime'
import { contentMetadata } from '@/lib/content/seo'
import WiContentPage from '@/components/wi300/WiContentPage'

async function read(slug: string) {
    const brand = await getCurrentDeploymentBrand()
    const page = brand?.appearance?.customPages.find(page => page.slug === slug && page.published && !page.deleted)
    return brand && page ? { brand, page } : null
}

interface PageProps {
    params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params
    const result = await read(slug)
    if (!result) return { title: `Không tìm thấy: ${slug}`, robots: { index: false } }
    const { brand, page } = result
    const seo = { ...page.seo, imageUrl: page.seo.imageUrl || page.imageUrl || brand.ogImageUrl, ...(page.inheritRobots ? { index: brand.appearance?.seo.index ?? true, follow: brand.appearance?.seo.follow ?? true } : {}) }
    return contentMetadata(seo, page.title || page.name, page.description || brand.description, '/' + slug)
}

export default async function OldSlugPage({ params }: PageProps) {
    const result = await read((await params).slug)
    if (!result) notFound()
    return <main className="mx-auto max-w-5xl px-4 py-10 text-brk-on-surface sm:px-6"><WiContentPage page={result.page} fallbackTitle={result.page.name} /></main>
}
