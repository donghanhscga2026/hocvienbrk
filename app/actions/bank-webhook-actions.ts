'use server'

import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { Role } from "@prisma/client"
import { randomBytes, createHash } from 'crypto'
import { revalidatePath } from "next/cache"

// ============================================================
// Cấp / thu hồi API key webhook SePay RIÊNG cho từng tài khoản
// ngân hàng. Key lưu dạng SHA-256 (không lưu plaintext);
// plaintext chỉ trả về 1 lần duy nhất lúc tạo.
//
// Hai đường dùng chung một logic phát hành key:
//  - ADMIN (/tools/bank-accounts): cấp key cho bất kỳ TK nào rồi
//    đưa cho giảng viên.
//  - CHỦ TÀI KHOẢN (/account-settings): người dùng tự tạo / thu
//    hồi key cho TK ngân hàng CỦA MÌNH để tự cài SePay, không
//    cần chờ admin.
// ============================================================

async function issueWebhookKey(bankAccountId: number) {
  const apiKey = randomBytes(32).toString('hex') // 64 ký tự
  const hash = createHash('sha256').update(apiKey).digest('hex')

  await prisma.userBankAccount.update({
    where: { id: bankAccountId },
    data: { webhookApiKeyHash: hash, webhookApiKeyHint: apiKey.slice(-4) }
  })

  // LƯU Ý: apiKey chỉ trả về 1 lần này — copy ngay để dán vào webhook SePay.
  return { apiKey, hint: apiKey.slice(-4) }
}

async function clearWebhookKey(bankAccountId: number) {
  await prisma.userBankAccount.update({
    where: { id: bankAccountId },
    data: { webhookApiKeyHash: null, webhookApiKeyHint: null }
  })
}

// ------------------------- ADMIN -------------------------

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

export async function generateBankWebhookKey(bankAccountId: number) {
  const check = await requireAdmin()
  if (!check.ok) return { success: false, error: check.error }

  const account = await prisma.userBankAccount.findUnique({ where: { id: bankAccountId } })
  if (!account) return { success: false, error: 'Không tìm thấy tài khoản ngân hàng.' }

  const { apiKey, hint } = await issueWebhookKey(bankAccountId)

  revalidatePath('/tools/bank-accounts')
  return { success: true, apiKey, hint }
}

export async function revokeBankWebhookKey(bankAccountId: number) {
  const check = await requireAdmin()
  if (!check.ok) return { success: false, error: check.error }

  await clearWebhookKey(bankAccountId)

  revalidatePath('/tools/bank-accounts')
  return { success: true, message: 'Đã thu hồi key. Webhook dùng key cũ sẽ bị từ chối (401).' }
}

// ------------------- CHỦ TÀI KHOẢN TỰ PHỤC VỤ -------------------

async function requireOwner(bankAccountId: number) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { ok: false as const, error: 'Bạn cần đăng nhập để thực hiện thao tác này.' }
    }
    const account = await prisma.userBankAccount.findUnique({
      where: { id: bankAccountId },
      select: { id: true, userId: true }
    })
    if (!account) return { ok: false as const, error: 'Không tìm thấy tài khoản ngân hàng.' }
    if (account.userId !== parseInt(session.user.id)) {
      return { ok: false as const, error: 'Bạn chỉ có thể quản lý key của tài khoản ngân hàng của mình.' }
    }
    return { ok: true as const }
  } catch {
    return { ok: false as const, error: 'Không thể kiểm tra quyền sở hữu tài khoản.' }
  }
}

export async function generateOwnBankWebhookKey(bankAccountId: number) {
  const check = await requireOwner(bankAccountId)
  if (!check.ok) return { success: false, error: check.error }

  const { apiKey, hint } = await issueWebhookKey(bankAccountId)

  revalidatePath('/account-settings')
  return { success: true, apiKey, hint }
}

export async function revokeOwnBankWebhookKey(bankAccountId: number) {
  const check = await requireOwner(bankAccountId)
  if (!check.ok) return { success: false, error: check.error }

  await clearWebhookKey(bankAccountId)

  revalidatePath('/account-settings')
  return { success: true, message: 'Đã thu hồi key. Webhook dùng key cũ sẽ bị từ chối (401).' }
}
