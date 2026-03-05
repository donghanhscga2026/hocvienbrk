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
  
  // Tìm nội dung chuyển khoản
  const contentMatch = text.match(/(?:Description|Nội dung)[\s\/]*(.+?)(?=\s{2,}|$)/i)
  const description = contentMatch ? contentMatch[1].trim() : ''
  
  // Format: SDT 123456 HV 8286 COC LS03
  const phoneMatch = description.match(/SDT[\s\._]*(\d{6})/i)
  const userIdMatch = description.match(/HV[\s\._]*(\d+)/i)
  const courseCodeMatch = description.match(/COC[\s\._]*(\w+)/i)
  
  // Tìm số tiền - format: 386,868 VND
  const amountMatch = text.match(/(?:Transaction|Phát sinh)[\s:+]*([\d,\.]+)\s*VND/i)
  
  let amount = 0
  if (amountMatch) {
    const amountStr = amountMatch[1].replace(/\./g, '').replace(/,/g, '')
    amount = parseInt(amountStr) || 0
  }
  
  return {
    phone: phoneMatch ? phoneMatch[1] : null,
    userId: userIdMatch ? parseInt(userIdMatch[1]) : null,
    courseCode: courseCodeMatch ? courseCodeMatch[1].toUpperCase() : null,
    amount: amount,
    content: description,
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

  // Tìm email Sacombank TRƯA ĐỌC trong 7 ngày gần nhất
  const response = await gmail.users.messages.list({
    userId: 'me',
    q: 'sacombank thong bao giao dich is:unread',
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
            bankName: 'Sacombank', status: 'VERIFIED', verifiedAt: new Date(), verifyMethod: 'AUTO_EMAIL'
          }
        })

        await prisma.enrollment.update({
          where: { id: enrollment.id },
          data: { status: 'ACTIVE' }
        })

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
