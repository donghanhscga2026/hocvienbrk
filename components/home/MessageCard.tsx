'use client'

import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { Lightbulb } from 'lucide-react'

const Dialog = dynamic(() => import("@/components/ui/dialog").then(mod => mod.Dialog), { ssr: false })
const DialogContent = dynamic(() => import("@/components/ui/dialog").then(mod => mod.DialogContent), { ssr: false })

interface MessageCardProps {
    profile: {
        heroImage?: string | null
        heroOverlay?: number | null
        title?: string | null
        subtitle?: string | null
        messageContent?: string | null
        messageDetail?: string | null
        messageImage?: string | null
        accentColor?: string | null
        user?: { name?: string | null } | null
    }
    session: any
    userName: string
    userId: string
    isDefault?: boolean
    messageImageUrl?: string | null
    messageContent?: string | null
}

export default function MessageCard({
    profile,
    session,
    userName,
    userId,
    isDefault = false,
    messageImageUrl = null,
    messageContent: messageContentProp = null
}: MessageCardProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [greetingMessage, setGreetingMessage] = useState('') // Sửa lỗi hydration - chỉ tính greeting ở client
    const [greetingPrefix, setGreetingPrefix] = useState('') // Sửa lỗi hydration - chỉ tính prefix ở client
    
    const heroImage = profile.heroImage || messageImageUrl || profile.messageImage || null
    const heroOverlay = profile.heroOverlay ?? 0.3
    const accentColor = profile.accentColor || '#f59e0b'
    
    // Xác định tiêu đề hiển thị theo yêu cầu mới
    // Dòng 1 = title field, Dòng 2 = subtitle field, Dòng 3 = greeting động
    const displayLine1 = isDefault ? 'BRK' : (profile.title || 'BRK')
    const displayLine2 = isDefault ? 'NGÂN HÀNG PHƯỚC BÁU' : (profile.subtitle || '')
    const subtitle = profile.subtitle || 'Mến chào bạn hữu đường xa!' // Giữ để dùng cho fallback
    const messageContent = messageContentProp ?? profile.messageContent ?? 'Học hôm nay, thành công ngày mai'
    const messageDetail = profile.messageDetail || 'Tri thức thực chiến giúp bạn phát triển bản thân và sự nghiệp.'
    
    // Lấy greeting theo thời gian
    const getGreeting = () => {
      const hour = new Date().getHours()
      const defaultGreetings = {
        morning: 'Chúc ngày mới an vui, giàu toàn diện',
        afternoon: 'Chúc buổi chiều năng lượng, thuận lợi',
        evening: 'Chúc buổi tối hạnh phúc, bình yên'
      }
      const savedGreetings = (profile as any).greetingMessages || defaultGreetings
      
      if (hour >= 5 && hour < 12) {
        return savedGreetings.morning || defaultGreetings.morning
      } else if (hour >= 12 && hour < 18) {
        return savedGreetings.afternoon || defaultGreetings.afternoon
      } else {
        return savedGreetings.evening || defaultGreetings.evening
      }
    }
    
    // Tách greeting thành 2 phần: prefix (lời chào) + message (lời chúc)
    // Chú ý: userId có thể = 0, nên dùng String(userId) !== '' để check
    const userIdStr = String(userId)

    // Sửa lỗi hydration: Chỉ tính toán greeting ở client side sau khi mount
    useEffect(() => {
        // Tính toán greeting message
        setGreetingMessage(getGreeting())
        // Tính toán greeting prefix
        const prefix = session?.user && userIdStr !== ''
            ? `Mến chào ${userName || 'Học viên'} [${userIdStr}]`
            : ''
        setGreetingPrefix(prefix)
    }, [session?.user, userName, userId, userIdStr])

    return (
        <>
            <div className="relative w-full aspect-video overflow-hidden group cursor-pointer"
                onClick={() => setIsOpen(true)}>

                <div className="absolute inset-0">
                    {heroImage ? (
                        <Image
                            src={heroImage}
                            alt={`${displayLine1} Background`}
                            fill
                            priority
                            quality={70}
                            className="object-cover object-center transition-transform duration-1000 group-hover:scale-105"
                            sizes="100vw"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-brk-background via-brk-surface to-brk-primary/50" />
                    )}
                    <div 
                        className="absolute inset-0 bg-brk-surface/30 backdrop-blur-[1px] transition-colors duration-500 group-hover:bg-brk-surface/33"
                        style={{ opacity: 1 - heroOverlay }}
                    />
                </div>

                <div className="absolute inset-0 z-10 flex flex-col justify-end px-[5%] pb-[6%] text-center">
                    <div className="flex flex-col items-center shrink-0">
                        <h1 className="flex flex-col items-center font-black tracking-tighter leading-[1.2]">
                            {/* Dòng 1: title field — tạm ẩn */}
                            {false && (
                                <span
                                    className="uppercase drop-shadow-xl"
                                    style={{ 
                                        fontSize: 'clamp(0.2rem, 5vw, 3rem)', 
                                        color: '#ffffff',
                                        textShadow: '0 0 10px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.6), 2px 2px 4px rgba(0,0,0,0.8)',
                                        WebkitTextStroke: '0.5px rgba(0,0,0,0.5)'
                                    }}
                                >
                                    {displayLine1}
                                </span>
                            )}

                            {/* Dòng 2: subtitle field — tạm ẩn */}
                            {false && (
                                <span
                                    className="uppercase drop-shadow-xl"
                                    style={{ 
                                        fontSize: 'clamp(0.5rem, 5vw, 3rem)', 
                                        color: accentColor, 
                                        textShadow: `0 0 15px ${accentColor}80, 0 0 30px ${accentColor}50, 0 0 45px ${accentColor}30, 0 0 60px ${accentColor}20, 2px 2px 4px rgba(0,0,0,0.7)`,
                                        WebkitTextStroke: '0.5px rgba(0,0,0,0.4)'
                                    }}
                                >
                                    {displayLine2}
                                </span>
                            )}

                            {/* Dòng 3: greeting động - Tách thành 2 dòng */}
                            <span
                                className="rounded-full backdrop-blur-md"
                                style={{
                                    padding: 'clamp(2px,0.5%,6px) clamp(6px,3%,16px)',
                                    marginTop: 'clamp(4px, 1%, 12px)',
                                    backgroundColor: 'rgba(255,255,255,0.1)',
                                    border: '1px solid rgba(255,255,255,0.2)'
                                }}
                            >
                                {/* Dòng trên: Lời chào */}
                                <span
                                    className="block font-semibold whitespace-nowrap"
                                    style={{ 
                                        fontSize: 'clamp(0.55rem, 1.5vw, 1.1rem)', 
                                        color: '#ffffff',
                                        textShadow: '0 0 8px rgba(0,0,0,0.8), 1px 1px 2px rgba(0,0,0,0.8)'
                                    }}
                                >
                                    {greetingPrefix}
                                </span>
                                {/* Dòng dưới: Lời chúc - cùng màu và cỡ với dòng trên */}
                                <span
                                    className="block font-semibold whitespace-nowrap"
                                    style={{ 
                                        fontSize: 'clamp(0.55rem, 1.5vw, 1.1rem)', 
                                        color: '#ffffff',
                                        textShadow: '0 0 8px rgba(0,0,0,0.8), 1px 1px 2px rgba(0,0,0,0.8)',
                                        marginTop: '2px'
                                    }}
                                >
                                    {greetingMessage}
                                </span>
                            </span>
                        </h1>
                    </div>

                    <div className="flex flex-col items-center justify-center shrink-0 w-full"
                        style={{
                                    gap: 'clamp(2px, 0.8%, 10px)',
                                    paddingTop: '1.5%',
                            paddingBottom: '1%'
                        }}>
                        <div className="flex items-center justify-center gap-[8px] max-w-[95%] md:max-w-[85%] w-full">
                            <p
                                className="font-medium italic leading-tight drop-shadow-lg whitespace-pre-line overflow-visible"
                                style={{
                                        fontSize: `clamp(0.55rem, 2vw, 1.8rem)`,
                                    color: accentColor
                                }}
                            >
                                &ldquo;{messageContent}&rdquo;
                            </p>

                            <div
                                className="shrink-0 rounded-full flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity shadow-lg"
                                style={{
                                    width: 'clamp(1rem, 2.5vw, 2.2rem)',
                                    height: 'clamp(1rem, 2.5vw, 2.2rem)',
                                    backgroundColor: accentColor
                                }}
                            >
                                <Lightbulb
                                    className="animate-pulse"
                                    style={{ width: '55%', height: '55%', color: '#000' }}
                                />
                            </div>
                        </div>

                        <p
                            className="hidden md:block uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-1 group-hover:translate-y-0"
                            style={{ fontSize: 'clamp(0.4rem, 0.75vw, 0.65rem)', color: 'rgba(255,255,255,0.4)' }}
                        >
                            Nhấn để xem chi tiết →
                        </p>
                    </div>
                </div>
            </div>

            {isOpen && (
                <Dialog open={isOpen}>
                    <DialogContent className="sm:max-w-lg bg-brk-surface border-brk-outline text-brk-on-surface overflow-hidden p-0 shadow-xl">
                        <div className="relative w-full h-64">
                            {heroImage ? (
                                <Image
                                    src={heroImage}
                                    alt="Detail Background"
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 768px) 100vw, 500px"
                                />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-brk-primary to-brk-primary" />
                            )}
                            <div className="absolute inset-0 bg-brk-surface/40 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center">
                                <div 
                                    className="w-12 h-12 rounded-full flex items-center justify-center mb-4 shadow-xl scale-110"
                                    style={{ backgroundColor: accentColor }}
                                >
                                    <Lightbulb className="w-6 h-6 text-black" />
                                </div>
                                <p 
                                    className="text-xl font-bold italic leading-tight whitespace-pre-line drop-shadow-md"
                                    style={{ color: accentColor }}
                                >
                                    &ldquo;{messageContent}&rdquo;
                                </p>
                            </div>
                        </div>

                        <div className="p-6 space-y-4 bg-brk-surface">
                            <div className="text-brk-muted text-sm leading-relaxed whitespace-pre-line p-5 rounded-2xl shadow-inner"
                                style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                {messageDetail}
                            </div>
                            <p className="text-brk-muted text-[11px] text-center pt-2 italic tracking-widest">
                                💡 {isDefault ? 'HỌC VIỆN BRK - NGÂN HÀNG PHƯỚC BÁU' : displayLine1?.toUpperCase()}
                            </p>
                        </div>

                        <button
                            onClick={(e) => { e.stopPropagation(); setIsOpen(false) }}
                            className="absolute top-4 right-4 transition-all rounded-full p-2 z-20"
                            style={{ color: 'rgba(255,255,255,0.7)', backgroundColor: 'rgba(0,0,0,0.2)' }}
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
