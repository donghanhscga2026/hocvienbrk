
import Link from 'next/link'
import { auth, signOut } from '@/auth'
import Image from 'next/image'

export default async function Header() {
    const session = await auth()

    return (
        <header className="fixed top-0 z-50 w-full bg-[#7c3aed] text-white shadow-md">
            <div className="container mx-auto flex h-16 items-center justify-between px-4 lg:px-8">
                {/* Logo & Brand */}
                <Link href="/" className="flex items-center gap-2 font-bold italic tracking-wider">
                    <span className="text-2xl">🎓 BRK</span>
                </Link>

                {/* Navigation - Desktop */}
                <nav className="hidden items-center gap-8 text-sm font-medium md:flex">
                    <Link href="/" className="transition-colors hover:text-purple-200">Trang chủ</Link>
                    <Link href="#khoa-hoc" className="transition-colors hover:text-purple-200">Khóa học</Link>
                    <Link href="#" className="transition-colors hover:text-purple-200">Giới thiệu</Link>
                </nav>

                {/* Actions */}
                <div className="flex items-center gap-4">
                    {session ? (
                        <div className="flex items-center gap-3">
                            <span className="hidden text-sm sm:inline">Chào, {session.user?.name}</span>
                            <form
                                action={async () => {
                                    'use server'
                                    await signOut()
                                }}
                            >
                                <button className="rounded-full bg-white px-5 py-1.5 text-sm font-semibold text-[#7c3aed] transition-all hover:bg-purple-50">
                                    Đăng xuất
                                </button>
                            </form>
                        </div>
                    ) : (
                        <Link
                            href="/login"
                            className="rounded-full bg-white px-6 py-2 text-sm font-bold text-[#7c3aed] shadow-sm transition-all hover:bg-purple-50 hover:shadow-md"
                        >
                            Đăng nhập / Đăng ký
                        </Link>
                    )}
                </div>
            </div>
        </header>
    )
}
