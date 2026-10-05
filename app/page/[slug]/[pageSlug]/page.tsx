import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { getSiteProfile } from '@/app/actions/site-profile-actions'
import { publishedWebsite, websiteData } from '@/lib/website/server'
import WebsiteView from '@/components/website/WebsiteView'

type Props = { params: Promise<{ slug: string; pageSlug: string }> }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, pageSlug } = await params
  const profile = await getSiteProfile(slug)
  const doc = profile?.isActive ? await publishedWebsite(profile.id) : null
  const page = doc?.pages.find(p => p.slug === pageSlug)
  const title = page && doc ? `${page.title} | ${doc.name}` : 'Không tìm thấy'
  return { title: { absolute: title }, description: doc?.description, openGraph: { title, description: doc?.description }, twitter: { title, description: doc?.description } }
}
export default async function WebsiteSubpage({ params }: Props) {
  const { slug, pageSlug } = await params
  const profile = await getSiteProfile(slug)
  if(!profile?.isActive) notFound()
  const doc = await publishedWebsite(profile.id)
  if(!doc?.pages.some(p => p.slug === pageSlug)) notFound()
  return <WebsiteView document={doc} data={await websiteData(profile)} slug={slug} pageSlug={pageSlug} />
}
