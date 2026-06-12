import { notFound } from 'next/navigation'
import { Metadata } from 'next'

interface PageProps {
    params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params
    return { title: `Không tìm thấy: ${slug}` }
}

export default async function OldSlugPage({ params }: PageProps) {
    await params
    notFound()
}
