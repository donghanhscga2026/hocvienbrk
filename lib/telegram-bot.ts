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
