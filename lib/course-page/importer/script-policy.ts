// Thư viện trình bày được chạy trong iframe có origin riêng, không có quyền truy cập tài khoản.
export const SOURCE_SCRIPT_ORIGINS = ['https://cdnjs.cloudflare.com', 'https://cdn.jsdelivr.net', 'https://unpkg.com'] as const
export const SOURCE_SCRIPT_CSP = "'unsafe-inline' " + SOURCE_SCRIPT_ORIGINS.join(' ')
export function allowedSourceScript(value: string) {
  try {
    const url = new URL(value)
    return !url.username && !url.password && SOURCE_SCRIPT_ORIGINS.some(origin => url.origin === origin)
  } catch { return false }
}
