import { parsePhoneNumberFromString } from 'libphonenumber-js'

// Đọc định danh từ tài khoản gốc; không nhân bản email/điện thoại vào hồ sơ chăm sóc.
export const studentUserSelect = { id: true, name: true, email: true, phone: true } as const
export function studentIdentity(user: { email: string; phone: string | null }) {
  const phone = user.phone ? parsePhoneNumberFromString(user.phone, 'VN') : null
  return { email: user.email.trim().toLowerCase(), phone: phone?.isValid() ? phone.number : null }
}
export function projectStudent<T extends { email: string | null; phone: string | null; studentProfile: boolean; studentUser: { email: string; phone: string | null } | null }>(contact: T) {
  const { studentUser, ...data } = contact
  return contact.studentProfile && studentUser ? { ...data, ...studentIdentity(studentUser) } : data
}
