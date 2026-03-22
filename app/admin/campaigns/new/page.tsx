"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

export default function NewCampaignPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cloneId = searchParams.get("cloneId");
  const editId = searchParams.get("editId"); // Thêm ID chỉnh sửa
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageMap, setImageMap] = useState<Record<string, string>>({}); // Lưu { "[ẢNH_1]": "data:..." }
  
  const [formData, setFormData] = useState({
    title: "",
    notificationType: "ANNOUNCEMENT",
    recipientSource: "DB_ALL",
    recipientFilter: {} as any,
    recipientCsvData: "",
    subject: "",
    htmlContent: "",
  });

  // GHI CHÚ: Hàm chèn văn bản vào vị trí con trỏ trong Textarea
  const insertText = (insertion: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = formData.htmlContent;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);

    setFormData({
      ...formData,
      htmlContent: before + insertion + after
    });

    // Reset focus và vị trí con trỏ sau khi render
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + insertion.length, start + insertion.length);
    }, 0);
  };

  // Hàm biên dịch nội dung từ mã ngắn sang HTML đầy đủ
  const compileHtml = (text: string, currentMap = imageMap) => {
    let result = text;
    Object.entries(currentMap).forEach(([placeholder, base64]) => {
      // Đảm bảo không bị lặp thẻ img nếu data đã là HTML
      if (!base64.startsWith('<img')) {
        const imgTag = `<img src="${base64}" style="max-width:100%; border-radius:15px; margin: 10px 0; display: block;" />`;
        result = result.split(placeholder).join(imgTag);
      } else {
        result = result.split(placeholder).join(base64);
      }
    });
    return result;
  };

  // Load dữ liệu nếu là Clone hoặc Edit
  useEffect(() => {
    const idToLoad = cloneId || editId;
    if (idToLoad) {
      setLoading(true);
      fetch(`/api/admin/campaigns/${idToLoad}`)
        .then(res => res.json())
        .then(data => {
          let content = data.htmlContent || "";
          const newMap: Record<string, string> = {};
          
          // GHI CHÚ: Trích xuất ảnh data:image để đưa về dạng placeholder [ẢNH_N]
          const imgRegex = /<img[^>]*src="(data:image\/[^">]+)"[^>]*>/g;
          let match;
          let count = 1;
          const originalContent = content;
          
          while ((match = imgRegex.exec(originalContent)) !== null) {
            const placeholder = `[ẢNH_${count}]`;
            newMap[placeholder] = match[1];
            content = content.replace(match[0], placeholder);
            count++;
          }

          setImageMap(newMap);
          setFormData({
            title: editId ? data.title : `${data.title} (Bản sao)`,
            notificationType: data.notificationType || "ANNOUNCEMENT",
            recipientSource: data.recipientSource || "DB_ALL",
            recipientFilter: data.recipientFilter || {},
            recipientCsvData: data.recipientCsvData || "[]",
            subject: data.subject || "",
            htmlContent: content,
          });
          setLoading(false);
        })
        .catch(err => {
          console.error("Lỗi load campaign:", err);
          setLoading(false);
        });
    }
  }, [cloneId, editId, router]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const body = new FormData();
    body.append("file", file);

    try {
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body
      });
      const data = await res.json();
      if (data.url) {
        const nextId = Object.keys(imageMap).length + 1;
        const placeholder = `[ẢNH_${nextId}]`;
        
        setImageMap(prev => ({ ...prev, [placeholder]: data.url }));
        insertText(`\n${placeholder}\n`);
      }
    } catch (err) {
      alert("Lỗi upload ảnh");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleTypeSelect = (type: string) => {
    let subject = "";
    let content = "";

    switch (type) {
      case "NEW_LESSON":
        subject = "[Học Viện BRK] 📹 Bài học mới vừa được cập nhật!";
        content = "<h2>{Chào|Hi} [Tên],</h2><p>Khóa học của bạn đã có <b>bài học mới</b> cực kỳ quan trọng.</p><p>Hãy đăng nhập vào Học Viện để xem ngay nhé!</p>";
        break;
      case "ZOOM_SESSION":
        subject = "[Học Viện BRK] 🎥 Nhắc nhở: Buổi học Zoom tối nay [Tên] nhé!";
        content = "<h2>{Chào bạn|Xin chào|Chào} [Tên] thân mến,</h2><p>Tối nay chúng ta sẽ có buổi <b>Zoom Chuyên Sâu</b> vào lúc 20:00.</p><p>Link Zoom: <b>https://zoom.link...</b><br/>ID: <b>978 941...</b> | Pass: <b>9319</b></p><p>Hẹn gặp bạn tối nay!</p>";
        break;
      case "NEW_POST":
        subject = "[Học Viện BRK] 📰 Có tin tức mới trên Bảng tin";
        content = "<h2>[Tên] ơi, bảng tin vừa có cập nhật mới!</h2><p>Đã có một bài viết mới vừa được đăng tải. Bạn hãy vào xem để cập nhật các kiến thức mới nhất từ Admin nhé.</p>";
        break;
      default:
        subject = "[Học Viện BRK] Thông báo quan trọng tới [Tên]";
        content = "<h2>Chào [Tên],</h2><p>Học Viện BRK có thông báo quan trọng gửi tới bạn...</p>";
    }

    setFormData({
      ...formData,
      notificationType: type,
      subject: subject,
      htmlContent: content
    });
  };

  // States cho việc chọn người nhận
  const [potentialRecipients, setPotentialRecipients] = useState<any[]>([]);
  const [fetchingUsers, setFetchingUsers] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [courses, setCourses] = useState<any[]>([]);

  // Lấy danh sách khóa học để filter
  useEffect(() => {
    fetch("/api/admin/courses/list").then(res => res.json()).then(data => setCourses(data));
  }, []);

  // Fetch ứng viên khi chọn nguồn
  const fetchPotentialUsers = async (source: string, courseId?: string) => {
    setFetchingUsers(true);
    try {
      const url = `/api/admin/campaigns/potential-recipients?source=${source}${courseId ? `&courseId=${courseId}` : ""}`;
      const res = await fetch(url);
      const data = await res.json();
      setPotentialRecipients(data);
      // Mặc định chọn tất cả
      setSelectedIds(new Set(data.map((u: any) => u.id)));
    } catch (error) {
      console.error(error);
    } finally {
      setFetchingUsers(false);
    }
  };

  const handleSourceSelect = (source: string) => {
    setFormData({ ...formData, recipientSource: source });
    if (source === "DB_ALL") {
      fetchPotentialUsers("DB_ALL");
    }
  };

  const handleCourseSelect = (courseId: string) => {
    setFormData({ ...formData, recipientFilter: { courseId } });
    fetchPotentialUsers("DB_ACTIVE", courseId);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredUsers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredUsers.map(u => u.id)));
    }
  };

  const toggleSelectOne = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const filteredUsers = potentialRecipients.filter(u => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.id.toString().includes(searchTerm)
  );

  const confirmRecipients = () => {
    const finalSelection = potentialRecipients
      .filter(u => selectedIds.has(u.id))
      .map(u => ({ email: u.email, name: u.name, userId: u.id }));
    
    setFormData({
      ...formData,
      recipientSource: "SELECTED_LIST",
      recipientCsvData: JSON.stringify(finalSelection)
    });
    setStep(3);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const finalHtml = compileHtml(formData.htmlContent);
      
      const url = editId ? `/api/admin/campaigns/${editId}` : "/api/admin/campaigns";
      const method = editId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          htmlContent: finalHtml,
          totalRecipients: JSON.parse(formData.recipientCsvData || "[]").length,
          status: "DRAFT" // Sửa xong đưa về Draft để chuẩn bị gửi lại
        }),
      });
      if (res.ok) {
        const campaign = await res.json();
        router.push(`/admin/campaigns/${campaign.id}`);
      } else {
        alert("Lỗi khi lưu chiến dịch");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
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
            <h2 className="text-xl font-black uppercase tracking-tighter">Bước 1: Loại Thông Báo</h2>
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
                  onClick={() => handleTypeSelect(type)}
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
            <h2 className="text-xl font-black uppercase tracking-tighter">Bước 2: Chọn Người Nhận</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <button
                onClick={() => handleSourceSelect("DB_ALL")}
                className={`p-4 rounded-2xl border-2 font-black uppercase text-[10px] text-center transition-all ${
                  formData.recipientSource === "DB_ALL" ? "border-black bg-black text-yellow-400" : "border-gray-100"
                }`}
              >
                👥 Tất cả
              </button>
              <div className="relative">
                <select 
                  onChange={(e) => handleCourseSelect(e.target.value)}
                  className={`w-full h-full p-4 rounded-2xl border-2 font-black uppercase text-[10px] appearance-none bg-transparent ${
                    formData.recipientSource === "DB_ACTIVE" ? "border-black bg-black text-yellow-400" : "border-gray-100 text-gray-400"
                  }`}
                >
                  <option value="">📘 Theo khóa</option>
                  {courses.map(c => <option key={c.id} value={c.id} className="text-black">{c.name_lop}</option>)}
                </select>
              </div>
              <button
                onClick={() => setFormData({...formData, recipientSource: "GOOGLE_SHEET"})}
                className={`p-4 rounded-2xl border-2 font-black uppercase text-[10px] text-center transition-all ${
                  formData.recipientSource === "GOOGLE_SHEET" ? "border-black bg-black text-yellow-400" : "border-gray-100"
                }`}
              >
                📊 Google Sheet
              </button>
              <button
                onClick={() => setFormData({...formData, recipientSource: "CSV"})}
                className={`p-4 rounded-2xl border-2 font-black uppercase text-[10px] text-center transition-all ${
                  formData.recipientSource === "CSV" ? "border-black bg-black text-yellow-400" : "border-gray-100"
                }`}
              >
                📄 Import CSV
              </button>
            </div>

            {formData.recipientSource === "GOOGLE_SHEET" && (
              <div className="flex gap-4 p-6 bg-yellow-50 rounded-3xl border-2 border-yellow-100">
                <Input 
                  placeholder="Dán Google Sheet ID hoặc URL..." 
                  className="rounded-xl h-12 font-bold bg-white border-2"
                  onBlur={async (e) => {
                    const val = e.target.value;
                    let id = val;
                    if (val.includes("/d/")) id = val.split("/d/")[1].split("/")[0];
                    if (id) {
                      setFetchingUsers(true);
                      try {
                        const res = await fetch("/api/admin/campaigns/google-sheets", {
                          method: "POST",
                          body: JSON.stringify({ spreadsheetId: id })
                        });
                        const data = await res.json();
                        setPotentialRecipients(data);
                        setSelectedIds(new Set(data.map((u: any) => u.id)));
                      } catch (err) { alert("Lỗi nạp Sheet"); }
                      finally { setFetchingUsers(false); }
                    }
                  }}
                />
                <div className="text-[8px] font-black uppercase text-yellow-600 max-w-[200px]">
                  * Nhập ID bảng tính. Email ở cột A, Tên ở cột B. <br/>
                  * Tài khoản vệ tinh phải có quyền truy cập Sheet này.
                </div>
              </div>
            )}

            {formData.recipientSource === "CSV" ? (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-4">Paste dữ liệu JSON (Array: [&#123;"email":"...","name":"..."&#125;])</label>
                <Textarea 
                  placeholder='[{"email":"test@gmail.com", "name":"Học viên A"}]'
                  className="rounded-3xl min-h-[200px] font-bold border-2 focus:border-black"
                  value={formData.recipientCsvData}
                  onChange={(e) => setFormData({...formData, recipientCsvData: e.target.value})}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex gap-4">
                  <Input 
                    placeholder="Tìm kiếm theo tên, email hoặc mã HV..."
                    className="rounded-xl h-12 font-bold border-2"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <div className="flex items-center gap-2 bg-gray-50 px-4 rounded-xl border-2 border-gray-100">
                    <span className="text-[10px] font-black uppercase text-gray-400 whitespace-nowrap">Đã chọn:</span>
                    <span className="text-sm font-black">{selectedIds.size}</span>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-3xl border border-gray-100 overflow-hidden">
                  <div className="max-h-[400px] overflow-y-auto">
                    <table className="w-full text-left">
                      <thead className="sticky top-0 bg-white border-b border-gray-100 z-10">
                        <tr>
                          <th className="p-4 w-10">
                            <Checkbox 
                              checked={selectedIds.size === filteredUsers.length && filteredUsers.length > 0}
                              onCheckedChange={toggleSelectAll}
                            />
                          </th>
                          <th className="p-4 text-[8px] font-black uppercase text-gray-400">Học viên</th>
                          <th className="p-4 text-[8px] font-black uppercase text-gray-400">Email</th>
                          <th className="p-4 text-[8px] font-black uppercase text-gray-400">Mã HV</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {fetchingUsers ? (
                          <tr><td colSpan={4} className="p-10 text-center text-[10px] font-black uppercase animate-pulse">Đang tải danh sách...</td></tr>
                        ) : filteredUsers.length === 0 ? (
                          <tr><td colSpan={4} className="p-10 text-center text-[10px] font-black uppercase text-gray-400">Không có dữ liệu</td></tr>
                        ) : (
                          filteredUsers.map(user => (
                            <tr key={user.id} className="hover:bg-white transition-colors cursor-pointer" onClick={() => toggleSelectOne(user.id)}>
                              <td className="p-4" onClick={(e) => e.stopPropagation()}>
                                <Checkbox 
                                  checked={selectedIds.has(user.id)}
                                  onCheckedChange={() => toggleSelectOne(user.id)}
                                />
                              </td>
                              <td className="p-4 text-[10px] font-bold">{user.name || "N/A"}</td>
                              <td className="p-4 text-[10px] text-gray-500 font-medium">{user.email}</td>
                              <td className="p-4 text-[10px] font-black text-gray-400">{user.id}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                <Button 
                  onClick={confirmRecipients}
                  disabled={selectedIds.size === 0}
                  className="w-full h-14 bg-black text-yellow-400 rounded-2xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all"
                >
                  Xác nhận danh sách ({selectedIds.size} người)
                </Button>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-xl font-black uppercase tracking-tighter">Bước 3: Nội Dung Email</h2>
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
              <div className="flex flex-wrap justify-between items-center gap-2 ml-4">
                <label className="text-[10px] font-black uppercase text-gray-400">Nội dung Email (Hỗ trợ HTML)</label>
                <div className="flex flex-wrap gap-1 bg-gray-50 p-1 rounded-xl border border-gray-100">
                  <button onClick={() => insertText("<b>Văn bản đậm</b>")} className="text-[8px] bg-white border px-2 py-1 rounded font-black uppercase hover:bg-black hover:text-white transition-all"><b>B</b></button>
                  <button onClick={() => insertText("<i>Văn bản nghiêng</i>")} className="text-[8px] bg-white border px-2 py-1 rounded font-black uppercase hover:bg-black hover:text-white transition-all"><i>I</i></button>
                  <button onClick={() => insertText("<h2>Tiêu đề</h2>")} className="text-[8px] bg-white border px-2 py-1 rounded font-black uppercase hover:bg-black hover:text-white transition-all">H2</button>
                  <button onClick={() => insertText('<a href="LINK_CỦA_BẠN" style="display:inline-block; padding:10px 20px; background:#000; color:#fff; text-decoration:none; border-radius:10px; font-weight:bold;">NÚT BẤM</a>')} className="text-[8px] bg-white border px-2 py-1 rounded font-black uppercase hover:bg-black hover:text-white transition-all">Nút</button>
                  
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleImageUpload} 
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()} 
                    disabled={uploading}
                    className="text-[8px] bg-white border px-2 py-1 rounded font-black uppercase hover:bg-black hover:text-white transition-all disabled:opacity-50"
                  >
                    {uploading ? "..." : "Ảnh"}
                  </button>

                  <div className="w-px h-4 bg-gray-200 mx-1" />
                  <button onClick={() => insertText("{Chào|Xin chào|Hi}")} className="text-[8px] bg-white border px-2 py-1 rounded font-black uppercase hover:bg-yellow-400">Spin</button>
                  <button onClick={() => insertText("[Tên]")} className="text-[8px] bg-white border px-2 py-1 rounded font-black uppercase hover:bg-yellow-400">[Tên]</button>
                  <button onClick={() => insertText("[MãHV]")} className="text-[8px] bg-white border px-2 py-1 rounded font-black uppercase hover:bg-yellow-400">[ID]</button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Textarea 
                  ref={textareaRef}
                  placeholder="Nhập nội dung email tại đây... Dùng các nút công cụ phía trên để định dạng."
                  className="rounded-3xl min-h-[400px] font-bold border-2 focus:border-black font-mono text-sm p-6 shadow-inner"
                  value={formData.htmlContent}
                  onChange={(e) => setFormData({...formData, htmlContent: e.target.value})}
                />
                <div className="rounded-3xl border-2 border-dashed border-gray-200 min-h-[400px] p-4 bg-gray-50/50 overflow-y-auto">
                  <p className="text-[8px] font-black uppercase text-gray-300 mb-4 text-center">--- Xem trước Email thực tế ---</p>
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mx-auto max-w-full scale-90 origin-top">
                    <div className="bg-black p-3 text-center">
                      <div className="text-[10px] font-black text-yellow-400 uppercase tracking-widest">Học Viện BRK</div>
                    </div>
                    <div className="p-6 text-sm text-gray-800" dangerouslySetInnerHTML={{ __html: compileHtml(formData.htmlContent).replace(/\n/g, '<br/>') || '<i>Nội dung hiển thị tại đây...</i>' }} />
                    <div className="p-4 bg-gray-50 border-t text-center text-[8px] text-gray-400 uppercase">
                      Học Viện BRK | <span className="underline">Hủy đăng ký</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <h2 className="text-xl font-black uppercase tracking-tighter">Bước 4: Review & Lưu</h2>
            <div className="bg-gray-50 p-6 rounded-3xl space-y-4">
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="text-[10px] font-black uppercase text-gray-400">Tên:</span>
                <span className="text-sm font-black">{formData.title}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="text-[10px] font-black uppercase text-gray-400">Số lượng:</span>
                <span className="text-sm font-black text-blue-600">{JSON.parse(formData.recipientCsvData || "[]").length} người nhận</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="text-[10px] font-black uppercase text-gray-400">Tiêu đề:</span>
                <span className="text-sm font-black italic">{formData.subject}</span>
              </div>
            </div>
            <div className="p-6 border-2 border-dashed border-gray-100 rounded-3xl overflow-hidden">
              <p className="text-[10px] font-black uppercase text-gray-300 mb-2">Preview thô:</p>
              <div className="text-xs text-gray-500 overflow-auto max-h-[200px] whitespace-pre-wrap font-mono">{formData.htmlContent}</div>
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
          
          {step !== 2 && (
            step < 4 ? (
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
            )
          )}
        </div>
      </div>
    </div>
  );
}
