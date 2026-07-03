import { google } from 'googleapis'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function extractTextFromHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseSacombankEmail(htmlContent: string) {
  const text = extractTextFromHtml(htmlContent)

  const contentMatch = text.match(/(?:Description|Nội dung)[\s\/]*(.+?)(?=\s{2,}|$)/i)
  const description = contentMatch ? contentMatch[1].trim() : ''

  const phoneMatch = description.match(/SDT[\s\._]*(\d{6})/i)
  const userIdMatch = description.match(/HV[\s\._]*(\d+)/i)
  const courseCodeMatch = description.match(/COC[\s\._]*(\w+)/i)
  const amountMatch = text.match(/(?:Transaction|Phát sinh)[\s:+]*([\d,\.]+)\s*VND/i)

  let amount = 0
  if (amountMatch) {
    const amountStr = amountMatch[1].replace(/\./g, '').replace(/,/g, '')
    amount = parseInt(amountStr) || 0
  }

  let transferTime: Date | null = null
  const dateMatch = text.match(/(?:Ngày|Date)\s*\/?\s*[Dt]ate\s*[:\t\s]*(\d{2})[\/\-](\d{2})[\/\-](\d{4})\s+(\d{1,2}):(\d{2})/i)
  if (dateMatch) {
    const [, dd, mm, yyyy, hh, min] = dateMatch
    transferTime = new Date(`${yyyy}-${mm}-${dd}T${hh.padStart(2, '0')}:${min}:00+07:00`)
  }

  return {
    phone: phoneMatch ? phoneMatch[1] : null,
    userId: userIdMatch ? parseInt(userIdMatch[1]) : null,
    courseCode: courseCodeMatch ? courseCodeMatch[1].toUpperCase() : null,
    amount,
    transferTime,
    description,
  }
}

async function main() {
  console.log('🔍 Scanning Sacombank emails for transferTime backfill...')

  const oAuth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    'http://localhost'
  )
  oAuth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN })
  const gmail = google.gmail({ version: 'v1', auth: oAuth2Client })

  // Get all ACTIVE enrollment records for course 22
  const enrollments = await prisma.enrollment.findMany({
    where: { courseId: 22, status: 'ACTIVE' },
    include: {
      payment: { select: { id: true, transferTime: true } },
      course: { select: { id_khoa: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  console.log(`📋 Found ${enrollments.length} enrollments to check.`)

  // Search ALL Sacombank emails from the last 7 days (not just unread)
  const response = await gmail.users.messages.list({
    userId: 'me',
    q: 'from:info@sacombank.com.vn "thong bao giao dich"',
    maxResults: 100,
  })

  const messages = response.data.messages || []
  console.log(`📧 Found ${messages.length} Sacombank emails.`)

  let updatedCount = 0
  let matchedCount = 0

  for (const msg of messages) {
    const message = await gmail.users.messages.get({
      userId: 'me',
      id: msg.id || '',
      format: 'full',
    })

    let body = ''
    const payload = message.data.payload
    if (payload?.body?.data) {
      body = Buffer.from(payload.body.data, 'base64').toString('utf-8')
    } else if (payload?.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/html' && part.body?.data) {
          body = Buffer.from(part.body.data, 'base64').toString('utf-8')
          break
        }
      }
    }

    if (!body) continue

    const parsed = parseSacombankEmail(body)
    if (!parsed.userId) {
      console.log(`  ⚠️  No userId found in email`)
      continue
    }
    if (!parsed.transferTime) {
      console.log(`  ⚠️  No transferTime found for uid=${parsed.userId}`)
      continue
    }

    // Try to match against the 22 enrollments by userId
    const match = enrollments.find(e => e.userId === parsed.userId)
    if (!match) {
      console.log(`  ⚠️  uid=${parsed.userId} not in our 22 courses`)
      continue
    }

    matchedCount++

    // Update only if transferTime is currently NULL
    if (!match.payment?.transferTime) {
      await prisma.payment.update({
        where: { id: match.payment!.id },
        data: { transferTime: parsed.transferTime },
      })
      console.log(`  ✅ user#${parsed.userId} → transferTime=${parsed.transferTime.toISOString()}`)
      updatedCount++
    } else {
      console.log(`  ⏭ user#${parsed.userId} → already has transferTime, skip`)
    }
  }

  console.log(`\n🎉 Done! Matched: ${matchedCount}, Updated: ${updatedCount}`)
}

main()
  .catch(e => { console.error('Fatal:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
