import prisma from '@/lib/prisma'

/**
 * Tìm user để phục vụ luồng quên/đặt lại mật khẩu, ưu tiên studentId (không bao giờ
 * bị che/mask) hơn email — vì 1 số nơi (vd. tra cứu bằng SĐT qua check-user) chỉ có
 * email đã bị che, dùng trực tiếp sẽ luôn tra ra "không tìm thấy tài khoản".
 */
export async function resolveUserForPasswordReset(params: { studentId?: number | string | null; email?: string | null }) {
    if (params.studentId !== undefined && params.studentId !== null && params.studentId !== '') {
        const id = typeof params.studentId === 'string' ? parseInt(params.studentId) : params.studentId
        if (isNaN(id)) return null
        return prisma.user.findUnique({ where: { id } })
    }
    if (params.email) {
        const normalizedEmail = params.email.toLowerCase().trim()
        return prisma.user.findFirst({ where: { email: { equals: normalizedEmail, mode: 'insensitive' } } })
    }
    return null
}

export function rateLimitKeyFor(params: { studentId?: number | string | null; email?: string | null }): string {
    if (params.studentId !== undefined && params.studentId !== null && params.studentId !== '') {
        return `id:${params.studentId}`
    }
    return `email:${(params.email || '').toLowerCase().trim()}`
}
