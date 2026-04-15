'use client'

import React, { useState } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { Lightbulb } from 'lucide-react'

const Dialog = dynamic(() => import("@/components/ui/dialog").then(mod => mod.Dialog), { ssr: false })
const DialogContent = dynamic(() => import("@/components/ui/dialog").then(mod => mod.DialogContent), { ssr: false })

interface HeroSectionProps {
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
}

export default function HeroSection({
    profile,
    session,
    userName,
    userId,
    isDefault = false,
    messageImageUrl = null
}: HeroSectionProps) {
    const [isOpen, setIsOpen] = useState(false)
    
    const heroImage = profile.heroImage || profile.messageImage || messageImageUrl || null
    const heroOverlay = profile.heroOverlay ?? 0.3
    const accentColor = profile.accentColor || '#f59e0b'
    
    // Xác định tiêu đề hiển thị
    // Default (BRK): Hiển thị "BRK" + "NGÂN HÀNG PHƯỚC BÁU"
    // Teacher: Hiển thị tên teacher từ profile.user.name hoặc profile.title
    const teacherName = profile.user?.name || profile.title || ''
    const displayTitle = isDefault ? null : teacherName
    
    const subtitle = profile.subtitle || 'Mến chào bạn hữu đường xa!'
    const messageContent = profile.messageContent || 'Học hôm nay, thành công ngày mai'
    const messageDetail = profile.messageDetail || 'Tri thức thực chiến giúp bạn phát triển bản thân và sự nghiệp.'

    return (
        <>
            <div className="relative w-full aspect-video overflow-hidden group cursor-pointer"
                onClick={() => setIsOpen(true)}>

                <div className="absolute inset-0">
                    {heroImage ? (
                        <Image
                            src={heroImage}
                            alt={`${displayTitle || 'BRK'} Background`}
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

                <div className="absolute inset-0 z-10 flex flex-col px-[5%] pt-[30px] md:pt-[70px] pb-[4%] text-center">
                    <div className="flex flex-col items-center shrink-0">
                        <h1 className="flex flex-col items-center font-black tracking-tighter leading-[1.2]">
                            <span
                                className="uppercase drop-shadow-xl"
                                style={{ fontSize: 'clamp(0.2rem, 5vw, 3rem)', color: '#ffffff' }}
                            >
                            {isDefault ? 'BRK' : displayTitle}
                        </span>

                            <span
                                className="uppercase drop-shadow-xl"
                                style={{ 
                                    fontSize: 'clamp(0.5rem, 5vw, 3rem)', 
                                    color: accentColor, 
                                    textShadow: `0 0 15px ${accentColor}50, 0 0 30px ${accentColor}30` 
                                }}
                            >
                                {isDefault ? 'NGÂN HÀNG PHƯỚC BÁU' : ''}
                            </span>

                            <span
                                className="rounded-full backdrop-blur-md"
                                style={{
                                    padding: 'clamp(3px,0.8%,8px) clamp(8px,4%,20px)',
                                    marginTop: 'clamp(10px, 2%, 16px)',
                                    backgroundColor: 'rgba(255,255,255,0.1)',
                                    border: '1px solid rgba(255,255,255,0.2)'
                                }}
                            >
                                <span
                                    className="block font-semibold whitespace-nowrap"
                                    style={{ fontSize: 'clamp(0.7rem, 1.8vw, 1.2rem)', color: '#ffffff' }}
                                >
                                    {session?.user
                                        ? `Mến chào ${userName || 'Học viên'} - Mã học tập ${userId}`
                                        : subtitle}
                                </span>
                            </span>
                        </h1>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center min-h-0 w-full"
                        style={{
                            gap: 'clamp(4px, 1.2%, 12px)',
                            paddingTop: '3%',
                            paddingBottom: '1%'
                        }}>
                        <div className="flex items-center justify-center gap-[8px] max-w-[95%] md:max-w-[85%] w-full">
                            <p
                                className="font-medium italic leading-tight drop-shadow-lg whitespace-pre-line overflow-visible"
                                style={{
                                    fontSize: `clamp(0.7rem, 2.5vw, 2rem)`,
                                    color: accentColor
                                }}
                            >
                                &ldquo;{messageContent}&rdquo;
                            </p>

                            <div
                                className="shrink-0 rounded-full flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity shadow-lg"
                                style={{
                                    width: 'clamp(1.4rem, 3.2vw, 2.6rem)',
                                    height: 'clamp(1.4rem, 3.2vw, 2.6rem)',
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
                            className="uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-1 group-hover:translate-y-0"
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
                                💡 {isDefault ? 'HỌC VIỆN BRK - NGÂN HÀNG PHƯỚC BÁU' : displayTitle?.toUpperCase()}
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
