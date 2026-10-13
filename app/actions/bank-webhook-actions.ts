'use server'

import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { Role } from "@prisma/client"
import { randomBytes, createHash } from 'crypto'
import { revalidatePath } from "next/cache"

// ============================================================
// ADMIN-ONLY: Cấp / thu hồi API key webhook SePay RIÊNG cho từng
// tài khoản ngân hàng. Key lưu dạng SHA-256 (không lưu plaintext);
// plaintext chỉ trả về 1 lần duy nhất lúc tạo để admin đưa cho GV.
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

export async function generateBankWebhookKey(bankAccountId: number) {
  const check = await requireAdmin()
  if (!check.ok) return { success: false, error: check.error }

  const account = await prisma.userBankAccount.findUnique({ where: { id: bankAccountId } })
  if (!account) return { success: false, error: 'Không tìm thấy tài khoản ngân hàng.' }

  const apiKey = randomBytes(32).toString('hex') // 64 ký tự
  const hash = createHash('sha256').update(apiKey).digest('hex')

  await prisma.userBankAccount.update({
    where: { id: bankAccountId },
    data: { webhookApiKeyHash: hash, webhookApiKeyHint: apiKey.slice(-4) }
  })

  revalidatePath('/tools/bank-accounts')
  // LƯU Ý: apiKey chỉ trả về 1 lần này — copy ngay để đưa cho GV dán vào webhook SePay của họ.
  return { success: true, apiKey, hint: apiKey.slice(-4) }
}

export async function revokeBankWebhookKey(bankAccountId: number) {
  const check = await requireAdmin()
  if (!check.ok) return { success: false, error: check.error }

  await prisma.userBankAccount.update({
    where: { id: bankAccountId },
    data: { webhookApiKeyHash: null, webhookApiKeyHint: null }
  })

  revalidatePath('/tools/bank-accounts')
  return { success: true, message: 'Đã thu hồi key. Webhook dùng key cũ sẽ bị từ chối (401).' }
}
