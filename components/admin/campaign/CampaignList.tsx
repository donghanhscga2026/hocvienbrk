"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface CampaignListProps {
  initialCampaigns: any[];
}

export default function CampaignList({ initialCampaigns }: CampaignListProps) {
  const router = useRouter();

  const deleteCampaign = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa chiến dịch này?")) return;
    
    try {
      const res = await fetch(`/api/admin/campaigns/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        router.refresh(); // Làm mới dữ liệu từ Server Component
      } else {
        alert("Lỗi khi xóa chiến dịch");
      }
    } catch (error) {
      alert("Lỗi khi xóa chiến dịch");
    }
  };

  const restartCampaign = async (id: number) => {
    if (!confirm("Bạn có muốn gửi lại chiến dịch này không?")) return;
    
    try {
      const res = await fetch(`/api/admin/campaigns/${id}/restart`, {
        method: "POST"
      });
      if (res.ok) {
        router.push(`/admin/campaigns/${id}`);
      } else {
        alert("Lỗi khi đặt lại chiến dịch");
      }
    } catch (error) {
      console.error(error);
    }
  };

  if (initialCampaigns.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 font-medium">
        Chưa có chiến dịch nào.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {initialCampaigns.map((cp) => (
        <div key={cp.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="font-bold text-gray-900">{cp.title}</h3>
              <span className="text-xs text-gray-400 uppercase">{cp.notificationType}</span>
            </div>
            <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
              cp.status === "COMPLETED" ? "bg-green-100 text-green-700" :
              cp.status === "RUNNING" ? "bg-blue-100 text-blue-700" :
              cp.status === "DRAFT" ? "bg-gray-100 text-gray-500" :
              cp.status === "FAILED" ? "bg-red-100 text-red-700" :
              "bg-yellow-100 text-yellow-700"
            }`}>
              {cp.status}
            </span>
          </div>
          
          <div className="mb-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Tiến độ</span>
              <span>{cp.sentCount}/{cp.totalRecipients}</span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-orange-500" 
                style={{ width: `${(cp.sentCount / (cp.totalRecipients || 1)) * 100}%` }}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Link href={`/admin/campaigns/${cp.id}`} className="flex-1">
              <Button className="w-full bg-black text-white text-sm font-bold rounded-lg py-2">
                {cp.status === "DRAFT" ? "Soạn" : "Xem"}
              </Button>
            </Link>
            <Button 
              onClick={() => deleteCampaign(cp.id)}
              variant="outline"
              className="bg-red-50 text-red-600 text-sm font-bold px-3 py-2 rounded-lg border-none hover:bg-red-100"
            >
              Xóa
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
