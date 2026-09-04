/**
 * retroactive-telegram-activation.ts
 *
 * Gửi bù Telegram notification cho enrollment courseId=22 đã ACTIVE
 * nhưng chưa có thông báo trong group Telegram (dựa vào file export chat).
 *
 * Cách chạy:
 *   npx tsx scripts/retroactive-telegram-activation.ts                          → Dry-run
 *   npx tsx scripts/retroactive-telegram-activation.ts --execute                → Gửi thực tế
 *   npx tsx scripts/retroactive-telegram-activation.ts --chat path/to/file.json → Dùng file chat khác
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import * as readline from 'readline'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()
const COURSE_ID = 22
const BATCH_SIZE = 5
const DELAY_MS = 2000
const DEFAULT_CHAT_FILE = 'C:/Users/ADMIN/Desktop/HocVien-BRK/plan_temp/telegram_chat_export.json'

interface TelegramMessage {
  id: number
  type: string
  date: string
  text: string | any[]
}

interface ChatExport {
  messages: TelegramMessage[]
}

function getChatFilePath(): string {
  const idx = process.argv.indexOf('--chat')
  if (idx !== -1 && idx + 1 < process.argv.length) {
    return process.argv[idx + 1]
  }
  return DEFAULT_CHAT_FILE
}

function extractUserIdFromText(text: string): number | null {
  const match = text.match(/\(#(\d+)\)/)
  return match ? parseInt(match[1], 10) : null
}

function isActivationMessage(text: string): boolean {
  const activationKeywords = [
    'KÍCH HOẠT MIỄN PHÍ',
    'KÍCH HOẠT KHÓA HỌC THÀNH CÔNG',
    'KÍCH HOẠT THỦ CÔNG THÀNH CÔNG',
  ]
  return activationKeywords.some(k => text.includes(k))
}

function parseText(obj: any): string {
  if (typeof obj === 'string') return obj
  if (Array.isArray(obj)) {
    return obj.map(part => {
      if (typeof part === 'string') return part
      if (part && part.text) return part.text
      return ''
    }).join('')
  }
  return ''
}

function loadChatExport(filePath: string): ChatExport {
  const raw = fs.readFileSync(filePath, 'utf-8')
  return JSON.parse(raw)
}

function extractNotifiedUserIds(chat: ChatExport): Set<number> {
  const userIds = new Set<number>()
  for (const msg of chat.messages) {
    if (msg.type !== 'message') continue
    const text = parseText(msg.text)
    if (!isActivationMessage(text)) continue
    const userId = extractUserIdFromText(text)
    if (userId !== null) {
      userIds.add(userId)
    }
  }
  return userIds
}

async function askConfirmation(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => {
    rl.question(`\n⚠️  ${question} (y/N): `, answer => {
      rl.close()
      resolve(answer.toLowerCase() === 'y')
    })
  })
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString('vi-VN') + 'đ'
}

async function main() {
  const isExecute = process.argv.includes('--execute')
  const autoYes = process.argv.includes('--yes')
  const chatFilePath = getChatFilePath()

  console.log('╔══════════════════════════════════════════════════════════════╗')
  console.log('║  RETROACTIVE TELEGRAM — KÍCH HOẠT KHÓA HỌC                ║')
  console.log('║  Chỉ: courseId = 22 + đối chiếu chat Telegram              ║')
  console.log('╠══════════════════════════════════════════════════════════════╣')
  console.log(`║  Mode: ${isExecute ? '🔴 EXECUTE (GỬI THẬT)              ' : '🟢 DRY-RUN (CHỈ XEM)               '}║`)
  console.log(`║  Chat: ${chatFilePath.padEnd(48)}║`)
  console.log('╚══════════════════════════════════════════════════════════════╝')

  if (!fs.existsSync(chatFilePath)) {
    console.error(`❌ Không tìm thấy file chat: ${chatFilePath}`)
    console.error(`   Đặt file result.json vào plan_temp/telegram_chat_export.json`)
    console.error(`   Hoặc dùng: --chat "C:/path/to/result.json"`)
    await prisma.$disconnect()
    return
  }

  // ── 1. Load chat export ──
  console.log('\n📖 Đang đọc file chat Telegram...')
  const chat = loadChatExport(chatFilePath)
  console.log(`   Tổng tin nhắn: ${chat.messages.length}`)

  const notifiedUserIds = extractNotifiedUserIds(chat)
  console.log(`   Số user đã có thông báo kích hoạt trong group: ${notifiedUserIds.size}`)

  // ── 2. Query enrollments ──
  console.log('\n📊 Đang truy vấn enrollment courseId=22...')
  const allEnrollments = await prisma.enrollment.findMany({
    where: { status: 'ACTIVE', courseId: COURSE_ID },
    include: {
      user: { select: { id: true, name: true, phone: true } },
      course: { select: { id: true, id_khoa: true, name_lop: true, type: true, phi_coc: true } },
      payment: { select: { amount: true, bankName: true, status: true, verifiedAt: true } },
      referrer: { select: { id: true, name: true, affiliateCode: true } },
    },
    orderBy: { activatedAt: 'asc' },
  })
  console.log(`   Tổng enrollment ACTIVE course 22: ${allEnrollments.length}`)

  // ── 3. Filter out already notified ──
  const alreadySentFile = path.join(__dirname, '.retroactive_sent.json')
  let alreadySentIds: number[] = []
  try {
    if (fs.existsSync(alreadySentFile)) {
      alreadySentIds = JSON.parse(fs.readFileSync(alreadySentFile, 'utf-8'))
      console.log(`   📝 Đã gửi trước đó (resume): ${alreadySentIds.length}`)
    }
  } catch {}

  const alreadySent = new Set(alreadySentIds)
  const toNotify = allEnrollments.filter(e => !notifiedUserIds.has(e.user.id) && !alreadySent.has(e.id))
  console.log(`   ✅ Đã có thông báo: ${allEnrollments.length - toNotify.length}`)
  console.log(`   ❌ Thiếu thông báo (cần gửi): ${toNotify.length}`)

  if (toNotify.length === 0) {
    console.log('\n✅ Tất cả enrollment course 22 đều đã có thông báo trong group Telegram.')
    await prisma.$disconnect()
    return
  }

  // ── 4. Show sample ──
  if (!isExecute) {
    console.log(`\n📋 ${Math.min(10, toNotify.length)} mẫu đầu tiên (thiếu thông báo):`)
    console.log('─'.repeat(70))
    for (let i = 0; i < Math.min(10, toNotify.length); i++) {
      const e = toNotify[i]
      const isFree = e.course.phi_coc === 0
      const hasPayment = e.payment?.status === 'VERIFIED'
      console.log(`  #${i + 1} | Enrollment #${e.id} | User #${e.user.id} ${e.user.name || 'N/A'}`)
      console.log(`      Khóa: ${e.course.name_lop} (${e.course.id_khoa}) | Loại: ${isFree ? 'MIỄN PHÍ' : (hasPayment ? 'CÓ THANH TOÁN' : 'KHÁC')}`)
      console.log(`      Kích hoạt: ${e.activatedAt?.toLocaleString('vi-VN') || 'N/A'} | SĐT: ${e.user.phone || 'N/A'}`)
      if (hasPayment && e.payment) {
        console.log(`      Thanh toán: ${formatCurrency(e.payment.amount)} | ${e.payment.bankName || 'N/A'}`)
      }
      console.log('')
    }
    if (toNotify.length > 10) {
      console.log(`  ... và ${toNotify.length - 10} enrollment khác`)
    }

    const proceed = autoYes || await askConfirmation(`Gửi ${toNotify.length} notification qua Telegram? (thêm --execute để chạy thật)`)
    if (!proceed) {
      console.log('🛑 Đã huỷ.')
      await prisma.$disconnect()
      return
    }
    console.log('\nℹ️  Vui lòng chạy lại với flag --execute để thực hiện gửi.')
    await prisma.$disconnect()
    return
  }

  // ── 5. EXECUTE MODE ──
  const confirmed = autoYes || await askConfirmation(`Bạn có chắc muốn gửi ${toNotify.length} notification qua Telegram?`)
  if (!confirmed) {
    console.log('🛑 Đã huỷ.')
    await prisma.$disconnect()
    return
  }

  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID_ACTIVATE || process.env.TELEGRAM_CHAT_ID_MFC_LOG || process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) {
    console.error('❌ Thiếu TELEGRAM_BOT_TOKEN hoặc TELEGRAM_CHAT_ID env vars')
    await prisma.$disconnect()
    return
  }

  let sent = 0
  let failed = 0
  const total = toNotify.length

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://giautoandien.io.vn'

  const referrerIds = [...new Set(toNotify.map(e => e.referrer?.id).filter(Boolean))] as number[]
  const affiliateRefs = referrerIds.length > 0
    ? await prisma.affiliateRef.findMany({ where: { userId: { in: referrerIds }, isActive: true } })
    : []
  const refMap = new Map(affiliateRefs.map(r => [r.userId, r.refKey || String(r.userId)]))

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = toNotify.slice(i, i + BATCH_SIZE)

    for (const e of batch) {
      try {
        const isFree = e.course.phi_coc === 0
        const hasPayment = e.payment?.status === 'VERIFIED'
        const refCode = e.referrer ? refMap.get(e.referrer.id) || String(e.referrer.id) : null
        const refLink = refCode ? `🔗 Link ref: ${appUrl}/khoa-hoc/${e.course.id_khoa}?ref=${refCode}\n` : ''

        const formatTime = (d: Date | null | undefined) =>
          d ? d.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : 'N/A'

        let msg = ''
        if (isFree) {
          msg = `🎁 <b>KÍCH HOẠT MIỄN PHÍ</b>\n\n` +
            `👤 Học viên: <b>${e.user.name || 'N/A'}</b> (#${e.user.id})\n` +
            `📞 SĐT: ${e.user.phone || 'N/A'}\n` +
            `🎓 Khóa học: <b>${e.course.name_lop} (${e.course.id_khoa})</b>\n` +
            `${refLink}📅 Thời gian: ${formatTime(e.activatedAt)}`
        } else if (hasPayment && e.payment) {
          msg = `✅ <b>KÍCH HOẠT KHÓA HỌC THÀNH CÔNG</b>\n\n` +
            `👤 Học viên: <b>${e.user.name || 'N/A'}</b> (#${e.user.id})\n` +
            `📞 SĐT: ${e.user.phone || 'N/A'}\n` +
            `🎓 Khóa học: <b>${e.course.name_lop} (${e.course.id_khoa})</b>\n` +
            `${refLink}💰 Số tiền: ${formatCurrency(e.payment.amount)}\n` +
            `🏦 Ngân hàng: ${e.payment.bankName || 'N/A'}\n` +
            `📅 Kích hoạt: ${formatTime(e.activatedAt)}`
        } else {
          msg = `✅ <b>KÍCH HOẠT KHÓA HỌC</b>\n\n` +
            `👤 Học viên: <b>${e.user.name || 'N/A'}</b> (#${e.user.id})\n` +
            `📞 SĐT: ${e.user.phone || 'N/A'}\n` +
            `🎓 Khóa học: <b>${e.course.name_lop} (${e.course.id_khoa})</b>\n` +
            `${refLink}📅 Kích hoạt: ${formatTime(e.activatedAt)}`
        }

        // Retry up to 3 times on 429
        let lastErr: string | null = null
        for (let attempt = 0; attempt < 3; attempt++) {
          if (attempt > 0) {
            const wait = 5 * 1000
            process.stdout.write(`   ⏳ Retry #${e.id} after ${wait}ms...\n`)
            await new Promise(r => setTimeout(r, wait))
          }

          const url = `https://api.telegram.org/bot${token}/sendMessage`
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: msg,
              parse_mode: 'HTML',
              disable_web_page_preview: true,
            }),
          })

          if (res.ok) {
            sent++
            process.stdout.write(`✅ [#${e.id} User#${e.user.id} ${e.user.name || ''}] — OK (${sent}/${total})\n`)
            alreadySentIds.push(e.id)
            fs.writeFileSync(alreadySentFile, JSON.stringify(alreadySentIds))
            lastErr = null
            break
          }

          const errText = await res.text()
          if (res.status === 429) {
            let retryAfter = 5
            try {
              const parsed = JSON.parse(errText)
              retryAfter = parsed.parameters?.retry_after || 5
            } catch {}
            process.stdout.write(`   ⏳ Rate limit, đợi ${retryAfter}s...\n`)
            await new Promise(r => setTimeout(r, retryAfter * 1000))
            lastErr = errText
            continue
          }

          lastErr = errText
          break
        }

        if (lastErr) {
          console.error(`❌ [#${e.id} User#${e.user.id}] Failed after retries: ${lastErr}`)
          failed++
        }
      } catch (err) {
        console.error(`❌ [#${e.id} User#${e.user.id}] Network error:`, err)
        failed++
      }
    }

    if (i + BATCH_SIZE < total) {
      console.log(`⏳ Đã gửi ${Math.min(i + BATCH_SIZE, total)}/${total}... Nghỉ ${DELAY_MS}ms tránh rate limit`)
      await new Promise(r => setTimeout(r, DELAY_MS))
    }
  }

  console.log('\n' + '═'.repeat(50))
  console.log(`📊 KẾT QUẢ:`)
  console.log(`   ✅ Thành công: ${sent}`)
  console.log(`   ❌ Thất bại: ${failed}`)
  console.log(`   📝 Tổng: ${total}`)
  console.log('═'.repeat(50))

  await prisma.$disconnect()
}

main().catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})