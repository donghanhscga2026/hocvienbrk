import prisma from '@/lib/prisma'

export async function logEmail(params: {
  userId?: number
  email: string
  type: string
  provider: string
  status: string
  messageId?: string
  error?: string
}) {
  try {
    await prisma.emailLog.create({ data: params })
  } catch {
    console.error('Failed to log email:', params.email)
  }
}
