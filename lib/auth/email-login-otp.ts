import { createHmac, randomInt, timingSafeEqual } from "node:crypto"
import prisma from "@/lib/prisma"

const OTP_DURATION_MS = 10 * 60 * 1000
export function loginOtpIdentifier(userId: number) { return `login-email-otp:${userId}` }

function hashOtp(userId: number, otp: string): string {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
  if (!secret) throw new Error("AUTH_SECRET is required for login OTP")
  return createHmac("sha256", secret).update(`${userId}:${otp}`).digest("hex")
}

export function generateLoginOtp() { return String(randomInt(100000, 1000000)) }

export async function storeLoginOtp(userId: number, otp: string) {
  const identifier = loginOtpIdentifier(userId)
  await prisma.$transaction([
    prisma.verificationToken.deleteMany({ where: { identifier } }),
    prisma.verificationToken.create({
      data: { identifier, token: hashOtp(userId, otp), expires: new Date(Date.now() + OTP_DURATION_MS) },
    }),
  ])
}

export async function consumeLoginOtp(userId: number, otp: string): Promise<boolean> {
  if (!/^\d{6}$/.test(otp)) return false
  const identifier = loginOtpIdentifier(userId)
  const expected = hashOtp(userId, otp)
  const row = await prisma.verificationToken.findFirst({
    where: { identifier, expires: { gt: new Date() } },
    select: { token: true },
  })
  if (!row) return false
  const left = Buffer.from(expected, "hex")
  const right = Buffer.from(row.token, "hex")
  if (left.length !== right.length || !timingSafeEqual(left, right)) return false
  const claimed = await prisma.verificationToken.deleteMany({
    where: { identifier, token: expected, expires: { gt: new Date() } },
  })
  return claimed.count === 1
}
