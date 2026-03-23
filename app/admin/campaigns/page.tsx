import prisma from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import CampaignList from "@/components/admin/campaign/CampaignList";

export default async function CampaignsPage() {
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
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-black text-white shadow-lg sticky top-0 z-50">
        <div className="flex items-center justify-between p-4 max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-white/10 hover:bg-white/20">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-xs font-medium">Quay ra</span>
            </Link>
            <h1 className="text-lg font-bold text-yellow-400">Email MKT</h1>
          </div>
          <Link href="/admin/campaigns/new" prefetch={false}>
            <Button className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold text-sm rounded-lg px-3 py-2">
              + Tạo Mới
            </Button>
          </Link>
        </div>
        {/* Sub Navigation */}
        <div className="flex gap-1 px-4 pb-3 overflow-x-auto">
          <Link href="/admin/campaigns" className="px-3 py-1.5 rounded-full text-xs font-bold bg-orange-500 text-white">
            📋 Chiến dịch
          </Link>
          <Link href="/admin/email-senders" className="px-3 py-1.5 rounded-full text-xs font-bold bg-white/10 text-white/70 hover:bg-white/20">
            📡 Tài Khoản
          </Link>
          <Link href="/admin/email-settings" className="px-3 py-1.5 rounded-full text-xs font-bold bg-white/10 text-white/70 hover:bg-white/20">
            ⚙️ Cấu Hình
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-lg mx-auto p-4 space-y-3">
        <CampaignList initialCampaigns={JSON.parse(JSON.stringify(campaigns))} />
      </div>
    </div>
  );
}
