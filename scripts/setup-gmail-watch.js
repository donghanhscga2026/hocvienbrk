require('dotenv').config()
const { google } = require('googleapis')

async function setupWatch() {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    'http://localhost'
  )
  oAuth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN })

  const gmail = google.gmail({ version: 'v1', auth: oAuth2Client })

  try {
    const response = await gmail.users.watch({
      userId: 'me',
      requestBody: {
        // Thay 'projects/YOUR_PROJECT_ID/topics/gmail-notifications' 
        // bằng đúng Project ID và Topic Name của bạn trên Google Console
        topicName: `projects/${process.env.GCP_PROJECT_ID}/topics/gmail-notifications`,
        labelIds: ['INBOX'], // Chỉ theo dõi hộp thư đến
      },
    })
    console.log('✅ Chế độ Gmail Watch đã được kích hoạt thành công!')
    console.log('Thông tin phản hồi:', response.data)
  } catch (error) {
    console.error('❌ Lỗi khi thiết lập Watch:', error)
  }
}

setupWatch()
