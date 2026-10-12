import prisma from "@/lib/prisma"
import { getAllPhoneVariants, normalizePhone } from "@/lib/phone-utils"

export function validLoginPhone(input: unknown): input is string {
  return typeof input === "string" && input.length <= 30 &&
    Boolean(normalizePhone(input)) && /^\+?[0-9 .()-]{9,30}$/.test(input)
}

export async function lookupLoginPhone(phone: string) {
  if (!validLoginPhone(phone)) return null
  const variants = getAllPhoneVariants(phone)
  return prisma.user.findFirst({ where: { phone: { in: variants } } })
}

// Che email khi hiển thị cho người chưa đăng nhập: "nguyenvana@gmail.com" -> "ng***ana@gmail.com"
// Giữ 2 ký tự đầu + 3 ký tự cuối phần local để chủ tài khoản dễ nhận ra mailbox của mình.
export function maskEmail(email: string): string {
  const at = email.indexOf("@")
  if (at <= 0) return "***"
  const local = email.slice(0, at)
  const domain = email.slice(at + 1)
  if (local.length <= 5) return `${local.slice(0, 1)}***@${domain}`
  return `${local.slice(0, 2)}***${local.slice(-3)}@${domain}`
}
