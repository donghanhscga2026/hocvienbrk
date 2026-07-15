export interface VietQRRequest {
  accountNo: string
  accountName: string
  acqId: string
  amount: number
  addInfo: string
  template?: string
  format?: string
}

export interface VietQRResponse {
  code: string
  desc: string
  data: {
    qrCode: string
    qrDataURL: string
  }
}

export function generateTransferContent(options: {
  phone: string
  userId: number
  courseCode: string
}): string {
  // Format: SDT [phone_cuoi] HV [id] COC [code]
  const { phone, userId, courseCode } = options
  const cleanPhone = phone.replace(/\D/g, '').slice(-6)
  const content = `SDT ${cleanPhone} HV ${userId} COC ${courseCode}`.toUpperCase()
  return content.slice(0, 50) // Tăng giới hạn ký tự lên 50 vì có khoảng cách
}

export async function generateVietQR(options: {
  accountNo: string
  accountName: string
  acqId: string
  amount: number
  addInfo: string
}): Promise<{ qrCode: string; qrDataURL: string }> {
  const { resolveBankBin } = await import('@/lib/bank-bin')
  const bankId = resolveBankBin(options.acqId)
  
  const requestBody: VietQRRequest = {
    accountNo: options.accountNo,
    accountName: options.accountName.toUpperCase().replace(/[^A-Z ]/g, '').replace(/\s+/g, ' '),
    acqId: bankId,
    amount: options.amount,
    addInfo: options.addInfo,
    template: 'qr_only',
    format: 'text'
  }

  const response = await fetch('https://api.vietqr.io/v2/generate', {
    method: 'POST',
    headers: {
      'x-client-id': process.env.VIETQR_CLIENT_ID || '',
      'x-api-key': process.env.VIETQR_API_KEY || '',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`VietQR API error: ${response.status} - ${errorText}`)
  }

  const data: VietQRResponse = await response.json()

  if (data.code !== '00') {
    throw new Error(`VietQR error: ${data.desc}`)
  }

  return {
    qrCode: data.data.qrCode,
    qrDataURL: data.data.qrDataURL
  }
}

export async function createPaymentQR(options: {
  phone: string
  userId: number
  courseId: number
  courseCode: string
  accountNo: string
  accountName: string
  acqId: string // Thêm acqId
  amount: number
}): Promise<{
  transferContent: string
  qrCodeUrl: string
}> {
  const transferContent = generateTransferContent({
    phone: options.phone,
    userId: options.userId,
    courseCode: options.courseCode
  })

  const qrResult = await generateVietQR({
    accountNo: options.accountNo,
    accountName: options.accountName,
    acqId: options.acqId, // Truyền acqId vào
    amount: options.amount,
    addInfo: transferContent
  })

  return {
    transferContent,
    qrCodeUrl: qrResult.qrDataURL
  }
}
