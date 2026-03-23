import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-black text-white shadow-lg sticky top-0 z-50">
        <div className="flex items-center justify-between p-4 max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-white/10 hover:bg-white/20">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-xs font-medium">Quay ra</span>
            </Link>
            <h1 className="text-lg font-bold text-yellow-400">Cài Đặt</h1>
          </div>
        </div>
      </header>

      <div className="p-4 max-w-lg mx-auto">
        <div className="space-y-6 mt-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-lg font-bold mb-4">Cài Đặt Chung</h2>
            <p className="text-gray-500">Trang cài đặt đang được phát triển...</p>
          </div>
        </div>
      </div>
    </div>
  )
}
