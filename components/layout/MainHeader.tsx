'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Wallet, Wrench } from 'lucide-react'
import { useHomeSlug } from '@/hooks/useHomeSlug'
import UserMenu from './UserMenu'
import AssistantHeaderIcon from '@/components/assistant/AssistantHeaderIcon'
import { useMbwDashboard } from '@/components/mbw/MbwDashboardContext'
import MbwDashboardPopup from '@/components/mbw/MbwDashboardPopup'
import dynamic from 'next/dynamic'

const ShareModal = dynamic(() => import('@/components/share/ShareModal'), { ssr: false })

interface MainHeaderProps {
    title: string
    toolSlug?: string
    profile?: any
}

export default function MainHeader({ title }: MainHeaderProps) {
    const pathname = usePathname()
    const router = useRouter()
    const { data: session } = useSession()
    const [showShare, setShowShare] = useState(false)
    const { homeSlug, isReady } = useHomeSlug()
    const { open: openMbw } = useMbwDashboard()
    
    const userId = session?.user?.id != null ? String(session.user.id) : null
    
    const isHomePage = pathname === '/'
    const isToolsRoot = pathname === '/tools'
    const hasCustomHome = isReady && homeSlug

    const getBackPath = () => {
        const paths = pathname.split('/').filter(Boolean)
        if (paths.length === 0 || (paths.length === 1 && paths[0] === 'tools')) {
            return '/'
        } else if (paths.length === 1) {
            return '/tools'
        } else if (paths.length === 2) {
            return '/tools'
        } else {
            return '/tools/' + paths[1]
        }
    }

    const handleBackClick = () => {
        router.push(getBackPath())
    }

    const showBackButton = !isHomePage && !isToolsRoot

    // --- LOGIC HIGHLIGHT KHI NGƯỜI DÙNG KHÔNG HOẠT ĐỘNG ---
    const [activeIndex, setActiveIndex] = useState<number | null>(null)

    useEffect(() => {
        let inactivityTimer: NodeJS.Timeout
        let cycleInterval: NodeJS.Timeout

        const resetInactivity = () => {
            // Tắt highlight khi có hoạt động
            setActiveIndex(null)
            
            // Xóa các bộ hẹn giờ cũ
            clearTimeout(inactivityTimer)
            clearInterval(cycleInterval)

            // Hẹn giờ sau 5 giây không hoạt động sẽ bắt đầu vòng lặp highlight
            inactivityTimer = setTimeout(() => {
                let current = 0
                setActiveIndex(current)

                cycleInterval = setInterval(() => {
                    // Xác định danh sách nút thực tế đang hiển thị trên UI tại thời điểm đó
                    const visibleItems = [
                        { id: 'logo', visible: true },
                        { id: 'home', visible: true },
                        { id: 'back', visible: showBackButton },
                        { id: 'help', visible: true },
                        { id: 'tools', visible: true },
                        { id: 'share', visible: !!userId },
                        { id: 'wallet', visible: !!userId },
                        { id: 'avatar', visible: true }
                    ].filter(x => x.visible)

                    if (visibleItems.length > 0) {
                        current = (current + 1) % visibleItems.length
                        setActiveIndex(current)
                    }
                }, 3000) // Đổi nút nhấp nháy mỗi 3 giây
            }, 5000) // 5 giây không hoạt động
        }

        // Lắng nghe các sự kiện hoạt động của người dùng
        const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'click']
        events.forEach(e => window.addEventListener(e, resetInactivity))

        resetInactivity()

        return () => {
            clearTimeout(inactivityTimer)
            clearInterval(cycleInterval)
            events.forEach(e => window.removeEventListener(e, resetInactivity))
        }
    }, [userId, showBackButton])

    // Helper lấy trạng thái highlight cho từng nút
    const getHighlightStatus = useCallback((id: string) => {
        const visibleItems = [
            { id: 'logo', tooltip: 'Cộng đồng', visible: true },
            { id: 'home', tooltip: 'Trang chủ', visible: true },
            { id: 'back', tooltip: 'Quay lại', visible: showBackButton },
            { id: 'help', tooltip: 'Trợ giúp', visible: true },
            { id: 'tools', tooltip: 'Công cụ & Tiện ích', visible: true },
            { id: 'share', tooltip: 'Chia sẻ link', visible: !!userId },
            { id: 'wallet', tooltip: 'Ngân hàng Phước báu', visible: !!userId },
            { id: 'avatar', tooltip: 'Cá nhân', visible: true }
        ].filter(x => x.visible)

        const isActive = activeIndex !== null && visibleItems[activeIndex]?.id === id
        const tooltip = visibleItems.find(x => x.id === id)?.tooltip || ''

        return {
            className: isActive 
                ? 'transition-all duration-500 transform scale-125 ring-2 ring-amber-400 ring-offset-2 rounded-xl shadow-[0_0_20px_rgba(251,191,36,0.8)] bg-white/10 z-30' 
                : 'transition-all duration-300',
            isActive,
            tooltip
        }
    }, [activeIndex, showBackButton, userId])

    // Component Wrapper hỗ trợ hiệu ứng lóe sáng và Tooltip tự động
    const HighlightWrapper = ({ id, children }: { id: string; children: React.ReactNode }) => {
        const { className, isActive, tooltip } = getHighlightStatus(id)
        return (
            <div className={`relative flex items-center justify-center p-0.5 ${className}`}>
                {children}
                {isActive && (
                    <div className="absolute top-[130%] left-1/2 -translate-x-1/2 bg-yellow-400 text-slate-950 text-[11px] font-black px-2.5 py-1.5 rounded-lg shadow-[0_10px_25px_rgba(234,179,8,0.3)] border border-yellow-500 whitespace-nowrap z-50 animate-in fade-in zoom-in-95 duration-200">
                        {tooltip}
                        {/* Mũi tên tooltip */}
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-yellow-400 rotate-45 border-t border-l border-yellow-500"></div>
                    </div>
                )}
            </div>
        )
    }

    return (
        <>
            <header className="sticky top-0 z-50 w-full bg-brk-surface text-brk-on-surface shadow-xl">
                <div className="flex items-center justify-between h-14 px-2 sm:px-4">
                    <div className="flex items-center gap-2 shrink-0">
                        <HighlightWrapper id="logo">
                            <Link href="/" className="shrink-0 transition-opacity hover:opacity-80">
                                <Image
                                    src="/logobrk-50px.png"
                                    alt="BRK Logo"
                                    width={120}
                                    height={40}
                                    priority
                                    className="object-contain"
                                    style={{ height: '36px', width: 'auto' }}
                                />
                            </Link>
                        </HighlightWrapper>
                        
                        <HighlightWrapper id="home">
                            <button
                                onClick={() => router.push(hasCustomHome ? `/page/${homeSlug}` : '/page/brk')}
                                className="shrink-0 transition-opacity hover:opacity-80"
                                title={`Trang chủ: ${hasCustomHome ? homeSlug : 'brk'}`}
                            >
                                <Image
                                    src="/icon_home_3d.png"
                                    alt="Trang chủ"
                                    width={36}
                                    height={36}
                                    priority
                                    className="object-contain"
                                    style={{ width: 'auto', height: '36px' }}
                                />
                            </button>
                        </HighlightWrapper>
                        
                        {showBackButton && (
                            <HighlightWrapper id="back">
                                <button
                                    onClick={handleBackClick}
                                    className="shrink-0 transition-opacity hover:opacity-80 p-1.5 rounded-lg hover:bg-white/10"
                                    title={`Quay về ${getBackPath()}`}
                                >
                                    <Image
                                        src="/Icon LeftBack.png"
                                        alt="Quay lại"
                                        width={36}
                                        height={36}
                                        className="object-contain"
                                        style={{ width: 'auto', height: '28px' }}
                                    />
                                </button>
                            </HighlightWrapper>
                        )}
                    </div>


                    <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
                        <HighlightWrapper id="help">
                            <AssistantHeaderIcon />
                        </HighlightWrapper>

                        <HighlightWrapper id="tools">
                            <button
                                onClick={() => router.push('/tools')}
                                className="shrink-0 transition-opacity hover:opacity-80 p-1.5 rounded-lg hover:bg-white/10 text-brk-primary flex items-center justify-center"
                                title="Công cụ & Tiện ích"
                            >
                                <Wrench className="w-[22px] h-[22px]" />
                            </button>
                        </HighlightWrapper>

                        {userId && (
                            <HighlightWrapper id="share">
                                <button
                                    onClick={() => setShowShare(true)}
                                    className="shrink-0 transition-opacity hover:opacity-80"
                                    title="Chia sẻ link affiliate"
                                >
                                    <Image
                                        src="/Share_Link_3d.png"
                                        alt="Chia sẻ"
                                        width={36}
                                        height={36}
                                        className="object-contain"
                                        style={{ width: 'auto', height: '32px' }}
                                    />
                                </button>
                            </HighlightWrapper>
                        )}

                        {userId && (
                            <HighlightWrapper id="wallet">
                                <button
                                    onClick={openMbw}
                                    className="shrink-0 transition-opacity hover:opacity-80 p-1.5 rounded-lg hover:bg-white/10"
                                    title="Ví MBW — Ngân hàng Phước Báu"
                                >
                                    <Wallet className="w-6 h-6 text-brk-primary" />
                                </button>
                            </HighlightWrapper>
                        )}

                        <HighlightWrapper id="avatar">
                            <UserMenu />
                        </HighlightWrapper>
                    </div>
                </div>
            </header>

            {showShare && (
                <ShareModal
                    isOpen={showShare}
                    onClose={() => setShowShare(false)}
                    course={{ id_khoa: '', name_lop: 'Trang cá nhân - Học viện BRK' }}
                    affiliateCode={userId}
                    profileSlug={isHomePage ? null : (hasCustomHome ? homeSlug : null)}
                    shareType="header"
                />
            )}

            <MbwDashboardPopup />
        </>
    )
}
