'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { signOut } from 'next-auth/react'

export default function Header({ session }: { session: any }) {
    const [isMenuOpen, setIsMenuOpen] = useState(false)

    return (
        <header className="fixed top-0 z-50 w-full bg-black text-white shadow-xl border-b border-white/5">
            <div className="container mx-auto flex h-16 items-center justify-between px-4 lg:px-8">
                {/* Logo & Brand */}
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

                {/* Navigation - Desktop */}
                <nav className="hidden flex-1 items-center justify-center gap-12 text-[13px] font-black md:flex">
                    <Link href="/" className="transition-all hover:text-yellow-400 hover:scale-105 tracking-widest">TRANG CHỦ</Link>
                    <Link href="#khoa-hoc" className="transition-all hover:text-yellow-400 hover:scale-105 tracking-widest">KHÓA HỌC</Link>
                    <Link href="#" className="transition-all hover:text-yellow-400 hover:scale-105 tracking-widest">GIỚI THIỆU</Link>
                </nav>

                {/* Actions & Hamburger */}
                <div className="flex items-center gap-2 sm:gap-6">
                    {session ? (
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] sm:text-[13px] font-black text-yellow-300 drop-shadow-sm whitespace-nowrap">
                                <span className="hidden xs:inline">CHÀO, </span>
                                {session.user?.name} (ID: {session.user?.id})
                            </span>
                            <button
                                onClick={() => signOut()}
                                className="hidden sm:inline-block rounded-full bg-white px-5 py-1.5 text-xs font-black text-black transition-all hover:bg-yellow-400 hover:scale-105 hover:shadow-lg"
                            >
                                ĐĂNG XUẤT
                            </button>
                        </div>
                    ) : (
                        <Link
                            href="/login"
                            className="hidden sm:inline-block rounded-full bg-white px-6 py-2 text-xs font-black text-black shadow-md transition-all hover:bg-yellow-400 hover:scale-105"
                        >
                            ĐĂNG NHẬP
                        </Link>
                    )}

                    {/* Hamburger Button */}
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 text-white transition-all hover:bg-white/10 md:hidden"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="h-6 w-6">
                            {isMenuOpen ? (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                            )}
                        </svg>
                    </button>
                </div>
            </div>

            {/* Mobile Menu Dropdown */}
            {isMenuOpen && (
                <div className="animate-in slide-in-from-top-4 absolute left-0 top-16 w-full border-b border-white/5 bg-black px-4 py-8 shadow-2xl md:hidden">
                    <nav className="flex flex-col gap-6 text-center text-sm font-black">
                        <Link href="/" onClick={() => setIsMenuOpen(false)} className="py-2 hover:text-yellow-400 hover:scale-105 transition-all">TRANG CHỦ</Link>
                        <Link href="#khoa-hoc" onClick={() => setIsMenuOpen(false)} className="py-2 hover:text-yellow-400 hover:scale-105 transition-all">KHÓA HỌC</Link>
                        <Link href="#" onClick={() => setIsMenuOpen(false)} className="py-2 hover:text-yellow-400 hover:scale-105 transition-all">GIỚI THIỆU</Link>
                        {!session ? (
                            <Link href="/login" onClick={() => setIsMenuOpen(false)} className="mt-4 rounded-xl bg-white py-4 text-black shadow-lg">ĐĂNG NHẬP</Link>
                        ) : (
                            <button
                                onClick={() => signOut()}
                                className="mt-4 rounded-xl bg-red-600 py-4 text-white shadow-lg"
                            >
                                ĐĂNG XUẤT
                            </button>
                        )}
                    </nav>
                </div>
            )}
        </header>
    )
}
