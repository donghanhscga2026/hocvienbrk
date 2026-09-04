// Chặn truy cập vào mạng nội bộ/localhost/metadata endpoint để tránh SSRF khi
// server tự ý fetch() một URL do người dùng cung cấp (link ảnh dán tay, v.v.).
// Dùng chung cho mọi route/hàm cần tải nội dung từ URL bên ngoài.
export function isBlockedHost(hostname: string): boolean {
    const h = hostname.toLowerCase()
    if (h === 'localhost' || h === '127.0.0.1' || h === '::1' || h === '0.0.0.0') return true
    if (h === '169.254.169.254') return true // cloud metadata endpoint
    if (/^10\./.test(h)) return true
    if (/^192\.168\./.test(h)) return true
    if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(h)) return true
    if (/^127\./.test(h)) return true
    return false
}
