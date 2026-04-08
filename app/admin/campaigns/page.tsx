import prisma from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import CampaignList from "@/components/admin/campaign/CampaignList";
import ToolHeader from "@/components/tools/ToolHeader";

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
      <ToolHeader title="EMAIL MKT" backUrl="/admin" />

      {/* Sub Navigation */}
      <div className="flex gap-1 px-4 py-2 bg-white border-b overflow-x-auto">
        <Link href="/admin/campaigns" className="px-3 py-1.5 rounded-full text-xs font-bold bg-orange-500 text-white">
          📋 Chiến dịch
        </Link>
        <Link href="/admin/email-senders" className="px-3 py-1.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600 hover:bg-gray-200">
          📡 Tài Khoản
        </Link>
        <Link href="/admin/email-settings" className="px-3 py-1.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600 hover:bg-gray-200">
          ⚙️ Cấu Hình
        </Link>
      </div>

      <div className="p-4">
        <div className="flex justify-end mb-4">
          <Link href="/admin/campaigns/new" prefetch={false}>
            <Button className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold text-sm rounded-lg px-3 py-2">
              + Tạo Mới
            </Button>
          </Link>
        </div>
        <CampaignList initialCampaigns={JSON.parse(JSON.stringify(campaigns))} />
      </div>
    </div>
  );
}