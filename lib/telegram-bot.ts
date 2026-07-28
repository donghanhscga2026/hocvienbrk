import prisma from './prisma'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''

interface PendingOTP {
  email: string
  createdAt: number
}

const pendingConfirmations = new Map<number, PendingOTP>()

export function setPendingConfirmation(chatId: number, email: string) {
  pendingConfirmations.set(chatId, { email, createdAt: Date.now() })
}

export function getPendingConfirmation(chatId: number): PendingOTP | undefined {
  const pending = pendingConfirmations.get(chatId)
  if (!pending) return undefined
  if (Date.now() - pending.createdAt > 5 * 60 * 1000) {
    pendingConfirmations.delete(chatId)
    return undefined
  }
  return pending
}

export function clearPendingConfirmation(chatId: number) {
  pendingConfirmations.delete(chatId)
}

export async function sendTelegramMessage(chatId: number, text: string) {
  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    })
    if (!res.ok) {
      console.error('❌ Telegram sendMessage error:', await res.text())
    }
    return res.json()
  } catch (error) {
    console.error('❌ Telegram sendMessage network error:', error)
    return null
  }
}

export function parseBotCommand(text: string): { command: string; payload: string } | null {
  const startMatch = text.match(/^\/start\s+(.+)/)
  if (startMatch) {
    const payload = startMatch[1]
    if (payload.startsWith('otp_')) {
      return { command: 'otp', payload: payload.slice(4) }
    }
    return { command: 'start', payload }
  }

  const cmdMatch = text.match(/^\/(\w+)\s*(.*)/)
  if (cmdMatch) {
    return { command: cmdMatch[1], payload: cmdMatch[2].trim() }
  }
  return null
}

/**
 * Gửi tin nhắn Telegram cá nhân cho học viên dựa trên userId
 */
export async function sendTelegramToUser(userId: number, text: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { telegramChatId: true }
    })

    if (!user || !user.telegramChatId) {
      console.warn(`⚠️ sendTelegramToUser: Không tìm thấy Chat ID liên kết cho User ID: ${userId}`)
      return false
    }

    const result = await sendTelegramMessage(Number(user.telegramChatId), text)
    return !!result
  } catch (error) {
    console.error(`❌ sendTelegramToUser error for User ID ${userId}:`, error)
    return false
  }
}

/**
 * Thực hiện liên kết tài khoản Telegram của học viên qua token dùng một lần
 */
export async function linkTelegramAccount(
  tokenStr: string,
  chatInfo: { chatId: number; telegramUserId: number; username?: string }
): Promise<{ success: boolean; userId?: number; error?: string }> {
  try {
    // 1. Kiểm tra tính hợp lệ của token
    const dbToken = await prisma.telegramLinkToken.findUnique({
      where: { token: tokenStr }
    })

    if (!dbToken) {
      return { success: false, error: 'Mã liên kết không tồn tại.' }
    }

    if (dbToken.usedAt) {
      return { success: false, error: 'Mã liên kết này đã được sử dụng trước đó.' }
    }

    if (new Date() > dbToken.expiresAt) {
      return { success: false, error: 'Mã liên kết đã hết hạn (hiệu lực 15 phút).' }
    }

    // 2. Cập nhật thông tin User & Invalidate token trong Transaction
    const result = await prisma.$transaction(async (tx) => {
      // Cập nhật User
      const updatedUser = await tx.user.update({
        where: { id: dbToken.userId },
        data: {
          telegramChatId: chatInfo.chatId,
          telegramUserId: chatInfo.telegramUserId,
          telegramUsername: chatInfo.username || null,
          telegramConnectedAt: new Date()
        }
      })

      // Đánh dấu Token đã dùng
      await tx.telegramLinkToken.update({
        where: { id: dbToken.id },
        data: { usedAt: new Date() }
      })

      return updatedUser
    })

    return { success: true, userId: result.id }
  } catch (error: any) {
    console.error('❌ linkTelegramAccount error:', error)
    return { success: false, error: error.message || 'Lỗi hệ thống khi liên kết.' }
  }
}
