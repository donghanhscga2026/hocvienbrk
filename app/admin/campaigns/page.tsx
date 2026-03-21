"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/campaigns/list"); // Tôi sẽ tạo route này vì fetch trực tiếp từ API sướng hơn
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
    if (!confirm("Bạn có chắc chắn muốn xóa chiến dịch này? Toàn bộ nhật ký gửi cũng sẽ bị xóa.")) return;
    
    try {
      const res = await fetch(`/api/admin/campaigns/${id}`, {
        method: "DELETE"
      });
      if (res.ok) fetchCampaigns();
    } catch (error) {
      alert("Lỗi khi xóa chiến dịch");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-black text-white p-6 rounded-3xl shadow-xl">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tighter">Email Campaigns</h1>
          <p className="text-white/60 text-xs font-bold uppercase mt-1">Quản lý các đợt gửi thông báo</p>
        </div>
        <Link href="/admin/campaigns/new">
          <Button className="bg-yellow-400 hover:bg-yellow-500 text-black font-black uppercase text-xs rounded-xl px-6 py-6 shadow-lg shadow-yellow-400/20 transition-all active:scale-95">
            + Tạo Chiến Dịch Mới
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400">Tên / Loại</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400">Trạng Thái</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400">Tiến Độ</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400">Ngày Tạo</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center font-black uppercase text-[10px] text-gray-400">Đang tải...</td></tr>
            ) : campaigns.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-400 font-bold uppercase text-xs">
                  Chưa có chiến dịch nào được tạo.
                </td>
              </tr>
            ) : (
              campaigns.map((cp) => (
                <tr key={cp.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-black text-gray-900 text-sm">{cp.title}</div>
                    <div className="text-gray-400 text-[10px] font-bold uppercase">{cp.notificationType}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-2 py-1 rounded-lg text-[10px] font-black uppercase ${
                      cp.status === "COMPLETED" ? "bg-green-100 text-green-700" :
                      cp.status === "RUNNING" ? "bg-blue-100 text-blue-700" :
                      cp.status === "DRAFT" ? "bg-gray-100 text-gray-500" :
                      cp.status === "FAILED" ? "bg-red-100 text-red-700" :
                      "bg-yellow-100 text-yellow-700"
                    }`}>
                      {cp.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="text-[10px] font-black text-gray-500">
                        {cp.sentCount}/{cp.totalRecipients}
                      </div>
                      <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-black" 
                          style={{ width: `${(cp.sentCount / (cp.totalRecipients || 1)) * 100}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[10px] font-bold text-gray-400">
                    {new Date(cp.createdAt).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <Link href={`/admin/campaigns/${cp.id}`}>
                        <Button variant="outline" className="text-[8px] font-black uppercase border-2 rounded-lg h-7 px-3 active:scale-95 transition-all">
                          {cp.status === "DRAFT" ? "Soạn" : "Xem"}
                        </Button>
                      </Link>
                      <Button 
                        onClick={() => deleteCampaign(cp.id)}
                        className="bg-red-50 text-red-600 hover:bg-red-100 text-[8px] font-black uppercase rounded-lg h-7 px-3 active:scale-95 transition-all"
                      >
                        Xóa
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
