"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function NewCampaignPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: "",
    notificationType: "ANNOUNCEMENT",
    recipientSource: "DB_ALL",
    recipientCsvData: "",
    subject: "",
    htmlContent: "",
  });

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        const campaign = await res.json();
        router.push(`/admin/campaigns/${campaign.id}`);
      } else {
        alert("Lỗi khi tạo chiến dịch");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      {/* Progress Steps */}
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-gray-100 shadow-sm sticky top-24 z-50">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${
              step >= s ? "bg-black text-yellow-400" : "bg-gray-100 text-gray-400"
            }`}>
              {s}
            </div>
            <span className={`text-[10px] font-black uppercase hidden md:inline ${
              step >= s ? "text-black" : "text-gray-300"
            }`}>
              {s === 1 ? "Loại" : s === 2 ? "Người nhận" : s === 3 ? "Nội dung" : "Review"}
            </span>
            {s < 4 && <div className="w-8 md:w-16 h-px bg-gray-100 ml-2" />}
          </div>
        ))}
      </div>

      <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-xl space-y-6">
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-xl font-black uppercase">Bước 1: Loại Thông Báo</h2>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-gray-400 ml-4">Tên chiến dịch (nội bộ)</label>
              <Input 
                placeholder="VD: Thông báo khóa học React 03" 
                className="rounded-2xl h-14 font-bold border-2 focus:border-black"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {["ANNOUNCEMENT", "NEW_LESSON", "ZOOM_SESSION", "NEW_POST", "CUSTOM"].map((type) => (
                <button
                  key={type}
                  onClick={() => setFormData({...formData, notificationType: type})}
                  className={`p-6 rounded-3xl border-2 font-black uppercase text-[10px] text-center transition-all ${
                    formData.notificationType === type ? "border-black bg-black text-yellow-400 shadow-lg" : "border-gray-100 hover:border-gray-200"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-xl font-black uppercase">Bước 2: Người Nhận</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { id: "DB_ALL", label: "Tất cả học viên trong DB" },
                { id: "CSV", label: "Upload danh sách CSV" },
              ].map((src) => (
                <button
                  key={src.id}
                  onClick={() => setFormData({...formData, recipientSource: src.id})}
                  className={`p-6 rounded-3xl border-2 font-black uppercase text-[10px] text-left transition-all ${
                    formData.recipientSource === src.id ? "border-black bg-black text-yellow-400 shadow-lg" : "border-gray-100 hover:border-gray-200"
                  }`}
                >
                  {src.label}
                </button>
              ))}
            </div>
            {formData.recipientSource === "CSV" && (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-4">Paste dữ liệu JSON (Tạm thời dùng JSON Array: [&#123;"email":"...","name":"..."&#125;])</label>
                <Textarea 
                  placeholder='[{"email":"test@gmail.com", "name":"Học viên A"}]'
                  className="rounded-3xl min-h-[200px] font-bold border-2 focus:border-black"
                  value={formData.recipientCsvData}
                  onChange={(e) => setFormData({...formData, recipientCsvData: e.target.value})}
                />
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-xl font-black uppercase">Bước 3: Nội Dung Email</h2>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-gray-400 ml-4">Tiêu đề email (Học viên sẽ thấy)</label>
              <Input 
                placeholder="[Học Viện BRK] Chào [Tên], bạn có bài học mới!" 
                className="rounded-2xl h-14 font-bold border-2 focus:border-black"
                value={formData.subject}
                onChange={(e) => setFormData({...formData, subject: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center ml-4">
                <label className="text-[10px] font-black uppercase text-gray-400">Nội dung HTML (Hỗ trợ SPIN {`{a|b}`})</label>
                <div className="flex gap-2">
                  <button onClick={() => setFormData({...formData, htmlContent: formData.htmlContent + "{Chào|Xin chào|Hi}"})} className="text-[8px] bg-gray-100 px-2 py-1 rounded font-black">+ Spin</button>
                  <button onClick={() => setFormData({...formData, htmlContent: formData.htmlContent + "[Tên]"})} className="text-[8px] bg-gray-100 px-2 py-1 rounded font-black">+ [Tên]</button>
                </div>
              </div>
              <Textarea 
                placeholder="<h1>{Chào|Hi} [Tên],</h1><p>Bạn có bài học mới tại Học Viện BRK.</p>"
                className="rounded-3xl min-h-[300px] font-bold border-2 focus:border-black font-mono text-sm"
                value={formData.htmlContent}
                onChange={(e) => setFormData({...formData, htmlContent: e.target.value})}
              />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <h2 className="text-xl font-black uppercase">Bước 4: Review & Lưu</h2>
            <div className="bg-gray-50 p-6 rounded-3xl space-y-4">
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="text-[10px] font-black uppercase text-gray-400">Tên:</span>
                <span className="text-sm font-black">{formData.title}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="text-[10px] font-black uppercase text-gray-400">Nguồn:</span>
                <span className="text-sm font-black">{formData.recipientSource}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="text-[10px] font-black uppercase text-gray-400">Tiêu đề:</span>
                <span className="text-sm font-black italic">{formData.subject}</span>
              </div>
            </div>
            <div className="p-6 border-2 border-dashed border-gray-100 rounded-3xl">
              <p className="text-[10px] font-black uppercase text-gray-300 mb-2">Preview thô:</p>
              <div className="text-xs text-gray-500 overflow-hidden line-clamp-5 whitespace-pre-wrap">{formData.htmlContent}</div>
            </div>
          </div>
        )}

        <div className="flex justify-between pt-6 border-t border-gray-100">
          <Button 
            variant="outline" 
            onClick={() => step > 1 && setStep(step - 1)}
            disabled={step === 1 || loading}
            className="rounded-2xl h-14 px-8 font-black uppercase border-2 transition-all active:scale-95"
          >
            Quay lại
          </Button>
          
          {step < 4 ? (
            <Button 
              onClick={() => setStep(step + 1)}
              className="bg-black text-white rounded-2xl h-14 px-8 font-black uppercase transition-all active:scale-95"
            >
              Tiếp tục
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit}
              disabled={loading}
              className="bg-yellow-400 text-black hover:bg-yellow-500 rounded-2xl h-14 px-12 font-black uppercase transition-all active:scale-95 shadow-xl shadow-yellow-400/20"
            >
              {loading ? "Đang lưu..." : "Lưu Chiến Dịch"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
