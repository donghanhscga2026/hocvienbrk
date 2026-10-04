import { NextRequest, NextResponse } from 'next/server'

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message } = body

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.error('[Telegram API] Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID')
      return NextResponse.json({ error: 'Telegram configuration is missing' }, { status: 500 })
    }

    const targetChatId = TELEGRAM_CHAT_ID

    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: targetChatId,
          text: message,
          parse_mode: 'HTML'
        })
      }
    )

    const result = await response.json()

    if (!result.ok) {
      console.error('[Telegram API] Error:', result)
      return NextResponse.json(
        { error: 'Failed to send message', details: result },
        { status: 500 }
      )
    }

    console.log('[Telegram API] Message sent successfully')
    return NextResponse.json({ success: true, messageId: result.result.message_id })
  } catch (error: any) {
    console.error('[Telegram API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Unknown error' },
      { status: 500 }
    )
  }
}