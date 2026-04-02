'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { signOut } from 'next-auth/react'
import { User, Settings, LogOut, ChevronDown, Sparkles, Check } from 'lucide-react'
import { NOTIFICATION_EVENT, BRKNotification } from '@/lib/notifications-client'
import { presetThemes, ThemeId, getThemeById, generateThemeCSS, getTextColorForBg, isDarkTheme } from '@/app/contexts/theme-config'

function getAllThemes() {
    if (typeof window === 'undefined') return presetThemes
    const savedCustom = localStorage.getItem('site-custom-colors')
    if (savedCustom) {
        return [
            ...presetThemes,
            {
                id: 'custom' as ThemeId,
                name: 'Tùy biến',
                colors: JSON.parse(savedCustom),
                locked: false,
            }
        ]
    }
    return presetThemes
}

function applyThemeQuick(themeId: ThemeId) {
  localStorage.setItem('site-theme', themeId)
  
  // Lấy theme colors
  let themeColors = presetThemes[0].colors // Royal Empire là default
  if (themeId !== 'default') {
    const theme = getThemeById(themeId)
    themeColors = theme.colors
  }
  
  const isDark = isDarkTheme(themeId)
  
  // Inject CSS vào <head> (cùng style element với ThemeContext)
  let styleEl = document.getElementById('theme-base-css')
  if (!styleEl) {
    styleEl = document.createElement('style')
    styleEl.id = 'theme-base-css'
    document.head.appendChild(styleEl)
  }
  
  styleEl.textContent = generateThemeCSS(themeColors, isDark)
  document.documentElement.setAttribute('data-theme', themeId)
  
  // Dispatch event để Header cập nhật state
  window.dispatchEvent(new CustomEvent('theme-applied', { detail: themeId }))
}

