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
