/** Chỉ đổi cách trình bày; không đổi mã nghiệp vụ hoặc giá trị trong sổ cái. */
export function walletText(value: string, wi300: boolean) {
  if (!wi300 || !value) return value
  return value.replace(/\bMFC\b/g, 'Wi300').replace(/\bMBDT\b/g, 'Wi Đối ứng').replace(/\bMBV\b/g, 'Voucher Wi')
}

export function walletMoney(value: number, wi300: boolean) {
  return wi300 ? `${value.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} VNĐ` : `$${value.toFixed(2)}`
}

export function walletTransactionAmount(value: number, balanceType: string | undefined, wi300: boolean) {
  if (wi300 && balanceType === 'BRKD') return `${value.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} Wi Đối ứng`
  if (wi300 && (balanceType === 'MBV' || balanceType === 'VOUCHER')) return `${walletMoney(value, true)} (${balanceType === 'MBV' ? 'Voucher Wi' : 'Giá trị voucher'})`
  return walletMoney(value, wi300)
}
