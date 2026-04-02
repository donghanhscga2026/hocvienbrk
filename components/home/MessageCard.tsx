'use client'

import React, { useState } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { Lightbulb } from 'lucide-react'

// Tối ưu 1: Dynamic Import cho Dialog giúp giảm dung lượng file bundle ban đầu (Initial JS)
// Modal chỉ được tải khi người dùng thực sự click vào card.
const Dialog = dynamic(() => import("@/components/ui/dialog").then(mod => mod.Dialog), { ssr: false })
const DialogContent = dynamic(() => import("@/components/ui/dialog").then(mod => mod.DialogContent), { ssr: false })
const DialogHeader = dynamic(() => import("@/components/ui/dialog").then(mod => mod.DialogHeader), { ssr: false })
const DialogTitle = dynamic(() => import("@/components/ui/dialog").then(mod => mod.DialogTitle), { ssr: false })

interface Message {
    id: number
    content: string
    detail: string
    imageUrl: string | null
}

interface MessageCardProps {
    message: Message | null
    session: any
    userName: string
    userId: string
}

const DEFAULT_MESSAGE: Message = {
    id: 0,
    content: "Tri thức là sức mạnh - Học hôm nay, thành công ngày mai",
    detail: "Học viện BRK mang đến những tri thức thực chiến giúp bạn phát triển bản thân và sự nghiệp. Mỗi ngày học tập là một bước tiến trên con đường thành công.",
    imageUrl: null
}

