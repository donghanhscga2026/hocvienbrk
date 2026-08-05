import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { Role } from '@prisma/client'

/**
 * Trả về NextResponse 403 nếu request không phải từ user có role ADMIN.
 * Trả về null nếu hợp lệ (đã xác thực là ADMIN) — dùng để guard đầu route handler:
 *   const denied = await requireAdmin()
 *   if (denied) return denied
 */
export async function requireAdmin() {
  const session = await auth()
  if (session?.user?.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Unauthorized. Admin only.' }, { status: 403 })
  }
  return null
}

/**
 * Trả về NextResponse 401 nếu request không có session hợp lệ.
 * Trả về null nếu đã đăng nhập (không phân biệt role).
 */
export async function requireAuth() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

/**
 * Biến thể dùng cho Server Actions ('use server') — các hàm này không trả về
 * NextResponse mà trả về { success, error }, nên guard cũng cần khớp shape đó.
 * Dùng: const denied = await requireAdminAction(); if (denied) return denied
 */
export async function requireAdminAction(): Promise<{ success: false; error: string } | null> {
  const session = await auth()
  if (session?.user?.role !== Role.ADMIN) {
    return { success: false, error: 'Unauthorized. Admin only.' }
  }
  return null
}
