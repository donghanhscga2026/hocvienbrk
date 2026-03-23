"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Mail, Radio, Settings } from "lucide-react";

export default function CampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/campaigns/list");
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const deleteCampaign = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa chiến dịch này?")) return;
    
    try {
      const res = await fetch(`/api/admin/campaigns/${id}`, {
        method: "DELETE"
      });
      if (res.ok) fetchCampaigns();
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
          <Link href="/admin/campaigns/new">
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
        {loading ? (
          <div className="text-center py-12 text-gray-400 font-medium">Đang tải...</div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-12 text-gray-400 font-medium">
            Chưa có chiến dịch nào.
          </div>
        ) : (
          campaigns.map((cp) => (
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
                  className="bg-red-50 text-red-600 text-sm font-bold px-3 py-2 rounded-lg"
                >
                  Xóa
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
