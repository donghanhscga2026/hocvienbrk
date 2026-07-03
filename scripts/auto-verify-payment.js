require('dotenv').config()
const { google } = require('googleapis')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

function extractTextFromHtml(html) {
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

function parseSacombankEmail(htmlContent) {
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
  
  // Extract actual bank transaction time
  let transferTime = null
  const dateMatch = text.match(/(?:Ngày|Date)\s*\/?\s*[Dt]ate\s*[:\t\s]*(\d{2})[\/\-](\d{2})[\/\-](\d{4})\s+(\d{1,2}):(\d{2})/i)
  if (dateMatch) {
    const dd = dateMatch[1], mm = dateMatch[2], yyyy = dateMatch[3], hh = dateMatch[4], min = dateMatch[5]
    transferTime = new Date(`${yyyy}-${mm}-${dd}T${hh.padStart(2, '0')}:${min}:00+07:00`)
  }
  
  return {
    phone: phoneMatch ? phoneMatch[1] : null,
    userId: userIdMatch ? parseInt(userIdMatch[1]) : null,
    courseCode: courseCodeMatch ? courseCodeMatch[1].toUpperCase() : null,
    amount: amount,
    content: description,
    transferTime,
    rawText: text
  }
}

async function getGmailClient() {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    'http://localhost'
  )
  oAuth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN })
  return google.gmail({ version: 'v1', auth: oAuth2Client })
}

async function processBankEmails() {
  const gmail = await getGmailClient()

  // Load tất cả cấu hình auto-verify đang enabled
  const configs = await prisma.autoVerifyConfig.findMany({ where: { enabled: true } })
  if (configs.length === 0) {
    console.log('📝 Không có cấu hình auto-verify nào.')
    return
  }

  // Build query Gmail tổng hợp từ tất cả config
  const emailQueries = configs.map(c => `from:${c.emailFrom} ${c.emailQuery}`).join(' OR ')
  const response = await gmail.users.messages.list({
    userId: 'me',
    q: `(${emailQueries}) is:unread`,
    maxResults: 20
  })

  const messages = response.data.messages || []
  if (messages.length === 0) return;

  console.log(`📧 Phát hiện ${messages.length} email Sacombank mới chưa đọc...`)

  // Lấy enrollment PENDING
  const pendingEnrollments = await prisma.enrollment.findMany({
    where: { status: 'PENDING' },
    include: {
      course: { select: { id_khoa: true, phi_coc: true } },
      user: { select: { name: true, phone: true } }
    }
  })

  if (pendingEnrollments.length === 0) {
      console.log('📝 Không có đăng ký nào đang chờ thanh toán.')
      return;
  }

  for (const msg of messages) {
    const message = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'full' })
    let body = ''
    if (message.data.payload?.body?.data) {
      body = Buffer.from(message.data.payload.body.data, 'base64').toString('utf-8')
    } else if (message.data.payload?.parts) {
      for (const part of message.data.payload.parts) {
        if (part.mimeType === 'text/html' && part.body?.data) {
          body = Buffer.from(part.body.data, 'base64').toString('utf-8')
          break
        }
      }
    }

    const parsed = parseSacombankEmail(body)
    
    for (const enrollment of pendingEnrollments) {
      const userPhone = enrollment.user.phone?.replace(/\D/g, '') || ''
      const emailPhone = parsed.phone || ''
      
      const userIdMatch = parsed.userId && parsed.userId === enrollment.userId
      const phoneMatch = userPhone && emailPhone && userPhone.includes(emailPhone)
      const courseCodeMatch = parsed.courseCode && enrollment.course.id_khoa.toUpperCase().includes(parsed.courseCode)
      const amountMatch = parsed.amount >= enrollment.course.phi_coc
      
      if (((parsed.userId ? userIdMatch : phoneMatch) && courseCodeMatch && amountMatch)) {
        console.log(`✅ Khớp! Đang kích hoạt HV: ${enrollment.user.name} - Khóa: ${enrollment.course.id_khoa}`)
        
        await prisma.payment.update({
          where: { enrollmentId: enrollment.id },
          data: {
            amount: parsed.amount, phone: parsed.phone, content: parsed.content,
            bankName: 'Sacombank', status: 'VERIFIED', verifiedAt: new Date(), verifyMethod: 'AUTO_EMAIL',
            transferTime: parsed.transferTime,
          }
        })

        await prisma.enrollment.update({
          where: { id: enrollment.id },
          data: { status: 'ACTIVE' }
        })

        // [BRK ACTIVATION] Kiểm tra cấu hình BRK của khóa học
        try {
          const brkConfig = await prisma.autoVerifyConfig.findUnique({
            where: { courseId: enrollment.courseId }
          })
          if (brkConfig && brkConfig.enabled && brkConfig.onSystem != null) {
            const { activateBrkMember } = await import('../lib/brk/activation-service')
            await activateBrkMember(enrollment.userId, brkConfig.onSystem)
            console.log(`   🔗 Đã kích hoạt BRK system #${brkConfig.onSystem}`)
          }
        } catch (brkErr) {
          console.error(`   ⚠️ Lỗi kích hoạt BRK:`, brkErr.message || brkErr)
        }

        // Đánh dấu đã đọc
        await gmail.users.messages.modify({
          userId: 'me', id: msg.id,
          requestBody: { removeLabelIds: ['UNREAD'] }
        })
      }
    }
  }
}

processBankEmails()
  .catch(console.error)
  .finally(async () => await prisma.$disconnect())
