"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle, XCircle, RefreshCw, Loader2 } from "lucide-react";
import MainHeader from "@/components/layout/MainHeader";

interface SenderValidation {
  id: number;
  email: string;
  label: string;
  isValid: boolean;
  error?: string;
}

export default function EmailSendersPage() {
  const [senders, setSenders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [validationResults, setValidationResults] = useState<Record<number, SenderValidation>>({});
  const [validationSummary, setValidationSummary] = useState<{total: number; valid: number; invalid: number} | null>(null);

  const fetchSenders = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/senders/list");
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

  const validateAllTokens = async () => {
    setValidating(true);
    try {
      const res = await fetch("/api/admin/senders/validate");
      if (res.ok) {
        const data = await res.json();
        const resultsMap: Record<number, SenderValidation> = {};
        data.results.forEach((r: SenderValidation) => {
          resultsMap[r.id] = r;
        });
        setValidationResults(resultsMap);
        setValidationSummary(data.summary);
      } else {
        alert("Lỗi khi kiểm tra token");
      }
    } catch (error) {
      console.error(error);
      alert("Lỗi kết nối");
    } finally {
      setValidating(false);
    }
  };

  const removeSender = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn gỡ bỏ tài khoản này?")) return;
    
    try {
      const res = await fetch(`/api/admin/senders/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setValidationResults(prev => {
          const newResults = {...prev};
          delete newResults[id];
          return newResults;
        });
        fetchSenders();
      }
      else alert("Lỗi khi gỡ bỏ tài khoản");
    } catch (error) {
      console.error(error);
    }
  };

  const getSenderStatus = (senderId: number) => {
    const result = validationResults[senderId];
    if (!result) return null;
    return result;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <MainHeader title="TÀI KHOẢN EMAIL" toolSlug="email-senders" />

      {/* Sub Navigation */}
      <div className="flex gap-1 px-4 py-2 bg-white border-b overflow-x-auto">
        <Link href="/tools/email-mkt" className="px-3 py-1.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600 hover:bg-gray-200">
          📋 Chiến dịch
        </Link>
        <Link href="/tools/email-senders" className="px-3 py-1.5 rounded-full text-xs font-bold bg-orange-500 text-white">
          📡 Tài Khoản
        </Link>
        <Link href="/tools/email-settings" className="px-3 py-1.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600 hover:bg-gray-200">
          ⚙️ Cấu Hình
        </Link>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto p-4 space-y-3">
        {/* Validate Button */}
        <Button 
          onClick={validateAllTokens}
          disabled={validating || senders.length === 0}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
        >
          {validating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Đang kiểm tra...
            </>
          ) : (
            <>
              <RefreshCw className="w-5 h-5" />
              Kiểm tra Token
            </>
          )}
        </Button>

        {/* Validation Summary */}
        {validationSummary && (
          <div className={`p-4 rounded-xl border ${
            validationSummary.invalid === 0 
              ? 'bg-green-50 border-green-200' 
              : 'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className={`font-bold ${
                validationSummary.invalid === 0 ? 'text-green-700' : 'text-yellow-700'
              }`}>
                Kết quả kiểm tra
              </h3>
              <span className={`text-2xl font-black ${
                validationSummary.invalid === 0 ? 'text-green-600' : 'text-yellow-600'
              }`}>
                {validationSummary.valid}/{validationSummary.total}
              </span>
            </div>
            <div className="flex gap-4 text-sm">
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle className="w-4 h-4" /> {validationSummary.valid} hợp lệ
              </span>
              {validationSummary.invalid > 0 && (
                <span className="flex items-center gap-1 text-red-600">
                  <XCircle className="w-4 h-4" /> {validationSummary.invalid} cần xác thực lại
                </span>
              )}
            </div>
            {validationSummary.invalid > 0 && (
              <p className="mt-2 text-xs text-yellow-700">
                ⚠️ Token hết hạn. Gỡ bỏ và kết nối lại tài khoản để tiếp tục.
              </p>
            )}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-400 font-medium">Đang tải...</div>
        ) : senders.length === 0 ? (
          <div className="text-center py-12 text-gray-400 font-medium">
            Chưa có tài khoản nào.
          </div>
        ) : (
          senders.map((sender) => {
            const status = getSenderStatus(sender.id);
            return (
              <div key={sender.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-900">{sender.label}</h3>
                      {status && (
                        status.isValid ? (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="w-4 h-4" />
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-600" title={status.error}>
                            <XCircle className="w-4 h-4" />
                          </span>
                        )
                      )}
                    </div>
                    <p className="text-sm text-gray-400">{sender.email}</p>
                    {sender.isMain && (
                      <span className="inline-block mt-1 bg-black text-yellow-400 text-xs font-bold px-2 py-0.5 rounded">Main</span>
                    )}
                    {status && !status.isValid && (
                      <p className="text-xs text-red-500 mt-1">{status.error}</p>
                    )}
                  </div>
                  <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                    sender.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}>
                    {sender.isActive ? "Active" : "Tạm ngưng"}
                  </span>
                </div>
              
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Quota hôm nay</span>
                  <span>{sender.sentToday}/{sender.dailyLimit}</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-orange-500" 
                    style={{ width: `${(sender.sentToday / sender.dailyLimit) * 100}%` }}
                  />
                </div>
              </div>

              <Button 
                onClick={() => removeSender(sender.id)}
                className="w-full bg-red-50 text-red-600 font-bold text-sm py-2 rounded-lg"
              >
                Gỡ bỏ
              </Button>
              </div>
            );
          })
        )}

        <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl">
          <h3 className="text-blue-900 font-bold text-sm mb-2">💡 Hướng dẫn</h3>
          <ul className="text-blue-700/80 text-xs space-y-1 list-disc list-inside">
            <li>Thêm email vào "Test Users" trong Google Cloud</li>
            <li>Tối đa 480 email/ngày</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
