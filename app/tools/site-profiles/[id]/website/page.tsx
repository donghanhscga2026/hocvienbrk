import WebsiteEditor from '@/components/website/WebsiteEditor'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function SiteProfileWebsitePage({ params }: PageProps) {
  const { id } = await params
  return <WebsiteEditor profileId={Number(id)} />
}
