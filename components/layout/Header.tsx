'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { signOut } from 'next-auth/react'
import { User, Settings, LogOut, ChevronDown, Sparkles, Palette, Check } from 'lucide-react'
import { NOTIFICATION_EVENT, BRKNotification } from '@/lib/notifications-client'
import { presetThemes, ThemeId, getThemeById, generateThemeOverrides, getTextColorForBg } from '@/app/contexts/theme-config'

function applyThemeQuick(themeId: ThemeId) {
  const theme = getThemeById(themeId)
  const isDark = themeId === 'highend' || themeId === 'dark'
  
  localStorage.setItem('site-theme', themeId)
  
  let styleEl = document.getElementById('theme-overrides')
  if (!styleEl) {
    styleEl = document.createElement('style')
    styleEl.id = 'theme-overrides'
    document.head.appendChild(styleEl)
  }
  
  styleEl.textContent = generateThemeOverrides(theme.colors, isDark)
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
        <header className="fixed top-0 z-50 w-full bg-brk-header text-white shadow-xl border-b border-white/5">
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
                            <div className="relative bg-yellow-400 text-black px-4 py-2 rounded-2xl shadow-2xl shadow-yellow-400/20 whitespace-nowrap">
                                {/* Mũi tên trỏ vào logo */}
                                <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[8px] border-r-yellow-400"></div>
                                
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
                    {presetThemes.map((theme) => (
                        <button
                            key={theme.id}
                            onClick={() => { applyThemeQuick(theme.id); setCurrentThemeId(theme.id); }}
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-lg transition-all hover:scale-110 ${
                                currentThemeId === theme.id ? 'ring-2 ring-yellow-400 scale-110' : ''
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
                                className="flex items-center gap-1.5 rounded-full bg-zinc-800 px-2 py-1.5 transition-all hover:bg-zinc-700"
                            >
                                {userImage || session?.user?.image ? (
                                    <img
                                        src={userImage || session?.user?.image}
                                        alt="Avatar"
                                        className="h-7 w-7 rounded-full object-cover border-2 border-yellow-400"
                                    />
                                ) : (
                                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-yellow-400 text-xs font-black text-black">
                                        {userInitials}
                                    </div>
                                )}
                                <ChevronDown className={`h-3 w-3 text-zinc-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {/* User Dropdown Menu */}
                            {isUserMenuOpen && (
                                <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-zinc-700 bg-zinc-900 py-2 shadow-xl animate-in fade-in slide-in-from-top-2">
                                    <div className="border-b border-zinc-800 px-4 py-2 mb-1">
                                        <p className="text-xs font-bold text-white truncate">{session.user?.name}</p>
                                        <p className="text-[10px] text-zinc-500 truncate">{session.user?.email}</p>
                                    </div>
                                    {session.user?.role === 'ADMIN' && (
                                        <Link
                                            href="/admin"
                                            onClick={() => setIsUserMenuOpen(false)}
                                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-yellow-400 hover:bg-zinc-800 transition-colors font-bold"
                                        >
                                            <Settings className="h-4 w-4" />
                                            Quản trị hệ thống
                                        </Link>
                                    )}
                                    <Link
                                        href="/account-settings"
                                        onClick={() => setIsUserMenuOpen(false)}
                                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
                                    >
                                        <Settings className="h-4 w-4" />
                                        Cài đặt tài khoản
                                    </Link>
                                    <button
                                        onClick={() => signOut()}
                                        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-zinc-800 transition-colors"
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
                            className="hidden sm:inline-block rounded-full bg-white px-6 py-2 text-xs font-black text-black shadow-md transition-all hover:bg-yellow-400 hover:scale-105"
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
                                    className="h-12 w-12 rounded-full object-cover border-2 border-yellow-400"
                                />
                            ) : (
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-400 text-base font-black text-black">
                                    {userInitials}
                                </div>
                            )}
                        </button>
                    ) : (
                        /* Not logged in: Show hamburger */
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 text-brk-bg transition-all hover:bg-white/10 md:hidden"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="h-6 w-6">
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
                <div className="animate-in slide-in-from-top-4 absolute left-0 top-16 w-full border-b border-white/5 bg-black px-4 py-6 shadow-2xl md:hidden">
                    {session ? (
                        /* Logged in: Show full menu with user info */
                        <nav className="flex flex-col gap-4 text-sm font-black">
                            {/* User Info */}
                            <div className="border-b border-white/10 pb-4 mb-2">
                                <p className="text-brk-primary font-bold">{session.user?.name}</p>
                                <p className="text-zinc-500 text-xs">{session.user?.email}</p>
                            </div>
                            
                            <Link href="/account-settings" onClick={() => setIsMenuOpen(false)} className="py-2 text-brk-primary hover:scale-105 transition-all">CÀI ĐẶT TÀI KHOẢN</Link>
                            <Link href="/" onClick={() => setIsMenuOpen(false)} className="py-2 text-brk-primary hover:scale-105 transition-all">TRANG CHỦ</Link>
                            <Link href="#khoa-hoc" onClick={() => setIsMenuOpen(false)} className="py-2 text-brk-primary hover:scale-105 transition-all">KHÓA HỌC</Link>
                            {session.user?.role === 'ADMIN' && (
                                <Link href="/admin" onClick={() => setIsMenuOpen(false)} className="py-2 text-brk-primary hover:scale-105 transition-all">CHỨC NĂNG QUẢN TRỊ</Link>
                            )}
                            <Link href="#" onClick={() => setIsMenuOpen(false)} className="py-2 text-brk-primary hover:scale-105 transition-all">GIỚI THIỆU</Link>
                            
                            {/* Theme Picker - Mobile */}
                            <div className="mt-4 pt-4 border-t border-white/10">
                                <p className="text-xs text-zinc-500 mb-3">CHỌN GIAO DIỆN</p>
                                <div className="flex justify-center gap-3">
                                    {presetThemes.map((theme) => (
                                        <button
                                            key={theme.id}
                                            onClick={() => { applyThemeQuick(theme.id); setCurrentThemeId(theme.id); setIsMenuOpen(false); }}
                                            className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all hover:scale-110 ${
                                                currentThemeId === theme.id ? 'ring-2 ring-yellow-400 scale-110' : ''
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
                                className="mt-2 rounded-xl bg-red-600 py-3 text-white shadow-lg"
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
                            <div className="mt-4 pt-4 border-t border-white/10">
                                <p className="text-xs text-zinc-500 mb-3">CHỌN GIAO DIỆN</p>
                                <div className="flex justify-center gap-3">
                                    {presetThemes.map((theme) => (
                                        <button
                                            key={theme.id}
                                            onClick={() => { applyThemeQuick(theme.id); setCurrentThemeId(theme.id); setIsMenuOpen(false); }}
                                            className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all hover:scale-110 ${
                                                currentThemeId === theme.id ? 'ring-2 ring-yellow-400 scale-110' : ''
                                            }`}
                                            style={{ backgroundColor: theme.colors.primary }}
                                            title={theme.name}
                                        >
                                            {currentThemeId === theme.id && <Check className="w-5 h-5" style={{ color: getTextColorForBg(theme.colors.primary, theme.id) }} />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            <Link href="/login" onClick={() => setIsMenuOpen(false)} className="mt-4 rounded-xl bg-white py-4 text-black shadow-lg">ĐĂNG NHẬP</Link>
                        </nav>
                    )}
                </div>
            )}
        </header>
    )
}
