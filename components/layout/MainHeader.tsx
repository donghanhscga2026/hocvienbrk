'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useHomeSlug } from '@/hooks/useHomeSlug'
import UserMenu from './UserMenu'
import AssistantHeaderIcon from '@/components/assistant/AssistantHeaderIcon'
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

    return (
        <>
            <header className="sticky top-0 z-50 w-full bg-brk-surface text-brk-on-surface shadow-xl">
                <div className="flex items-center justify-between h-14 px-2 sm:px-4">
                    <div className="flex items-center gap-2 shrink-0">
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
                        
                        {showBackButton && (
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
                        )}
                    </div>


                    <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                        <AssistantHeaderIcon />

                        {userId && (
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
                        )}

                        <UserMenu />
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
        </>
    )
}
