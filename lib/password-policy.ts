export const PASSWORD_POLICY_MESSAGE =
    "Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt"

export function validatePasswordStrength(password: string): string | null {
    if (password.length < 8) return "Mật khẩu phải có ít nhất 8 ký tự"
    if (!/[A-Z]/.test(password)) return "Mật khẩu phải chứa ít nhất một chữ hoa"
    if (!/[a-z]/.test(password)) return "Mật khẩu phải chứa ít nhất một chữ thường"
    if (!/[0-9]/.test(password)) return "Mật khẩu phải chứa ít nhất một chữ số"
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return "Mật khẩu phải chứa ít nhất một ký tự đặc biệt"
    return null
}