export default function MessageCard({ message, session, userName, userId }: MessageCardProps) {
    const [isOpen, setIsOpen] = useState(false)
    const displayMessage = message || DEFAULT_MESSAGE

    return (
        <>
            {/* Tỉ lệ 5:3 chuẩn xác bằng Aspect Ratio - Giúp trình duyệt tính toán Layout cực nhanh */}
            <div className="relative w-full aspect-[5/3] sm:overflow-hidden rounded-2xl md:rounded-none shadow-2xl border border-white/5 group cursor-pointer"
                onClick={() => setIsOpen(true)}>

                {/* ── Ảnh nền tối ưu ── */}
                <div className="absolute inset-0">
                    {displayMessage.imageUrl ? (
                        <Image
                            src={displayMessage.imageUrl}
                            alt="Học viện BRK Background"
                            fill
                            priority // Tải trước ảnh này vì nó là thành phần quan trọng nhất trang (LCP)
                            quality={70} // Tối ưu: 70% là điểm ngọt giữa độ nét và dung lượng
                            className="object-cover object-center transition-transform duration-1000 group-hover:scale-105"
                            sizes="(max-width: 768px) 100vw, 1200px"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-black via-zinc-900 to-indigo-950" />
                    )}
                    {/* Lớp phủ tối nhẹ để nổi bật chữ */}
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px] transition-colors duration-500 group-hover:bg-black/33" />
                </div>

                {/* ── TOÀN BỘ NỘI DUNG: Flex layout ── */}

                <div className="absolute inset-0 z-10 flex flex-col px-[5%] pt-[30px] md:pt-[70px] pb-[4%] text-center">
                    {/* ── TOP: Tiêu đề & Lời chào ── */}
                    <div className="flex flex-col items-center shrink-0">
                        <h1 className="flex flex-col items-center font-black tracking-tighter leading-[1.2]">
                            <span
                                className="uppercase drop-shadow-xl"
                                style={{ fontSize: 'clamp(0.2rem, 5vw, 3rem)', color: '#ffffff' }}
                            >
                                HỌC VIỆN BRK
                            </span>

                            <span
                                className="uppercase drop-shadow-xl"
                                style={{ fontSize: 'clamp(0.5rem, 5vw, 3rem)', color: '#fbbf24', textShadow: '0 0 15px #fbbf2480, 0 0 30px #fbbf2450' }}
                            >
                                NGÂN HÀNG PHƯỚC BÁU
                            </span>

                            <span
                                className="rounded-full bg-white/10 border border-white/20 backdrop-blur-md"
                                style={{
                                    padding: 'clamp(3px,0.8%,8px) clamp(8px,4%,20px)',
                                    marginTop: 'clamp(10px, 2%, 16px)'
                                }}
                            >
                                <span
                                    className="block font-semibold whitespace-nowrap"
                                    style={{ fontSize: 'clamp(0.7rem, 1.8vw, 1.2rem)', color: '#ffffff' }}
                                >
                                    {session?.user
                                        ? `Mến chào ${userName || 'Học viên'} - Mã học tập ${userId}`
                                        : 'Mến chào bạn hữu đường xa!'}
                                </span>
                            </span>
                        </h1>
                    </div>

                    {/* ── BOTTOM: Thông điệp (Chiếm trọn không gian dưới dòng Mến chào) ── */}
                    <div className="flex-1 flex flex-col items-center justify-center min-h-0 w-full"
                        style={{
                            gap: 'clamp(4px, 1.2%, 12px)',
                            paddingTop: '3%',
                            paddingBottom: '1%'
                        }}>

                        {/* Container nội dung thông điệp - Tự động điều chỉnh theo nội dung */}
                        <div className="flex items-center justify-center gap-[8px] max-w-[95%] md:max-w-[85%] w-full">
                            <p
                                className="font-medium italic leading-tight drop-shadow-lg whitespace-pre-line overflow-visible"
                                style={{
                                    /* Font size đơn giản: tự động điều chỉnh theo độ dài nội dung */
                                    fontSize: `clamp(0.7rem, 2.5vw, 2rem)`,
                                    color: '#fbbf24'
                                }}
                            >
                                &ldquo;{displayMessage.content}&rdquo;
                            </p>

                            {/* Icon bóng đèn - Thu nhỏ scale khi chữ nhỏ đi để giữ sự cân đối */}
                            <div
                                className="shrink-0 rounded-full flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity shadow-lg"
                                style={{
                                    width: 'clamp(1.4rem, 3.2vw, 2.6rem)',
                                    height: 'clamp(1.4rem, 3.2vw, 2.6rem)',
                                    backgroundColor: '#fbbf24'
                                }}
                            >
                                <Lightbulb
                                    className="animate-pulse"
                                    style={{ width: '55%', height: '55%', color: '#000' }}
                                />
                            </div>
                        </div>

                        {/* Gợi ý tương tác - Đẩy sát xuống dưới cùng của thông điệp */}
                        <p
                            className="text-white/40 uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-1 group-hover:translate-y-0"
                            style={{ fontSize: 'clamp(0.4rem, 0.75vw, 0.65rem)' }}
                        >
                            Nhấn để xem chi tiết →
                        </p>
                    </div>
                </div>
            </div>
            {/* ── Kết thúc card ảnh nền ── */}

            {/* ── Modal chi tiết (Lazy Loaded) ── */}
            {isOpen && (
                <Dialog open={isOpen}>
                    <DialogContent className="sm:max-w-lg bg-zinc-950 border-zinc-800 text-white overflow-hidden p-0 shadow-2xl">
                        <div className="relative w-full h-64">
                            {displayMessage.imageUrl ? (
                                <Image
                                    src={displayMessage.imageUrl}
                                    alt="Detail Background"
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 768px) 100vw, 500px"
                                />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-purple-900 to-indigo-950" />
                            )}
                            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center">
                                <div className="w-12 h-12 rounded-full bg-yellow-400 flex items-center justify-center mb-4 shadow-xl scale-110">
                                    <Lightbulb className="w-6 h-6 text-black" />
                                </div>
                                <p className="text-yellow-400 text-xl font-bold italic leading-tight whitespace-pre-line drop-shadow-md">
                                    &ldquo;{displayMessage.content}&rdquo;
                                </p>
                            </div>
                        </div>

                        <div className="p-6 space-y-4 bg-zinc-950">
                            <div className="text-zinc-300 text-sm leading-relaxed whitespace-pre-line bg-white/5 p-5 rounded-2xl border border-white/5 shadow-inner">
                                {displayMessage.detail}
                            </div>
                            <p className="text-zinc-600 text-[11px] text-center pt-2 italic tracking-widest">
                                💡 HỌC VIỆN BRK - NGÂN HÀNG PHƯỚC BÁU
                            </p>
                        </div>

                        {/* Nút đóng */}
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsOpen(false) }}
                            className="absolute top-4 right-4 text-white/70 hover:text-white transition-all bg-black/20 hover:bg-black/40 rounded-full p-2 z-20"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </DialogContent>
                </Dialog>
            )}
        </>
    )
}