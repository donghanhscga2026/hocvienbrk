import { createECDH, createHash } from 'node:crypto'

// Chỉ gửi tới dịch vụ push của trình duyệt, không cho URL tùy ý gọi vào mạng nội bộ.
export function safePushEndpoint(value: string) {
  try {
    const u = new URL(value)
    const host = u.hostname.toLowerCase()
    return u.protocol === 'https:' && !u.username && !u.password && (!u.port || u.port === '443') && !u.hash
      && (host === 'fcm.googleapis.com' || host === 'updates.push.services.mozilla.com' || host === 'web.push.apple.com'
        || host.endsWith('.notify.windows.com'))
  } catch { return false }
}
export function pushEndpointId(endpoint: string) { return createHash('sha256').update(endpoint).digest('hex') }
export function requestPushOrigin(request: Request) {
  const u = new URL(request.url)
  return new URL(u.protocol + '//' + (request.headers.get('host') || u.host)).origin
}
export function pushConfig(origin?: string) {
  const publicKey = process.env.WEB_PUSH_VAPID_PUBLIC_KEY?.trim()
  const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY?.trim()
  const subject = process.env.WEB_PUSH_VAPID_SUBJECT?.trim()
  const origins = (process.env.WEB_PUSH_ORIGINS || '').split(',').map(v => v.trim()).filter(Boolean)
  if (!origin || !origins.includes(origin) || !publicKey || !privateKey || !subject) return null
  try {
    const u = new URL(origin)
    if (u.origin !== origin || (u.protocol !== 'https:' && !(u.protocol === 'http:' && u.hostname === 'localhost'))) return null
    if (!/^mailto:[^\s@]+@[^\s@]+$/.test(subject) && !/^https:\/\//.test(subject)) return null
    const pair = createECDH('prime256v1')
    pair.setPrivateKey(Buffer.from(privateKey,'base64url'))
    if (pair.getPublicKey().toString('base64url') !== publicKey) return null
    return { publicKey, privateKey, subject }
  } catch { return null }
}