export default function Header({ session, userImage }: { session: any, userImage?: string | null }) {
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
    const [notification, setNotification] = useState<BRKNotification | null>(null)
    const [showThemePicker, setShowThemePicker] = useState(false)
    const [currentThemeId, setCurrentThemeId] = useState<ThemeId>('default')
    const userMenuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        // Load current theme
        const saved = localStorage.getItem('site-theme') as ThemeId || 'default'
        setCurrentThemeId(saved)

        // Lắng nghe theme apply từ Header
        const handleThemeApplied = (event: any) => {
            setCurrentThemeId(event.detail)
        }
        window.addEventListener('theme-applied', handleThemeApplied)

        // Lắng nghe thông báo toàn cầu
        const handleNotification = (event: any) => {
            const data = event.detail as BRKNotification
            setNotification(data)
            
            // Tự động ẩn sau thời gian quy định (mặc định 4s)
            const duration = data.duration || 4000
            setTimeout(() => setNotification(null), duration)
        }

        window.addEventListener(NOTIFICATION_EVENT, handleNotification)
        
        function handleClickOutside(event: MouseEvent) {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setIsUserMenuOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            window.removeEventListener('theme-applied', handleThemeApplied)
            window.removeEventListener(NOTIFICATION_EVENT, handleNotification)
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [])

    const userInitials = session?.user?.name
        ? session.user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
        : '?'

    return (
        <header className="fixed top-0 z-50 w-full bg-brk-surface text-brk-on-surface shadow-xl border-b border-brk-outline">
            <div className="container mx-auto flex h-16 items-center justify-between px-4 lg:px-8">
                {/* Logo & Brand */}
                <div className="flex items-center gap-4 shrink-0 relative">
                    <Link href="/" className="shrink-0 transition-opacity hover:opacity-80">
                        <Image
                            src="/logobrk-50px.png"
                            alt="Học Viện BRK Logo"
                            width={150}
                            height={50}
                            priority
                            className="object-contain"
                            style={{ height: '48px', width: 'auto' }}
                        />
                    </Link>

                    {/* Notification Bubble */}
                    {notification && (
                        <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 animate-in slide-in-from-left-2 fade-in duration-300 z-[60]">
                            <div className="relative bg-brk-accent text-brk-on-surface px-4 py-2 rounded-2xl shadow-2xl shadow-brk-accent/20 whitespace-nowrap">
                                {/* Mũi tên trỏ vào logo */}
                                <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[8px] border-r-brk-accent"></div>
                                
                                <div className="flex items-center gap-2">
                                    <Sparkles className="w-3 h-3 animate-pulse" />
                                    <span className="text-[11px] font-black uppercase tracking-tight italic">{notification.message}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Navigation - Desktop */}
                <nav className="hidden flex-1 items-center justify-center gap-12 text-[13px] font-black md:flex">
                    <Link href="/" className="text-brk-primary transition-all hover:scale-105 tracking-widest">TRANG CHỦ</Link>
                    <Link href="#khoa-hoc" className="text-brk-primary transition-all hover:scale-105 tracking-widest">KHÓA HỌC</Link>
                    <Link href="#" className="text-brk-primary transition-all hover:scale-105 tracking-widest">GIỚI THIỆU</Link>
                </nav>

                {/* Theme Picker - Quick Test */}
                <div className="flex items-center gap-1">
                    {getAllThemes().map((theme) => (
                        <button
                            key={theme.id}
                            onClick={() => { applyThemeQuick(theme.id); setCurrentThemeId(theme.id); }}
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-lg transition-all hover:scale-110 ${
                                currentThemeId === theme.id ? 'ring-2 ring-brk-primary scale-110' : ''
                            }`}
                            style={{ backgroundColor: theme.colors.primary }}
                            title={theme.name}
                        >
                            {currentThemeId === theme.id && <Check className="w-4 h-4" style={{ color: getTextColorForBg(theme.colors.primary, theme.id) }} />}
                        </button>
                    ))}
                </div>

                {/* Actions & Hamburger */}
                <div className="flex items-center gap-2 sm:gap-6">
                    {session ? (
                        <div className="relative hidden md:block" ref={userMenuRef}>
                            <button
                                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                className="flex items-center gap-1.5 rounded-full bg-brk-background px-2 py-1.5 transition-all hover:bg-brk-surface"
                            >
                                {userImage || session?.user?.image ? (
                                    <img
                                        src={userImage || session?.user?.image}
                                        alt="Avatar"
                                        className="h-7 w-7 rounded-full object-cover border-2 border-brk-primary"
                                    />
                                ) : (
                                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brk-primary text-xs font-black text-brk-on-surface">
                                        {userInitials}
                                    </div>
                                )}
                                <ChevronDown className={`h-3 w-3 text-brk-muted transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {/* User Dropdown Menu */}
                            {isUserMenuOpen && (
                                <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-brk-outline bg-brk-surface py-2 shadow-xl animate-in fade-in slide-in-from-top-2">
                                    <div className="border-b border-brk-outline px-4 py-2 mb-1">
                                        <p className="text-xs font-bold text-brk-on-surface truncate">{session.user?.name}</p>
                                        <p className="text-[10px] text-brk-muted truncate">{session.user?.email}</p>
                                    </div>
                                    <Link
                                        href="/admin"
                                        onClick={() => setIsUserMenuOpen(false)}
                                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-brk-primary hover:bg-brk-background transition-colors font-bold"
                                    >
                                        <Settings className="h-4 w-4" />
                                        Công cụ hỗ trợ
                                    </Link>
                                    <Link
                                        href="/account-settings"
                                        onClick={() => setIsUserMenuOpen(false)}
                                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-brk-on-surface hover:bg-brk-background transition-colors"
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
                    ) : (
                        <Link
                            href="/login"
                            className="hidden sm:inline-block rounded-full bg-brk-accent px-6 py-2 text-xs font-black text-brk-on-surface shadow-md transition-all hover:brightness-110 hover:scale-105"
                        >
                            ĐĂNG NHẬP
                        </Link>
                    )}

                    {/* Hamburger/Avatar Button - Mobile */}
                    {session ? (
                        /* Logged in: Show avatar as button */
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="flex items-center justify-center md:hidden"
                        >
                            {userImage || session?.user?.image ? (
                                <img
                                    src={userImage || session?.user?.image}
                                    alt="Avatar"
                                    className="h-12 w-12 rounded-full object-cover border-2 border-brk-primary"
                                />
                            ) : (
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brk-primary text-base font-black text-brk-on-surface">
                                    {userInitials}
                                </div>
                            )}
                        </button>
                    ) : (
                        /* Not logged in: Show hamburger */
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="flex h-10 w-10 items-center justify-center rounded-lg bg-brk-background text-brk-primary transition-all hover:bg-brk-surface md:hidden"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="h-12 w-12">
                                {isMenuOpen ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                                )}
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {/* Mobile Menu Dropdown */}
            {isMenuOpen && (
                <div className="animate-in slide-in-from-top-4 absolute left-0 top-16 w-full border-b border-brk-outline bg-brk-surface px-4 py-6 shadow-xl md:hidden">
                    {session ? (
                        /* Logged in: Show full menu with user info */
                        <nav className="flex flex-col gap-4 text-sm font-black">
                            {/* User Info */}
                            <div className="border-b border-brk-outline pb-4 mb-2">
                                <p className="text-brk-primary font-bold">{session.user?.name}</p>
                                <p className="text-brk-muted text-xs">{session.user?.email}</p>
                            </div>
                            
                            <Link href="/account-settings" onClick={() => setIsMenuOpen(false)} className="py-2 text-brk-primary hover:scale-105 transition-all">CÀI ĐẶT TÀI KHOẢN</Link>
                            <Link href="/admin" onClick={() => setIsMenuOpen(false)} className="py-2 text-brk-primary hover:scale-105 transition-all flex items-center gap-2">
                                <Settings className="w-4 h-4" />
                                CÔNG CỤ HỖ TRỢ
                            </Link>
                            <Link href="/" onClick={() => setIsMenuOpen(false)} className="py-2 text-brk-primary hover:scale-105 transition-all">TRANG CHỦ</Link>
                            <Link href="#khoa-hoc" onClick={() => setIsMenuOpen(false)} className="py-2 text-brk-primary hover:scale-105 transition-all">KHÓA HỌC</Link>
                            <Link href="#" onClick={() => setIsMenuOpen(false)} className="py-2 text-brk-primary hover:scale-105 transition-all">GIỚI THIỆU</Link>
                            
                            {/* Theme Picker - Mobile */}
                            <div className="mt-4 pt-4 border-t border-brk-outline">
                                <p className="text-xs text-brk-muted mb-3">CHỌN GIAO DIỆN</p>
                                <div className="flex justify-center gap-3">
                                    {getAllThemes().map((theme) => (
                                        <button
                                            key={theme.id}
                                            onClick={() => { applyThemeQuick(theme.id); setCurrentThemeId(theme.id); setIsMenuOpen(false); }}
                                            className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all hover:scale-110 ${
                                                currentThemeId === theme.id ? 'ring-2 ring-brk-primary scale-110' : ''
                                            }`}
                                            style={{ backgroundColor: theme.colors.primary }}
                                            title={theme.name}
                                        >
                                            {currentThemeId === theme.id && <Check className="w-5 h-5" style={{ color: getTextColorForBg(theme.colors.primary, theme.id) }} />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            <button
                                onClick={() => signOut()}
                                className="mt-2 rounded-xl bg-brk-accent py-3 text-brk-on-surface shadow-lg"
                            >
                                ĐĂNG XUẤT
                            </button>
                        </nav>
                    ) : (
                        /* Not logged in: Show basic menu */
                        <nav className="flex flex-col gap-6 text-center text-sm font-black">
                            <Link href="/" onClick={() => setIsMenuOpen(false)} className="py-2 text-brk-primary hover:scale-105 transition-all">TRANG CHỦ</Link>
                            <Link href="#khoa-hoc" onClick={() => setIsMenuOpen(false)} className="py-2 text-brk-primary hover:scale-105 transition-all">KHÓA HỌC</Link>
                            <Link href="#" onClick={() => setIsMenuOpen(false)} className="py-2 text-brk-primary hover:scale-105 transition-all">GIỚI THIỆU</Link>
                            
                            {/* Theme Picker - Mobile */}
                            <div className="mt-4 pt-4 border-t border-brk-outline">
                                <p className="text-xs text-brk-muted mb-3">CHỌN GIAO DIỆN</p>
                                <div className="flex justify-center gap-3">
                                    {getAllThemes().map((theme) => (
                                        <button
                                            key={theme.id}
                                            onClick={() => { applyThemeQuick(theme.id); setCurrentThemeId(theme.id); setIsMenuOpen(false); }}
                                            className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all hover:scale-110 ${
                                                currentThemeId === theme.id ? 'ring-2 ring-brk-primary scale-110' : ''
                                            }`}
                                            style={{ backgroundColor: theme.colors.primary }}
                                            title={theme.name}
                                        >
                                            {currentThemeId === theme.id && <Check className="w-5 h-5" style={{ color: getTextColorForBg(theme.colors.primary, theme.id) }} />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            <Link href="/login" onClick={() => setIsMenuOpen(false)} className="mt-4 rounded-xl bg-brk-accent py-4 text-brk-on-surface shadow-lg">ĐĂNG NHẬP</Link>
                        </nav>
                    )}
                </div>
            )}
        </header>
    )
}
