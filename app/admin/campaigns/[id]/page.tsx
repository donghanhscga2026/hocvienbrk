"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function CampaignDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  
  const router = useRouter();
  const [campaign, setCampaign] = useState<any>(null);
  const [logsBySender, setLogsBySender] = useState<Record<number, any[]>>({});
  const [senders, setSenders] = useState<any[]>([]);
  const [senderStats, setSenderStats] = useState<any[]>([]);
  const [logsNoSender, setLogsNoSender] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
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

  const fetchProgress = async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/admin/campaigns/${id}/progress`);
      if (res.ok) {
        const data = await res.json();
        setCampaign(prev => prev ? { ...prev, sentCount: data.sentCount, failedCount: data.failedCount, status: data.status } : null);
        setProgress((data.sentCount / (data.totalRecipients || 1)) * 100);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLogs = async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/admin/campaigns/${id}/logs`);
      if (res.ok) {
        const data = await res.json();
        setLogsBySender(data.logsBySender || {});
        setSenders(data.senders || []);
        setSenderStats(data.senderStats || []);
        setLogsNoSender(data.logsNoSender || []);
        setSummary(data.summary || null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const scanBounces = async () => {
    setScanning(true);
    setScanResult(null);
    try {
      const res = await fetch(`/api/admin/campaigns/bounce-scan`, {
        method: "POST"
      });
      if (res.ok) {
        const data = await res.json();
        setScanResult(data);
        await fetchCampaign();
        await fetchLogs();
        
        const totalBounced = (data.hardBounced || 0) + (data.softBounced || 0);
        const details = data.senderDetails?.map((s: any) => 
          `${s.email}: 🔴${s.hardBounced} 🟡${s.softBounced}`
        ).join('\n') || '';
        
        alert(`Đã quét xong!\n🔴 HARD BOUNCE: ${data.hardBounced}\n🟡 SOFT BOUNCE: ${data.softBounced}\n\nChi tiết:\n${details}`);
      } else {
        alert("Lỗi khi quét bounce");
      }
    } catch (error) {
      console.error(error);
      alert("Lỗi mạng khi quét bounce");
    } finally {
      setScanning(false);
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
      interval = setInterval(fetchProgress, 5000);
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

  const restartCampaign = async () => {
    if (!confirm("Bạn có muốn gửi lại toàn bộ chiến dịch này không? Toàn bộ nhật ký cũ sẽ bị xóa và tiến độ sẽ quay về 0.")) return;
    
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/campaigns/${id}/restart`, {
        method: "POST"
      });
      if (res.ok) {
        await fetchCampaign();
        await fetchLogs();
      } else {
        alert("Lỗi khi đặt lại chiến dịch");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
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

        <div className="flex flex-wrap gap-4">
          {/* Nút chính: Bắt đầu / Tiếp tục / Tạm dừng */}
          {campaign.status !== "COMPLETED" ? (
            !running ? (
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
            )
          ) : (
            <div className="flex-1 h-16 rounded-2xl bg-green-50 text-green-700 border-2 border-green-100 flex items-center justify-center font-black uppercase text-xs">
              ✅ Chiến dịch đã hoàn thành
            </div>
          )}

          {/* Nút Reset / Gửi lại từ đầu: Hiện khi đã có tiến độ và không đang chạy */}
          {campaign.sentCount > 0 && !running && (
            <Button 
              onClick={restartCampaign}
              className="h-16 px-8 rounded-2xl bg-blue-50 text-blue-600 hover:bg-blue-100 font-black uppercase text-[10px] border-2 border-blue-100 transition-all active:scale-95"
            >
              🔄 Gửi lại từ đầu
            </Button>
          )}

          {/* Nút Dừng hẳn */}
          {campaign.status !== "COMPLETED" && campaign.status !== "FAILED" && !running && (
            <Button 
              onClick={abortCampaign}
              className="h-16 px-6 rounded-2xl bg-gray-100 text-red-600 font-black uppercase text-[10px] border-2 border-red-100 transition-all active:scale-95"
            >
              🛑 Dừng hẳn
            </Button>
          )}

          {/* Nút Quét Bounce - Hiện khi không đang gửi */}
          {!running && campaign.sentCount > 0 && (
            <Button 
              onClick={scanBounces}
              disabled={scanning}
              className="h-16 px-8 rounded-2xl bg-black text-white hover:bg-gray-800 font-black uppercase text-[10px] transition-all active:scale-95 disabled:opacity-50"
            >
              {scanning ? "⌛ Đang quét..." : "🧹 Quét Bounce & Làm sạch"}
            </Button>
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

      <div className="space-y-4">
        <div className="bg-gray-50 rounded-2xl p-4 flex flex-wrap justify-between items-center gap-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500">Nhật ký hoạt động</h3>
          
          {summary && (
            <div className="flex gap-3 text-[9px]">
              <span className="px-3 py-1.5 rounded-lg bg-green-100 text-green-700 font-black">
                ✅ Gửi: {summary.sent}
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-red-100 text-red-700 font-black">
                🔴 Lỗi: {summary.bounced}
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-yellow-100 text-yellow-700 font-black">
                ⚠️ Khác: {summary.failed}
              </span>
            </div>
          )}
          
          <Button onClick={fetchLogs} variant="ghost" className="text-[8px] font-black uppercase">🔄 Làm mới</Button>
        </div>

        {senderStats.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center text-gray-400 font-bold uppercase text-xs">
            Chưa có hoạt động nào
          </div>
        ) : (
          senderStats.map((sender) => {
            const logs = logsBySender[sender.id] || [];
            return (
              <div key={sender.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-black text-xs">
                      {sender.id}
                    </span>
                    <div>
                      <p className="font-black text-sm text-gray-800">{sender.email}</p>
                      <p className="text-[9px] text-gray-400">{sender.label}</p>
                    </div>
                  </div>
                  <div className="flex gap-3 text-[9px]">
                    <span className="px-2 py-1 rounded bg-green-100 text-green-700 font-bold">
                      ✅ {sender.sent}
                    </span>
                    <span className="px-2 py-1 rounded bg-red-100 text-red-700 font-bold">
                      🔴 {sender.bounced}
                    </span>
                    <span className="px-2 py-1 rounded bg-gray-100 text-gray-600 font-bold">
                      Tổng: {sender.total}
                    </span>
                  </div>
                </div>
                
                <div className="overflow-x-auto max-h-[300px]">
                  <table className="w-full text-left">
                    <thead className="sticky top-0 bg-gray-50/80 backdrop-blur-sm z-10">
                      <tr className="border-b border-gray-100">
                        <th className="px-4 py-2 text-[7px] font-black uppercase text-gray-400 w-10">#</th>
                        <th className="px-4 py-2 text-[7px] font-black uppercase text-gray-400">Email nhận</th>
                        <th className="px-4 py-2 text-[7px] font-black uppercase text-gray-400 w-20">Trạng thái</th>
                        <th className="px-4 py-2 text-[7px] font-black uppercase text-gray-400 w-20">Loại</th>
                        <th className="px-4 py-2 text-[7px] font-black uppercase text-gray-400 w-24">Thời gian</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {logs.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-6 text-center text-gray-300 text-[9px] font-bold uppercase">
                            Chưa gửi email nào
                          </td>
                        </tr>
                      ) : (
                        logs.map((log: any, idx: number) => (
                          <tr key={log.id} className="text-[9px] hover:bg-gray-50/50 transition-colors">
                            <td className="px-4 py-2 text-gray-300">{idx + 1}</td>
                            <td className="px-4 py-2 font-bold text-gray-700">{log.toEmail}</td>
                            <td className="px-4 py-2">
                              <span className={`px-2 py-0.5 rounded font-black uppercase text-[7px] ${
                                log.status === "SENT" ? "bg-green-100 text-green-700" :
                                log.status === "BOUNCED" ? "bg-red-100 text-red-700" :
                                log.status === "FAILED" ? "bg-red-100 text-red-700" : 
                                log.status === "SKIPPED" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-700"
                              }`}>
                                {log.status}
                              </span>
                            </td>
                            <td className="px-4 py-2">
                              {log.errorType && (
                                <span className={`px-2 py-0.5 rounded text-[7px] font-black ${
                                  log.errorType === "HARD_BOUNCE" ? "bg-red-100 text-red-600" :
                                  log.errorType === "SOFT_BOUNCE" ? "bg-yellow-100 text-yellow-600" : "bg-gray-100 text-gray-600"
                                }`}>
                                  {log.errorType === "HARD_BOUNCE" ? "🔴" : 
                                   log.errorType === "SOFT_BOUNCE" ? "🟡" : log.errorType}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-gray-400">
                              {new Date(log.sentAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })
        )}
        
        {logsNoSender.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-100">
              <p className="font-black text-sm text-gray-500">📧 Không xác định vệ tinh ({logsNoSender.length} emails)</p>
            </div>
            <div className="overflow-x-auto max-h-[200px]">
              <table className="w-full text-left">
                <tbody className="divide-y divide-gray-50">
                  {logsNoSender.slice(0, 20).map((log: any, idx: number) => (
                    <tr key={log.id} className="text-[9px]">
                      <td className="px-4 py-2 text-gray-300 w-10">{idx + 1}</td>
                      <td className="px-4 py-2 font-bold text-gray-600">{log.toEmail}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-0.5 rounded font-black uppercase text-[7px] ${
                          log.status === "SENT" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        }`}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
