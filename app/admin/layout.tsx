
import { auth } from "@/auth"
import { Role } from "@prisma/client"
import { redirect } from "next/navigation"

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await auth()

    if (!session?.user) {
        redirect("/login")
    }

    if (session.user.role !== Role.ADMIN) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-red-600 space-y-4">
                <h1 className="text-4xl font-bold">403 - Forbidden</h1>
                <p className="text-lg">Bạn không có quyền truy cập trang quản trị này.</p>
                <p className="text-sm text-gray-500">Current Role: {session.user.role}</p>
                <a href="/" className="text-blue-600 hover:underline">Quay về trang chủ</a>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen flex-col">
            <header className="bg-gray-900 text-white p-4 shadow-md">
                <div className="container mx-auto flex justify-between items-center">
                    <h1 className="text-xl font-bold">Admin Dashboard</h1>
                    <div className="flex gap-4 text-sm">
                        <span>Xin chào, {session.user.name}</span>
                        <a href="/" className="hover:text-blue-300">Về trang chủ</a>
                    </div>
                </div>
            </header>
            <div className="flex flex-1">
                <aside className="w-64 bg-gray-100 p-4 border-r hidden md:block">
                    <nav className="flex flex-col space-y-2">
                        <a href="/admin/payments" className="p-2 rounded hover:bg-gray-200 font-medium text-gray-700 flex items-center gap-2">💰 Quản lý Thanh toán</a>
                        <a href="/admin/students" className="p-2 rounded hover:bg-gray-200 font-medium text-gray-700 flex items-center gap-2">👥 Quản lý Học viên</a>
                        <a href="/admin/reserved-ids" className="p-2 rounded hover:bg-gray-200 font-medium text-gray-700 flex items-center gap-2">💎 Quản lý Số Đẹp</a>
                    </nav>
                </aside>
                <main className="flex-1 p-6 bg-white">
                    {children}
                </main>
            </div>
        </div>
    )
}
