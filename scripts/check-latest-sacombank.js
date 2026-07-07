require('dotenv').config()
const { google } = require('googleapis')

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
  
  let phone = null
  const phoneMatch = description.match(/SDT[\s\._]*(\d{6,11})/i)
  if (phoneMatch) {
    phone = phoneMatch[1]
  } else {
    // Fallback: Tìm số điện thoại di động Việt Nam dạng 9-11 chữ số
    const mobileMatch = description.match(/\b(0\d{9,10}|[1-9]\d{8,9})\b/)
    if (mobileMatch) {
      phone = mobileMatch[1]
    }
  }

  let userId = null
  const userIdMatch = description.match(/HV[\s\._]*(\d+)/i)
  if (userIdMatch) {
    userId = parseInt(userIdMatch[1])
  }

  let courseCode = null
  const courseCodeMatch = description.match(/COC[\s\._]*(\w+)/i)
  if (courseCodeMatch) {
    courseCode = courseCodeMatch[1].toUpperCase()
  } else {
    // Fallback: Tự động phát hiện mã hệ thống MB hoặc BRK
    if (/BRK/i.test(description)) {
      courseCode = 'BRK'
    } else if (/MB/i.test(description)) {
      courseCode = 'MB'
    }
  }

  const amountMatch = text.match(/(?:Transaction|Phát sinh)[\s:+]*([\d,\.]+)\s*VND/i)
  
  let amount = 0
  if (amountMatch) {
    const amountStr = amountMatch[1].replace(/\./g, '').replace(/,/g, '')
    amount = parseInt(amountStr) || 0
  }
  
  return {
    phone,
    userId,
    courseCode,
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

  oAuth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN
  })

  return google.gmail({ version: 'v1', auth: oAuth2Client })
}

async function checkLatestEmail() {
  console.log('🔍 Đang kiểm tra email Sacombank mới nhất...')

  const gmail = await getGmailClient()
  const response = await gmail.users.messages.list({
    userId: 'me',
    q: 'sacombank thong bao giao dịch',
    maxResults: 1
  })

  const messages = response.data.messages || []
  if (messages.length === 0) {
    console.log('❌ Không tìm thấy email Sacombank nào.')
    return
  }

  const msgId = messages[0].id
  const message = await gmail.users.messages.get({
    userId: 'me',
    id: msgId,
    format: 'full'
  })

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
  console.log('\n--- KẾT QUẢ TRÍCH XUẤT ---')
  console.log(`Email ID: ${msgId}`)
  console.log(`Nội dung chuyển khoản (Gốc): ${parsed.content}`)
  console.log(`SĐT (6 số cuối): ${parsed.phone || 'Không tìm thấy'}`)
  console.log(`Mã học viên (HV): ${parsed.userId || 'Không tìm thấy'}`)
  console.log(`Mã khóa học (COC): ${parsed.courseCode || 'Không tìm thấy'}`)
  console.log(`Số tiền: ${parsed.amount.toLocaleString()} VND`)
  console.log('--------------------------')
}

checkLatestEmail().catch(console.error)
