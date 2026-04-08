'use client'

import Link from "next/link"
import { Palette, Globe, Settings } from "lucide-react"
import ToolHeader from "@/components/tools/ToolHeader"

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <ToolHeader title="CÀI ĐẶT" />

      <div className="p-4 max-w-lg mx-auto">
        <div className="space-y-4 mt-4">
          <Link
            href="/tools/settings/theme"
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