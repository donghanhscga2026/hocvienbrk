import { NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { decryptMfaSecret, encryptMfaSecret, generateTotpSecret, totpUri, verifyTotp } from "@/lib/mfa"

async function adminSession() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "ADMIN") return null
  return session
}

export async function GET() {
  const session = await adminSession()
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const user = await prisma.user.findUnique({
    where: { id: Number(session.user.id) },
    select: { mfaEnabled: true },
  })
  return NextResponse.json({ enabled: Boolean(user?.mfaEnabled) })
}

export async function POST() {
  const session = await adminSession()
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const secret = generateTotpSecret()
  await prisma.user.update({
    where: { id: Number(session.user.id) },
    data: { mfaSecret: encryptMfaSecret(secret), mfaEnabled: false },
  })
  const account = session.user.email || `admin-${session.user.id}`
  return NextResponse.json({ secret, uri: totpUri(secret, account) })
}

export async function PUT(request: Request) {
  const session = await adminSession()
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const body = await request.json().catch(() => null)
  const code = typeof body?.code === "string" ? body.code.trim() : ""
  const user = await prisma.user.findUnique({
    where: { id: Number(session.user.id) },
    select: { mfaSecret: true },
  })
  if (!user?.mfaSecret || !verifyTotp(decryptMfaSecret(user.mfaSecret), code)) {
    return NextResponse.json({ error: "Mã xác thực không hợp lệ." }, { status: 400 })
  }
  await prisma.user.update({
    where: { id: Number(session.user.id) },
    data: { mfaEnabled: true },
  })
  return NextResponse.json({ success: true })
}

export async function DELETE(request: Request) {
  const session = await adminSession()
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const body = await request.json().catch(() => null)
  const code = typeof body?.code === "string" ? body.code.trim() : ""
  const user = await prisma.user.findUnique({
    where: { id: Number(session.user.id) },
    select: { mfaEnabled: true, mfaSecret: true },
  })
  if (!user?.mfaEnabled || !user.mfaSecret || !verifyTotp(decryptMfaSecret(user.mfaSecret), code)) {
    return NextResponse.json({ error: "Mã xác thực không hợp lệ." }, { status: 400 })
  }
  await prisma.user.update({
    where: { id: Number(session.user.id) },
    data: { mfaEnabled: false, mfaSecret: null },
  })
  return NextResponse.json({ success: true })
}
