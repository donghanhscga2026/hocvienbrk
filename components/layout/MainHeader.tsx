'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Wallet, Wrench } from 'lucide-react'
import { useHomeSlug } from '@/hooks/useHomeSlug'
import { useAttentionCycle } from '@/hooks/useAttentionCycle'
import { AttentionHighlight } from '@/components/ui/attention-highlight'
import { useAttentionHighlightSettings } from '@/app/contexts/AttentionHighlightContext'
import UserMenu from './UserMenu'
import AssistantHeaderIcon from '@/components/assistant/AssistantHeaderIcon'
import { useMbwDashboard } from '@/components/mbw/MbwDashboardContext'
import dynamic from 'next/dynamic'

const ShareModal = dynamic(() => import('@/components/share/ShareModal'), { ssr: false })
const MbwDashboardPopup = dynamic(() => import('@/components/mbw/MbwDashboardPopup'), { ssr: false })

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
    // Dùng chung useAttentionCycle + AttentionHighlight (hooks/useAttentionCycle.ts,
    // components/ui/attention-highlight.tsx) — cùng cơ chế được tái sử dụng ở mọi
    // header/footer khác trong app. Nội dung tooltip + tốc độ/thời gian đọc từ
    // AttentionHighlightContext (nạp từ DB, chỉnh trong /tools/settings/attention-tooltip).
    const { config: attnConfig, getItem: getAttnItem } = useAttentionHighlightSettings()
    const logoAttn = getAttnItem('mainheader.logo', 'Cộng đồng')
    const homeAttn = getAttnItem('mainheader.home', 'Trang chủ')
    const backAttn = getAttnItem('mainheader.back', 'Quay lại')
    const helpAttn = getAttnItem('mainheader.help', 'Trợ giúp')
    const toolsAttn = getAttnItem('mainheader.tools', 'Công cụ & Tiện ích')
    const shareAttn = getAttnItem('mainheader.share', 'Chia sẻ link')
    const walletAttn = getAttnItem('mainheader.wallet', 'Ngân hàng Phước báu')
    const avatarAttn = getAttnItem('mainheader.avatar', 'Cá nhân')

    const { getStatus } = useAttentionCycle([
        { id: 'logo', tooltip: logoAttn.tooltip, visible: logoAttn.enabled },
        { id: 'home', tooltip: homeAttn.tooltip, visible: homeAttn.enabled },
        { id: 'back', tooltip: backAttn.tooltip, visible: showBackButton && backAttn.enabled },
        { id: 'help', tooltip: helpAttn.tooltip, visible: helpAttn.enabled },
        { id: 'tools', tooltip: toolsAttn.tooltip, visible: toolsAttn.enabled },
        { id: 'share', tooltip: shareAttn.tooltip, visible: !!userId && shareAttn.enabled },
        { id: 'wallet', tooltip: walletAttn.tooltip, visible: !!userId && walletAttn.enabled },
        { id: 'avatar', tooltip: avatarAttn.tooltip, visible: avatarAttn.enabled }
    ], { idleDelayMs: attnConfig.idleDelayMs, cycleIntervalMs: attnConfig.cycleIntervalMs })

    return (
        <>
            <header className="sticky top-0 z-50 w-full bg-brk-surface text-brk-on-surface shadow-xl">
                <div className="flex items-center justify-between h-14 px-2 sm:px-4">
                    <div className="flex items-center gap-2 shrink-0">
                        <AttentionHighlight {...getStatus('logo')}>
                            <Link href="/" className="shrink-0 transition-opacity hover:opacity-80">
                                <Image
                                    src="/logobrk-50px.png"
                                    alt="MFC Logo"
                                    width={120}
                                    height={40}
                                    priority
                                    className="object-contain"
                                    style={{ height: '36px', width: 'auto' }}
                                />
                            </Link>
                        </AttentionHighlight>

                        <AttentionHighlight {...getStatus('home')}>
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
                        </AttentionHighlight>

                        {showBackButton && (
                            <AttentionHighlight {...getStatus('back')}>
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
                            </AttentionHighlight>
                        )}
                    </div>


                    <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
                        <AttentionHighlight {...getStatus('help')}>
                            <AssistantHeaderIcon />
                        </AttentionHighlight>

                        <AttentionHighlight {...getStatus('tools')}>
                            <button
                                onClick={() => router.push('/tools')}
                                className="shrink-0 transition-opacity hover:opacity-80 p-1.5 rounded-lg hover:bg-white/10 text-brk-primary flex items-center justify-center"
                                title="Công cụ & Tiện ích"
                            >
                                <Wrench className="w-[22px] h-[22px]" />
                            </button>
                        </AttentionHighlight>

                        {userId && (
                            <AttentionHighlight {...getStatus('share')}>
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
                            </AttentionHighlight>
                        )}

                        {userId && (
                            <AttentionHighlight {...getStatus('wallet')}>
                                <button
                                    onClick={openMbw}
                                    className="shrink-0 transition-opacity hover:opacity-80 p-1.5 rounded-lg hover:bg-white/10"
                                    title="Ví MBW — Dòng chảy Phước Báu"
                                >
                                    <Wallet className="w-6 h-6 text-brk-primary" />
                                </button>
                            </AttentionHighlight>
                        )}

                        <AttentionHighlight {...getStatus('avatar')}>
                            <UserMenu />
                        </AttentionHighlight>
                    </div>
                </div>
            </header>

            {showShare && (
                <ShareModal
                    isOpen={showShare}
                    onClose={() => setShowShare(false)}
                    course={{ id_khoa: '', name_lop: 'Trang cá nhân - Cộng đồng MFC' }}
                    affiliateCode={userId}
                    profileSlug={isHomePage ? null : (hasCustomHome ? homeSlug : null)}
                    shareType="header"
                />
            )}

            <MbwDashboardPopup />
        </>
    )
}
