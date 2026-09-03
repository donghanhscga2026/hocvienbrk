// Chính sách mật khẩu theo hướng NIST SP 800-63B: ưu tiên độ dài thay vì ép buộc
// phối hợp loại ký tự (hoa/thường/số/đặc biệt) — quy tắc phối hợp cũ dễ dẫn tới
// mật khẩu kiểu "Abc123!" vẫn hợp lệ nhưng dễ đoán, trong khi lại gây khó nhớ.
export const PASSWORD_MIN_LENGTH = 10

export const PASSWORD_POLICY_MESSAGE =
    `Mật khẩu cần có ít nhất ${PASSWORD_MIN_LENGTH} ký tự. Nên dùng một cụm dễ nhớ, không cần ký tự đặc biệt.`

export function validatePasswordStrength(password: string): string | null {
    if (password.length < PASSWORD_MIN_LENGTH) return `Mật khẩu phải có ít nhất ${PASSWORD_MIN_LENGTH} ký tự`
    return null
}
