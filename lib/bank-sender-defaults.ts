// Bản đồ email người gửi đã xác minh thực tế → dùng khi tự tạo AutoVerifyConfig
// cho khóa học mới. Ngân hàng chưa có trong bản đồ → tạo config TẮT,
// admin điền tay sau khi thấy email thật.
// (Tách ra khỏi app/actions/auto-verify-actions.ts vì file 'use server'
// không được export hàm/hằng không phải async.)
export const KNOWN_BANK_SENDERS: Record<string, { emailFrom: string; emailQuery: string }> = {
  SACOMBANK: { emailFrom: 'info@sacombank.com.vn', emailQuery: '"thong bao giao dich"' },
}

export interface BankSenderDefaults {
  emailFrom: string
  emailQuery: string
  bankName: string
  enabled: boolean
}

export function getBankSenderDefaults(bankName: string | null | undefined): BankSenderDefaults {
  const normalized = (bankName || '').toUpperCase()
  const sender = KNOWN_BANK_SENDERS[normalized]
  if (sender) {
    return { emailFrom: sender.emailFrom, emailQuery: sender.emailQuery, bankName: bankName || '', enabled: true }
  }
  return { emailFrom: '', emailQuery: '', bankName: bankName || '', enabled: false }
}
