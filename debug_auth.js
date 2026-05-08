const { google } = require('googleapis');
require('dotenv').config();

async function checkAuth() {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    'http://localhost'
  );
  
  oAuth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });

  try {
    console.log('--- ĐANG KIỂM TRA XÁC THỰC GOOGLE ---');
    console.log('Client ID:', process.env.GMAIL_CLIENT_ID ? 'Đã có' : 'Trống');
    console.log('Client Secret:', process.env.GMAIL_CLIENT_SECRET ? 'Đã có' : 'Trống');
    console.log('Refresh Token:', process.env.GMAIL_REFRESH_TOKEN ? 'Đã có' : 'Trống');
    
    const { token } = await oAuth2Client.getAccessToken();
    console.log('✅ THÀNH CÔNG! Đã lấy được Access Token mới.');
  } catch (error) {
    console.error('❌ THẤT BẠI KHI LẤY ACCESS TOKEN:', error.message);
    if (error.response) {
      console.error('Phản hồi từ Google:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

checkAuth();
