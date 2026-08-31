require('dotenv').config()
const { google } = require('googleapis')

async function checkProfile() {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    'http://localhost'
  )
  oAuth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN })

  const gmail = google.gmail({ version: 'v1', auth: oAuth2Client })

  try {
    // 1. Kiểm tra profile (Địa chỉ email)
    const profile = await gmail.users.getProfile({ userId: 'me' })
    console.log('\n--- THÔNG TIN HỆ THỐNG ---')
    console.log(`📧 Đang kết nối Gmail: ${profile.data.emailAddress}`)
    console.log(`📦 Tổng số tin nhắn: ${profile.data.messagesTotal}`)

    // 2. Tìm kiếm email Sacombank chưa đọc
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: 'sacombank thong bao giao dich is:unread',
      maxResults: 10
    })

    const messages = response.data.messages || []
    console.log(`✉️ Số email Sacombank chưa đọc (unread): ${messages.length}`)
    
    if (messages.length > 0) {
        console.log('\n--- DANH SÁCH EMAIL CHỜ XỬ LÝ ---')
        for (const msg of messages) {
            const message = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'metadata' })
            const subject = message.data.payload.headers.find(h => h.name === 'Subject')?.value
            const date = message.data.payload.headers.find(h => h.name === 'Date')?.value
            console.log(`- ID: ${msg.id} | Ngày: ${date} | Tiêu đề: ${subject}`)
        }
    } else {
        console.log('\n✅ Hiện tại không có email Sacombank nào chưa đọc.')
    }
    console.log('--------------------------')

  } catch (error) {
    console.error('❌ Lỗi kiểm tra:', error.message)
  }
}

checkProfile()
