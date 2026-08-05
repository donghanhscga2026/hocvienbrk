import NextAuth from "next-auth"
import { authConfig } from "./auth.config"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const { auth } = NextAuth(authConfig)

// Lớp bảo vệ mặc định (defense-in-depth) cho các nhóm route quản trị/nhạy cảm.
// Đây là lớp chặn thứ 2 — mỗi route/action bên trong vẫn PHẢI tự kiểm tra quyền
// (bắt buộc với Server Actions vì middleware không chặn được lời gọi action trực
// tiếp), middleware này chỉ để tránh lọt route mới thêm sau này mà quên gắn check.
const ADMIN_ONLY_PREFIXES = [
    "/api/admin",
    "/api/sync-tca",
    "/api/system-tree",
]

export default auth((request: NextRequest & { auth: any }) => {
    const { pathname } = request.nextUrl

    const isAdminOnly = ADMIN_ONLY_PREFIXES.some((p) => pathname.startsWith(p))
    if (isAdminOnly) {
        const role = request.auth?.user?.role
        if (role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized. Admin only." }, { status: 403 })
        }
    }

    return NextResponse.next()
})

export const config = {
    matcher: [
        "/api/admin/:path*",
        "/api/sync-tca/:path*",
        "/api/system-tree/:path*",
    ],
}
