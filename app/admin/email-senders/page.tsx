"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function EmailSendersPage() {
  const [senders, setSenders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSenders = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/senders/list"); // Cần thêm route list này
      if (res.ok) {
        const data = await res.json();
        setSenders(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSenders();
  }, []);

  const removeSender = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn gỡ bỏ tài khoản này? Toàn bộ lịch sử gửi của tài khoản này cũng sẽ bị ảnh hưởng.")) return;
    
    try {
      const res = await fetch(`/api/admin/senders/${id}`, {
        method: "DELETE"
      });
      if (res.ok) fetchSenders();
      else alert("Lỗi khi gỡ bỏ tài khoản");
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-black text-white p-6 rounded-3xl shadow-xl">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tighter">Email Pool Manager</h1>
          <p className="text-white/60 text-xs font-bold uppercase mt-1">Quản lý tài khoản gửi vệ tinh</p>
        </div>
        <Link href="/api/admin/auth/google">
          <Button className="bg-yellow-400 hover:bg-yellow-500 text-black font-black uppercase text-xs rounded-xl px-6 py-6 shadow-lg shadow-yellow-400/20 transition-all active:scale-95">
            + Kết nối Google Account
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400">Label / Email</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400">Quota Hôm Nay</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400">Trạng Thái</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={4} className="px-6 py-12 text-center font-black uppercase text-[10px] text-gray-400">Đang tải...</td></tr>
            ) : senders.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-gray-400 font-bold uppercase text-xs">
                  Chưa có tài khoản nào được kết nối.
                </td>
              </tr>
            ) : (
              senders.map((sender) => (
                <tr key={sender.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-black text-gray-900 text-sm">{sender.label}</div>
                    <div className="text-gray-400 text-[10px] font-bold">{sender.email}</div>
                    {sender.isMain && (
                      <span className="inline-block mt-1 bg-black text-yellow-400 text-[8px] font-black px-1.5 py-0.5 rounded uppercase">Main Account</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-black rounded-full" 
                          style={{ width: `${(sender.sentToday / sender.dailyLimit) * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-black text-gray-600">
                        {sender.sentToday}/{sender.dailyLimit}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-2 py-1 rounded-lg text-[10px] font-black uppercase ${
                      sender.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}>
                      {sender.isActive ? "Hoạt động" : "Tạm ngưng"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Button 
                      onClick={() => removeSender(sender.id)}
                      className="bg-red-50 text-red-600 hover:bg-red-100 text-[8px] font-black uppercase rounded-lg h-7 px-3 active:scale-95 transition-all"
                    >
                      Gỡ bỏ
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-blue-50 border border-blue-100 p-6 rounded-3xl space-y-2">
        <h3 className="text-blue-900 font-black uppercase text-xs">💡 Hướng dẫn thêm vệ tinh</h3>
        <ul className="text-blue-700/80 text-xs font-bold space-y-1 list-disc list-inside">
          <li>Đảm bảo bạn đã thêm email vệ tinh vào mục "Test Users" trong Google Cloud Console.</li>
          <li>Hệ thống sẽ yêu cầu quyền "Send Email" - Hãy nhấn "Allow" khi được hỏi.</li>
          <li>Mỗi vệ tinh nên gửi tối đa 480 email/ngày để đảm bảo an toàn.</li>
        </ul>
      </div>
    </div>
  );
}
