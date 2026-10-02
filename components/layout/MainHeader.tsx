'use client'

import React, { useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowLeft, HelpCircle, Menu, Share2, Wallet, Wrench, X } from 'lucide-react'
import { useHomeSlug } from '@/hooks/useHomeSlug'
import { useAttentionCycle } from '@/hooks/useAttentionCycle'
import { AttentionHighlight } from '@/components/ui/attention-highlight'
import { useAttentionHighlightSettings } from '@/app/contexts/AttentionHighlightContext'
import UserMenu from './UserMenu'
import AssistantHeaderIcon from '@/components/assistant/AssistantHeaderIcon'
import { useMbwDashboard } from '@/components/mbw/MbwDashboardContext'
import NotificationBell from '@/components/notifications/NotificationBell'
import dynamic from 'next/dynamic'
import { InstallAppButton } from '@/components/pwa/PwaInstallProvider'
import { useFloatingAssistant } from '@/components/assistant/AssistantProvider'

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
    const menu = useRef<HTMLDialogElement>(null)
    const { setIsOpen: openHelp } = useFloatingAssistant()
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
            <header className="sticky top-0 z-50 w-full pt-[env(safe-area-inset-top)] bg-brk-surface text-brk-on-surface shadow-xl">
                <div className="flex min-h-14 flex-nowrap items-center justify-between gap-1 px-2 py-1 sm:gap-2 sm:px-4">
                    <div className="flex items-center gap-2 shrink-0">
                        <AttentionHighlight {...getStatus('logo')}>
                            <Link href="/" className="flex min-h-11 w-11 shrink-0 items-center justify-center transition-opacity hover:opacity-80 md:w-auto">
                                <Image
                                    src="/logobrk-50px.png"
                                    alt="MFC Logo"
                                    width={120}
                                    height={40}
                                    priority
                                    className="max-w-11 object-contain md:max-w-none"
                                    style={{ height: '36px', width: 'auto' }}
                                />
                            </Link>
                        </AttentionHighlight>

                        <AttentionHighlight {...getStatus('home')}>
                            <button
                                onClick={() => router.push(hasCustomHome ? `/page/${homeSlug}` : '/page/brk')}
                                className="flex min-h-11 min-w-11 shrink-0 items-center justify-center transition-opacity hover:opacity-80"
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
                            <AttentionHighlight {...getStatus('back')} className="hidden md:flex">
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


                    <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
                        <NotificationBell />
                        <AttentionHighlight {...getStatus('help')} className="hidden md:flex">
                            <AssistantHeaderIcon />
                        </AttentionHighlight>

                        <AttentionHighlight {...getStatus('tools')} className="hidden md:flex">
                            <button
                                onClick={() => router.push('/tools')}
                                className="shrink-0 transition-opacity hover:opacity-80 p-1.5 rounded-lg hover:bg-white/10 text-brk-primary flex items-center justify-center"
                                title="Công cụ & Tiện ích"
                            >
                                <Wrench className="w-[22px] h-[22px]" />
                            </button>
                        </AttentionHighlight>

                        {userId && (
                            <AttentionHighlight {...getStatus('share')} className="hidden md:flex">
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
                            <AttentionHighlight {...getStatus('wallet')} className="hidden md:flex">
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
                        <button type="button" aria-label="Mở menu MFC" aria-haspopup="dialog" onClick={() => menu.current?.showModal()} className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl text-brk-primary hover:bg-brk-background"><Menu size={22} /></button>
                    </div>
                </div>
            </header>
            {/* Menu phụ giúp thanh đầu trang luôn nằm trên một hàng ở điện thoại. */}
            <dialog ref={menu} aria-label="Menu MFC" className="m-auto max-h-[90dvh] w-[calc(100%_-_1.5rem)] max-w-sm overflow-y-auto rounded-2xl border border-brk-outline bg-brk-surface p-0 text-brk-on-surface shadow-2xl backdrop:bg-black/60">
                <div className="flex items-center justify-between gap-3 border-b border-brk-outline p-4"><h2 className="min-w-0 break-words font-bold">{title || 'Menu MFC'}</h2><button type="button" aria-label="Đóng menu MFC" onClick={() => menu.current?.close()} className="flex min-h-11 min-w-11 items-center justify-center rounded-xl"><X size={20} /></button></div>
                <div className="grid gap-1 p-3">
                    {showBackButton && <button type="button" className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-brk-background" onClick={() => { menu.current?.close(); handleBackClick() }}><ArrowLeft size={18} />Quay lại</button>}
                    <button type="button" className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-brk-background" onClick={() => { menu.current?.close(); router.push('/tools') }}><Wrench size={18} />Công cụ & tiện ích</button>
                    <button type="button" className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-brk-background" onClick={() => { menu.current?.close(); openHelp(true) }}><HelpCircle size={18} />Trợ giúp</button>
                    {userId && <button type="button" className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-brk-background" onClick={() => { menu.current?.close(); setShowShare(true) }}><Share2 size={18} />Chia sẻ link affiliate</button>}
                    {userId && <button type="button" className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-brk-background" onClick={() => { menu.current?.close(); openMbw() }}><Wallet size={18} />Ví MBW</button>}
                    <InstallAppButton className="w-full text-left hover:bg-brk-background" onBeforeOpen={() => menu.current?.close()} />
                </div>
            </dialog>

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
