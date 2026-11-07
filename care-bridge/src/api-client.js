import { createHmac } from 'node:crypto'
import { config } from './config.js'

/**
 * Client gọi API Care Bridge phía website: mọi yêu cầu đều ký
 * HMAC-SHA256 theo đúng giao thức lib/care/bridge.ts của website —
 * chữ ký = HMAC(secret, "<timestamp-ms>.<raw-body>"), gửi kèm header
 * x-care-timestamp + x-care-signature.
 */
async function signedPost(pathname, payload) {
  const rawBody = JSON.stringify(payload ?? {})
  const timestamp = String(Date.now())
  const signature = createHmac('sha256', config.secret).update(`${timestamp}.${rawBody}`).digest('hex')
  const response = await fetch(`${config.apiBase}${pathname}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-care-timestamp': timestamp,
      'x-care-signature': signature,
    },
    body: rawBody,
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const message = data?.error || `HTTP ${response.status}`
    const error = new Error(`[care-bridge] ${pathname} thất bại: ${message}`)
    error.status = response.status
    error.data = data
    throw error
  }
  return data
}

export const bridgeApi = {
  heartbeat: () => signedPost('/api/care-bridge/heartbeat', { version: `${config.version} · ${config.name}` }),
  claim: (limit) => signedPost('/api/care-bridge/commands/claim', { limit }),
  report: (payload) => signedPost('/api/care-bridge/commands/report', payload),
  inbound: (payload) => signedPost('/api/care-bridge/inbound', payload),
}
