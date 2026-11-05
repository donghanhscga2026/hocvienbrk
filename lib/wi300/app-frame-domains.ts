export const builtInAppOrigins = [
  'https://cleanimage.vercel.app',
  'https://cleanimage.witech.io.vn',
  'https://digital-biz-scan.lovable.app',
]
export function appFrameOrigin(raw: string): string {
  const input = raw.trim()
  if (!input || input.startsWith('/') || /[\s\\*;'"<>]/.test(input))
    throw new Error('Nhập tên miền hoặc link HTTPS hợp lệ, không dùng ký tự đại diện.')
  let url: URL
  try {
    url = new URL(input.includes('://') ? input : `https://${input}`)
  } catch {
    throw new Error('Tên miền không hợp lệ.')
  }
  const host = url.hostname
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.port ||
    host.length > 253 ||
    !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(host) ||
    /\.(local|internal|localhost|test|invalid)$/.test(host)
  )
    throw new Error('Chỉ dùng tên miền HTTPS công khai, không kèm tài khoản hoặc cổng riêng.')
  return url.origin
}
export function appFrameKey(env: Record<string, string | undefined> = process.env) {
  const base = `wi300:app-frames:v1:${encodeURIComponent(env.SITE_PROFILE_KEY?.trim() || 'default')}`
  return env.VERCEL_ENV === 'preview'
    ? `${base}:preview:${encodeURIComponent(env.VERCEL_GIT_COMMIT_REF || 'preview')}`
    : base
}
export function extendFramePolicy(policy: string, origins: string[]) {
  const safe = [...new Set(origins.map(appFrameOrigin))]
  return policy
    .split(';')
    .map((part) =>
      part.trim().startsWith('frame-src ') ? `${part.trim()} ${safe.join(' ')}`.trim() : part.trim(),
    )
    .join('; ')
}
export function isAppFrameDocument(path: string) {
  return (
    !/^\/(?:api|_next)(?:\/|$)/.test(path) && !/\.[a-z0-9]+$/i.test(path) && !path.startsWith('/.well-known/')
  )
}
