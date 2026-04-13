import prisma from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import MainHeader from '@/components/layout/MainHeader'
import { Suspense } from 'react'
import ClientContent from './ClientContent'

interface Campaign {
  id: number
  title: string
  status: string
  totalRecipients: number
  sentCount: number
  failedCount: number
  createdAt: Date
  notificationType: string
}

export default async function EmailMktPage() {
  const campaigns = await prisma.emailCampaign.findMany({
    select: {
      id: true,
      title: true,
      status: true,
      totalRecipients: true,
      sentCount: true,
      failedCount: true,
      createdAt: true,
      notificationType: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <MainHeader title="EMAIL MKT" toolSlug="email-mkt" />
      <div className="max-w-lg mx-auto p-4">
        <div className="flex justify-end mb-4">
          <Link href="/admin/campaigns/new">
            <Button className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold text-sm rounded-lg px-3 py-2">
              + Tạo Mới
            </Button>
          </Link>
        </div>
        <Suspense fallback={<div className="text-center py-12">Đang tải...</div>}>
          <ClientContent initialCampaigns={campaigns} />
        </Suspense>
      </div>
    </div>
  )
}