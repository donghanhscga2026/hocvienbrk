import { NextRequest, NextResponse } from 'next/server'

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8630082731:AAENKynjPOEAK_ZKQE35hwbeEoBgx14TiQ0'
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '5185829656'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, chatId } = body

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const targetChatId = chatId || TELEGRAM_CHAT_ID

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