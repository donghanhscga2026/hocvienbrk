'use server'

import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { Role } from "@prisma/client"
import { revalidatePath } from "next/cache"

// ============================================================
// ADMIN-ONLY: Quản lý cấu hình tự động xác minh thanh toán
// (AutoVerifyConfig) theo từng khóa học — nền cho phương án
// mỗi giảng viên 1 TK ngân hàng + email biến động số dư riêng.
// ============================================================

async function requireAdmin() {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== Role.ADMIN) {
      return { ok: false as const, error: 'Chỉ Admin mới có quyền thực hiện thao tác này.' }
    }
    return { ok: true as const }
  } catch {
    return { ok: false as const, error: 'Chỉ Admin mới có quyền thực hiện thao tác này.' }
  }
}

export async function getAutoVerifyConfigs() {
  const check = await requireAdmin()
  if (!check.ok) return { success: false, error: check.error }

  const configs = await prisma.autoVerifyConfig.findMany({
    include: {
      course: {
        select: {
          id: true,
          id_khoa: true,
          name_lop: true,
          phi_coc: true,
          teacher: { select: { id: true, name: true } },
          teacherBankAccount: {
            select: { id: true, accountHolder: true, accountNumber: true, bankName: true }
          }
        }
      }
    },
    orderBy: { courseId: 'asc' }
  })
  return { success: true, configs }
}

export async function getCoursesWithoutAutoVerify() {
  const check = await requireAdmin()
  if (!check.ok) return { success: false, error: check.error }

  const courses = await prisma.course.findMany({
    where: {
      phi_coc: { gt: 0 },
      autoVerifyConfig: null,
    },
    select: {
      id: true,
      id_khoa: true,
      name_lop: true,
      phi_coc: true,
      teacher: { select: { id: true, name: true } },
      teacherBankAccount: {
        select: { id: true, accountHolder: true, accountNumber: true, bankName: true }
      }
    },
    orderBy: { id: 'asc' },
    take: 200,
  })
  return { success: true, courses }
}

export interface AutoVerifyConfigInput {
  courseId: number
  emailFrom: string
  emailQuery: string
  bankName: string
  enabled: boolean
  alternativeCodes?: string | null
}

export async function upsertAutoVerifyConfig(input: AutoVerifyConfigInput) {
  const check = await requireAdmin()
  if (!check.ok) return { success: false, error: check.error }

  if (!input.courseId || !input.emailFrom?.trim() || !input.bankName?.trim()) {
    return { success: false, error: 'Thiếu thông tin bắt buộc: khóa học, email người gửi, tên ngân hàng.' }
  }

  const config = await prisma.autoVerifyConfig.upsert({
    where: { courseId: input.courseId },
    create: {
      courseId: input.courseId,
      emailFrom: input.emailFrom.trim(),
      emailQuery: input.emailQuery?.trim() || '',
      bankName: input.bankName.trim(),
      enabled: input.enabled,
      alternativeCodes: input.alternativeCodes?.trim() || null,
    },
    update: {
      emailFrom: input.emailFrom.trim(),
      emailQuery: input.emailQuery?.trim() || '',
      bankName: input.bankName.trim(),
      enabled: input.enabled,
      alternativeCodes: input.alternativeCodes?.trim() || null,
    }
  })

  revalidatePath('/tools/payments/auto-verify')
  return { success: true, config }
}

export async function deleteAutoVerifyConfig(courseId: number) {
  const check = await requireAdmin()
  if (!check.ok) return { success: false, error: check.error }

  await prisma.autoVerifyConfig.deleteMany({ where: { courseId } })
  revalidatePath('/tools/payments/auto-verify')
  return { success: true }
}

// Bản đồ email người gửi đã xác minh thực tế → dùng khi tự tạo config
// cho khóa học mới. Ngân hàng chưa có trong bản đồ → tạo config TẮT,
// admin điền tay sau khi thấy email thật.
export const KNOWN_BANK_SENDERS: Record<string, { emailFrom: string; emailQuery: string }> = {
  SACOMBANK: { emailFrom: 'info@sacombank.com.vn', emailQuery: '"thong bao giao dich"' },
}

export interface BankSenderDefaults {
  emailFrom: string
  emailQuery: string
  bankName: string
  enabled: boolean
}

export function getBankSenderDefaults(bankName: string | null | undefined): BankSenderDefaults {
  const normalized = (bankName || '').toUpperCase()
  const sender = KNOWN_BANK_SENDERS[normalized]
  if (sender) {
    return { emailFrom: sender.emailFrom, emailQuery: sender.emailQuery, bankName: bankName || '', enabled: true }
  }
  return { emailFrom: '', emailQuery: '', bankName: bankName || '', enabled: false }
}
