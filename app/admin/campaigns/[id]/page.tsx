"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function CampaignDetailPage() {
  const params = useParams();
  const id = params?.id as string; // Lấy ID trực tiếp từ URL
  
  const router = useRouter();
  const [campaign, setCampaign] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const stopRequest = useRef(false);

  const fetchCampaign = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/campaigns/${id}`);
      if (res.ok) {
        const data = await res.json();
        setCampaign(data);
        setProgress((data.sentCount / (data.totalRecipients || 1)) * 100);
      } else {
        const errText = await res.text();
        setError(`Lỗi: ${errText} (ID: ${id})`);
        setCampaign(null);
      }
    } catch (err: any) {
      console.error(err);
      setError(`Lỗi mạng: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/admin/campaigns/${id}/logs`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (id) {
      fetchCampaign();
      fetchLogs();
    }
  }, [id]);

  useEffect(() => {
    let interval: any;
    if (running && id) {
      interval = setInterval(fetchLogs, 10000);
    }
    return () => clearInterval(interval);
  }, [id, running]);

  const startSending = async () => {
    setRunning(true);
    stopRequest.current = false;
    setError(null);
    
    let currentOffset = campaign.sentCount;
    const batchSize = 5;

    while (currentOffset < campaign.totalRecipients) {
      if (stopRequest.current) {
        setRunning(false);
        break;
      }

      try {
        const res = await fetch(`/api/admin/campaigns/${id}/send-batch`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ offset: currentOffset, batchSize }),
        });

        const data = await res.json();
        
        if (!data.success) {
          setError(data.error || "Có lỗi xảy ra khi gửi batch.");
          setRunning(false);
          break;
        }

        currentOffset = data.nextOffset;
        setProgress((currentOffset / campaign.totalRecipients) * 100);
        
        fetchLogs();
        
        if (data.finished) break;

      } catch (err: any) {
        setError(err.message);
        setRunning(false);
        break;
      }
    }
    
    setRunning(false);
    fetchCampaign();
  };

  const pauseSending = () => {
    stopRequest.current = true;
  };

  const abortCampaign = async () => {
    if (!confirm("Bạn có chắc chắn muốn dừng hẳn chiến dịch này không? Không thể tiếp tục sau khi dừng hẳn.")) return;
    
    stopRequest.current = true;
    try {
      const res = await fetch(`/api/admin/campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "FAILED" }),
      });
      if (res.ok) fetchCampaign();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="p-10 text-center font-black uppercase text-xs">Đang tải...</div>;
  if (!campaign) return (
    <div className="p-10 text-center space-y-4">
      <div className="font-black uppercase text-xs text-red-500">❌ {error || "Không tìm thấy chiến dịch"}</div>
      <Button onClick={() => router.push("/admin/campaigns")} className="rounded-xl font-black uppercase text-[10px] bg-black text-white px-6">Quay lại danh sách</Button>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="bg-black text-white p-8 rounded-[40px] shadow-2xl relative overflow-hidden">
        <div className="relative z-10 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-black uppercase bg-yellow-400 text-black px-2 py-0.5 rounded mb-2 inline-block">
                Campaign #{campaign.id}
              </span>
              <h1 className="text-3xl font-black uppercase tracking-tighter">{campaign.title}</h1>
            </div>
            <div className={`px-4 py-2 rounded-2xl text-xs font-black uppercase ${
              campaign.status === "COMPLETED" ? "bg-green-500" : 
              running ? "bg-blue-500 animate-pulse" : "bg-gray-600"
            }`}>
              {running ? "Đang chạy..." : campaign.status}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
            <div>
              <p className="text-[10px] font-black uppercase text-white/40">Tổng nhận</p>
              <p className="text-xl font-black">{campaign.totalRecipients}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-white/40">Đã gửi</p>
              <p className="text-xl font-black text-green-400">{campaign.sentCount}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-white/40">Thất bại</p>
              <p className="text-xl font-black text-red-400">{campaign.failedCount}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-xl space-y-8">
        <div className="space-y-4">
          <div className="flex justify-between items-end">
            <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Tiến độ thực hiện</h3>
            <span className="text-2xl font-black">{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden p-1">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${running ? "bg-blue-500 animate-pulse" : "bg-black"}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border-2 border-red-100 text-red-600 rounded-2xl text-[10px] font-black uppercase">
            ❌ LỖI: {error}
          </div>
        )}

        <div className="flex gap-4">
          {campaign.status !== "COMPLETED" && (
            <>
              {!running ? (
                <Button 
                  onClick={startSending}
                  className="flex-1 h-16 rounded-2xl bg-yellow-400 text-black hover:bg-yellow-500 font-black uppercase text-sm shadow-xl shadow-yellow-400/20 transition-all active:scale-95"
                >
                  ▶️ {campaign.sentCount > 0 ? "Tiếp tục gửi" : "Bắt đầu gửi ngay"}
                </Button>
              ) : (
                <Button 
                  onClick={pauseSending}
                  className="flex-1 h-16 rounded-2xl bg-red-600 text-white hover:bg-red-700 font-black uppercase text-sm shadow-xl shadow-red-600/20 transition-all active:scale-95"
                >
                  ⏸️ Tạm dừng gửi
                </Button>
              )}
              {campaign.status !== "FAILED" && !running && (
                <Button 
                  onClick={abortCampaign}
                  className="h-16 px-4 rounded-2xl bg-gray-100 text-red-600 font-black uppercase text-[10px] border-2 border-red-100 transition-all active:scale-95"
                >
                  🛑 Dừng hẳn
                </Button>
              )}
            </>
          )}
          
          <Button 
            variant="outline"
            onClick={() => router.push("/admin/campaigns")}
            className="h-16 px-8 rounded-2xl font-black uppercase text-[10px] border-2"
          >
            Quay lại
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500">Nhật ký hoạt động (100 mới nhất)</h3>
          <Button onClick={fetchLogs} variant="ghost" className="text-[8px] font-black uppercase">Làm mới</Button>
        </div>
        <div className="overflow-x-auto max-h-[400px]">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/30 border-b border-gray-100">
                <th className="px-6 py-3 text-[8px] font-black uppercase text-gray-400">Email nhận</th>
                <th className="px-6 py-3 text-[8px] font-black uppercase text-gray-400">Trạng thái</th>
                <th className="px-6 py-3 text-[8px] font-black uppercase text-gray-400">Chi tiết/Lỗi</th>
                <th className="px-6 py-3 text-[8px] font-black uppercase text-gray-400">Thời gian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-gray-400 font-bold uppercase text-[10px]">Chưa có hoạt động nào</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="text-[10px] hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-3 font-bold">{log.toEmail}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-0.5 rounded-lg font-black uppercase text-[8px] ${
                        log.status === "SENT" ? "bg-green-100 text-green-700" :
                        log.status === "FAILED" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-400 max-w-[200px] truncate">
                      {log.errorCode || "-"}
                    </td>
                    <td className="px-6 py-3 text-gray-400">
                      {new Date(log.sentAt).toLocaleTimeString('vi-VN')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
