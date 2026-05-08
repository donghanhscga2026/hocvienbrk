'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { signOut, useSession } from 'next-auth/react'
import { Settings, LogOut, ChevronDown, LogIn, Check } from 'lucide-react'
import { presetThemes, ThemeId, getThemeById, generateThemeCSS, getTextColorForBg, isDarkTheme } from '@/app/contexts/theme-config'

export default function UserMenu() {
    const { data: session } = useSession()
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
    const [userImage, setUserImage] = useState<string | null>(null)
    const [currentThemeId, setCurrentThemeId] = useState<ThemeId>('default')
    const userMenuRef = useRef<HTMLDivElement>(null)

    const userName = session?.user?.name || ''
    const userInitials = userName
        ? userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
        : '?'

    // Fetch user image từ database
    useEffect(() => {
        if (session?.user?.id) {
            fetch(`/api/user/${session.user.id}`)
                .then(res => res.json())
                .then(data => {
                    if (data.image) {
                        setUserImage(data.image)
                    }
                })
                .catch(console.error)
        }
    }, [session?.user?.id])

    // Load current theme from localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('site-theme') as ThemeId || 'default'
            setCurrentThemeId(saved)
        }
    }, [])

    // Apply theme function
    function applyThemeQuick(themeId: ThemeId) {
        localStorage.setItem('site-theme', themeId)
        let themeColors = presetThemes[0].colors
        if (themeId !== 'default') {
            const theme = getThemeById(themeId)
            themeColors = theme.colors
        }
        const isDark = isDarkTheme(themeId)
        let styleEl = document.getElementById('theme-base-css')
        if (!styleEl) {
            styleEl = document.createElement('style')
            styleEl.id = 'theme-base-css'
            document.head.appendChild(styleEl)
        }
        styleEl.textContent = generateThemeCSS(themeColors, isDark)
        document.documentElement.setAttribute('data-theme', themeId)
        setCurrentThemeId(themeId)
    }

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setIsUserMenuOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    if (!session) return (
        <Link
            href="/login"
            className="flex items-center gap-1.5 rounded-full bg-brk-primary px-3 py-1.5 text-xs font-bold text-brk-on-primary hover:opacity-90 transition-opacity"
        >
            <LogIn className="h-3.5 w-3.5" />
            <span>Đăng nhập</span>
        </Link>
    )

    return (
        <div className="relative" ref={userMenuRef}>
            <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center justify-center transition-all hover:opacity-80"
            >
                {userImage ?? session.user?.image ? (
                    <img
                        src={userImage ?? session.user?.image ?? ''}
                        alt="Avatar"
                        className="h-9 w-9 rounded-full object-cover border-2 border-brk-primary"
                    />
                ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brk-primary text-sm font-black text-brk-on-surface">
                        {userInitials}
                    </div>
                )}
            </button>

            {isUserMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-brk-outline bg-brk-surface py-2 shadow-xl animate-in fade-in slide-in-from-top-2 z-[60]">
                    <div className="border-b border-brk-outline px-4 py-2 mb-1">
                        <p className="text-xs font-bold text-brk-on-surface truncate">{session.user?.name}</p>
                        <p className="text-[10px] text-brk-muted truncate">{session.user?.email}</p>
                    </div>

                    {/* Theme Picker */}
                    <div className="border-t border-brk-outline pt-2 mt-2">
                        <p className="px-4 py-1 text-[10px] font-bold text-brk-muted uppercase">Theme</p>
                        <div className="flex items-center gap-1 px-4 pb-2">
                            {presetThemes.map((theme) => (
                                <button
                                    key={theme.id}
                                    onClick={() => applyThemeQuick(theme.id)}
                                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-all hover:scale-110 ${
                                        currentThemeId === theme.id ? 'ring-2 ring-brk-primary scale-110' : ''
                                    }`}
                                    style={{ backgroundColor: theme.colors.primary }}
                                    title={theme.name}
                                >
                                    {currentThemeId === theme.id && <Check className="w-3 h-3" style={{ color: getTextColorForBg(theme.colors.primary, theme.id) }} />}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="border-t border-brk-outline pt-2 mt-2" />

                    <Link
                        href="/tools"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-brk-primary hover:bg-brk-background transition-colors font-bold"
                    >
                        <Settings className="h-4 w-4" />
                        Công cụ hỗ trợ
                    </Link>
                    <Link
                        href="/account-settings"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-brk-on-surface hover:bg-brk-background transition-colors"
                    >
                        <Settings className="h-4 w-4" />
                        Cài đặt tài khoản
                    </Link>
                    <button
                        onClick={() => signOut()}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-brk-accent hover:bg-brk-background transition-colors"
                    >
                        <LogOut className="h-4 w-4" />
                        Đăng xuất
                    </button>
                </div>
            )}
        </div>
    )
}
