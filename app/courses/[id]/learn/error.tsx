'use client'

import { useEffect } from 'react'
import { AlertCircle, RefreshCcw, Home } from 'lucide-react'
import Link from 'next/link'

export default function CourseLearnError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log lỗi ra console để bạn xem được trong F12 trình duyệt (nếu là client error)
    // Hoặc gửi về hệ thống giám sát lỗi
    console.error('Course Learn Page Error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 text-center">
      <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
        <AlertCircle className="w-10 h-10 text-red-500" />
      </div>
      
      <h2 className="text-xl font-bold text-white mb-2">Đã xảy ra lỗi hệ thống</h2>
      <p className="text-zinc-400 text-sm max-w-md mb-8">
        Hệ thống không thể tải nội dung bài học. Điều này có thể do phiên đăng nhập hết hạn hoặc dữ liệu khóa học gặp sự cố.
      </p>

      {error.digest && (
        <div className="mb-8 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg">
          <p className="text-[10px] text-zinc-500 font-mono">Mã lỗi (Digest): {error.digest}</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => reset()}
          className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-2.5 rounded-xl transition-all"
        >
          <RefreshCcw className="w-4 h-4" /> Thử lại ngay
        </button>
        
        <Link
          href="/"
          className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold px-6 py-2.5 rounded-xl transition-all"
        >
          <Home className="w-4 h-4" /> Quay về trang chủ
        </Link>
      </div>
      
      <p className="mt-12 text-xs text-zinc-600 italic">
        Nếu lỗi vẫn tiếp tục, vui lòng liên hệ Ban quản trị để được hỗ trợ.
      </p>
    </div>
  )
}
