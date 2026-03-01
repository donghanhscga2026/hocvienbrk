
'use client'

import { useState } from 'react'
import { Lightbulb } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface Message {
    id: number
    content: string
    detail: string
    imageUrl: string | null
}

interface MessageCardProps {
    message: Message | null
}

const DEFAULT_MESSAGE: Message = {
    id: 0,
    content: "Tri thức là sức mạnh - Học hôm nay, thành công ngày mai",
    detail: "Học viện BRK mang đến những tri thức thực chiến giúp bạn phát triển bản thân và sự nghiệp. Mỗi ngày học tập là một bước tiến trên con đường thành công.",
    imageUrl: null
}

export default function MessageCard({ message }: MessageCardProps) {
    const [isOpen, setIsOpen] = useState(false)

    const displayMessage = message || DEFAULT_MESSAGE

    return (
        <>
            <div
                className="relative w-full max-w-2xl mx-auto mt-6 cursor-pointer group"
                onClick={() => setIsOpen(true)}
            >
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 shadow-xl transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-2xl">

                    {/* Ảnh nền nếu có — dùng CSS background để tránh domain whitelist */}
                    {displayMessage.imageUrl && (
                        <div
                            className="absolute inset-0 bg-cover bg-center"
                            style={{ backgroundImage: `url('${displayMessage.imageUrl}')` }}
                        >
                            {/* Lớp tối nhẹ để text đọc được, không phủ màu tím */}
                            <div className="absolute inset-0 bg-black/40" />
                        </div>
                    )}

                    {/* Nội dung */}
                    <div className="relative p-6 sm:p-8 flex items-center gap-4 sm:gap-6">
                        {/* Icon */}
                        <div className="shrink-0 w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-yellow-400 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <Lightbulb className="w-6 h-6 sm:w-8 sm:h-8 text-black" />
                        </div>

                        {/* Text */}
                        <div className="flex-1">
                            <p className="text-white text-lg sm:text-xl font-bold leading-tight">
                                &ldquo;{displayMessage.content}&rdquo;
                            </p>
                            <p className="text-purple-200 text-xs sm:text-sm mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                Nhấn để xem chi tiết →
                            </p>
                        </div>
                    </div>

                    {/* Border gradient */}
                    <div className="absolute inset-0 rounded-2xl ring-1 ring-white/20 pointer-events-none" />
                </div>
            </div>

            {/* Modal chi tiết */}
            <Dialog open={isOpen}>
                <DialogContent className="sm:max-w-lg bg-zinc-900 border-zinc-800 text-white">
                    <DialogHeader>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center">
                                <Lightbulb className="w-5 h-5 text-black" />
                            </div>
                            <DialogTitle className="text-xl font-bold">Thông điệp tri thức</DialogTitle>
                        </div>
                    </DialogHeader>

                    <div className="mt-4 space-y-4">
                        {/* Ảnh nếu có — dùng img thường */}
                        {displayMessage.imageUrl && (
                            <div className="w-full h-40 rounded-xl overflow-hidden">
                                <img
                                    src={displayMessage.imageUrl}
                                    alt="Ảnh thông điệp"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        )}

                        {/* Nội dung chính */}
                        <div className="bg-purple-900/30 rounded-xl p-4 border border-purple-500/30">
                            <p className="text-white text-lg font-medium leading-relaxed">
                                &ldquo;{displayMessage.content}&rdquo;
                            </p>
                        </div>

                        {/* Chi tiết */}
                        <div className="text-zinc-300 text-sm leading-relaxed whitespace-pre-line">
                            {displayMessage.detail}
                        </div>

                        <p className="text-zinc-500 text-xs text-center pt-2">
                            💡 Mỗi lần refresh trang sẽ có thông điệp mới
                        </p>
                    </div>

                    {/* Nút đóng */}
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsOpen(false) }}
                        className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </DialogContent>
            </Dialog>
        </>
    )
}
