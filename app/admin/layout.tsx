import { auth } from "@/auth"
import { Role } from "@prisma/client"
import { redirect } from "next/navigation"
import Link from 'next/link'

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await auth()

    if (!session?.user) redirect("/login")
    if (session.user.role !== Role.ADMIN) {
        return <div className="p-10 text-center text-red-600 font-bold">403 - KHÔNG CÓ QUYỀN TRUY CẬP</div>
    }

    const menuItems = [
        { label: 'Thanh toán', href: '/admin/payments', icon: '💰' },
        { label: 'Thành viên', href: '/admin/students', icon: '👥' },
        { label: 'Khóa học', href: '/admin/courses', icon: '📘' },
        { label: 'Số đẹp', href: '/admin/reserved-ids', icon: '💎' },
    ]

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            {/* Header Cố định trên cùng */}
            <header className="sticky top-0 z-[100] bg-black text-white p-4 shadow-xl">
                <div className="flex justify-between items-center max-w-5xl mx-auto">
                    <h1 className="text-sm font-black tracking-widest text-yellow-400 uppercase">Admin BRK</h1>
                    <Link href="/" className="text-[10px] font-black bg-white/10 px-3 py-1.5 rounded-lg uppercase">Thoát</Link>
                </div>
            </header>

            {/* Menu Di động - Hiển thị trên cùng dưới Header, dạng nút bấm rõ ràng */}
            <nav className="sticky top-[52px] z-[90] bg-white border-b border-gray-200 p-2 overflow-x-auto no-scrollbar flex gap-2 md:hidden shadow-sm">
                {menuItems.map((item) => (
                    <a 
                        key={item.href} 
                        href={item.href}
                        className="flex-none flex items-center gap-1.5 px-4 py-2 bg-gray-100 rounded-xl text-[10px] font-black uppercase text-gray-600 active:bg-black active:text-yellow-400 transition-all"
                    >
                        <span>{item.icon}</span>
                        {item.label}
                    </a>
                ))}
            </nav>

            <div className="flex flex-1 max-w-5xl mx-auto w-full">
                {/* Sidebar Máy tính */}
                <aside className="hidden md:block w-64 p-6 border-r border-gray-200 bg-white">
                    <nav className="space-y-2 sticky top-24">
                        {menuItems.map((item) => (
                            <a 
                                key={item.href}
                                href={item.href}
                                className="flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-100 font-bold text-gray-600 text-sm transition-all"
                            >
                                <span className="text-xl">{item.icon}</span>
                                {item.label}
                            </a>
                        ))}
                    </nav>
                </aside>

                {/* Nội dung chính */}
                <main className="flex-1 p-4 md:p-8">
                    {children}
                </main>
            </div>
        </div>
    )
}
