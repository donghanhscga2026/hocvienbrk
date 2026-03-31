import Link from "next/link"
import { ArrowLeft, Palette, Globe } from "lucide-react"

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
        <div className="space-y-4 mt-4">
          <Link
            href="/admin/settings/theme"
            className="block bg-white rounded-2xl border border-gray-100 p-6 hover:border-amber-300 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <Palette className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Giao diện</h2>
                <p className="text-sm text-gray-500">Tùy chỉnh theme, màu sắc, phông chữ</p>
              </div>
            </div>
          </Link>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 opacity-60">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                <Globe className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Ngôn ngữ</h2>
                <p className="text-sm text-gray-500">Sắp ra mắt...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
