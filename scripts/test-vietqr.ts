require('dotenv').config()

async function testVietQR() {
  console.log('🧪 Test VietQR API...')
  
  const requestBody = {
    accountNo: "1039789789",
    accountName: "NGUYEN VAN A",
    acqId: "970403",
    amount: 500000,
    addInfo: "SDT0389758138MHV123COCNH",
    template: "compact",
    format: "text"
  }

  console.log('Request:', JSON.stringify(requestBody, null, 2))

  try {
    const response = await fetch('https://api.vietqr.io/v2/generate', {
      method: 'POST',
      headers: {
        'x-client-id': process.env.VIETQR_CLIENT_ID || '',
        'x-api-key': process.env.VIETQR_API_KEY || '',
        'Content-Type': 'application/json'
      } as any,
      body: JSON.stringify(requestBody)
    })

    const data = await response.json()
    console.log('Response:', JSON.stringify(data, null, 2))
    
    if (data.code === '00') {
      console.log('✅ QR Generated successfully!')
      console.log('QR Data URL:', data.data?.qrDataURL?.substring(0, 100) + '...')
    } else {
      console.log('❌ Error:', data.desc)
    }
  } catch (error: any) {
    console.error('❌ Request failed:', error.message)
  }
}

testVietQR()
