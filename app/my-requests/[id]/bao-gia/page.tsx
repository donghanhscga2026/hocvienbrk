import ServiceQuotePage from '@/components/offerings/ServiceQuotePage'
export default async function Page({ params }: { params: Promise<{ id: string }> }) { return <ServiceQuotePage id={(await params).id} staff={false} /> }
