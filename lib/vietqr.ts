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

// VietinBank qua SePay (kết nối API Banking) CHỈ nhận thông báo biến động
// số dư khi nội dung chuyển khoản BẮT ĐẦU bằng từ khóa "SEVQR" — SePay cảnh
// báo việc này ngay trong trang tài khoản ngân hàng VietinBank trên
// my.sepay.vn. Nội dung chuẩn của hệ thống bắt đầu bằng "SDT ..." nên với
// TK nhận là VietinBank phải thêm tiền tố "SEVQR ", nếu không SePay không
// hề nhìn thấy giao dịch và không có webhook nào được gửi về (đã xảy ra
// thực tế với các khóa của GV dùng VietinBank, 10/2026).
// Bộ khớp giao dịch (webhook SePay + parser email Gmail) đều dùng regex
// không neo đầu câu nên tiền tố này không ảnh hưởng việc đối soát.
export function isVietinBank(bankName?: string | null): boolean {
  if (!bankName) return false
  const n = bankName.toLowerCase()
  return n.includes('vietinbank') || n.includes('công thương') || n.includes('cong thuong') || n.includes('970415')
}

export function generateTransferContent(options: {
  phone: string | null | undefined
  userId: number | null | undefined
  courseCode: string
  bankName?: string | null // Ngân hàng của TK NHẬN tiền — VietinBank thì thêm tiền tố SEVQR
}): string {
  // Format: SDT [phone_cuoi] HV [id] COC [code]
  // Các tham số nhận cả null/undefined và chuẩn hóa tại đây: nhiều điểm gọi
  // (popup thanh toán phía client) giữ phone/userId ở dạng nullable theo
  // trạng thái đăng nhập — gom nới kiểu về một chỗ này để mọi điểm gọi an
  // toàn type. userId null chỉ xảy ra ở nội dung hiển thị dự phòng khi chưa
  // có payment thật; nội dung chuẩn luôn do server sinh khi đã có user.
  const { phone, userId, courseCode, bankName } = options
  const cleanPhone = (phone || '').replace(/\D/g, '').slice(-6)
  const base = `SDT ${cleanPhone} HV ${userId ?? 0} COC ${courseCode}`.toUpperCase()
  const content = isVietinBank(bankName) ? `SEVQR ${base}` : base
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

  // [OPTIMIZE] Gọi trực tiếp trong luồng đăng ký khoá học của học viên — nếu
  // VietQR chậm/treo, request trước đây sẽ treo vô thời hạn theo. Giới hạn 10s.
  let response: Response
  try {
    response = await fetch('https://api.vietqr.io/v2/generate', {
      method: 'POST',
      headers: {
        'x-client-id': process.env.VIETQR_CLIENT_ID || '',
        'x-api-key': process.env.VIETQR_API_KEY || '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(10_000)
    })
  } catch (err: any) {
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
      throw new Error('Không tạo được mã QR: VietQR phản hồi quá chậm, vui lòng thử lại.')
    }
    throw err
  }

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
    courseCode: options.courseCode,
    bankName: options.acqId // acqId ở đây mang tên ngân hàng của TK nhận (caller truyền bankName)
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
