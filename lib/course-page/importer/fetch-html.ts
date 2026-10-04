import { promises as dns } from 'dns'
import { isBlockedHost } from '@/lib/security/url-safety'

const MAX_REDIRECTS = 4
const MAX_HTML_BYTES = 5 * 1024 * 1024
const FETCH_TIMEOUT_MS = 10_000

function isPrivateIp(address: string): boolean {
  const ip = address.toLowerCase()
  if (ip === '::1' || ip === '0:0:0:0:0:0:0:1') return true
  if (ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe80:')) return true
  if (/^127\./.test(ip) || /^10\./.test(ip) || /^192\.168\./.test(ip)) return true
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return true
  if (/^169\.254\./.test(ip)) return true
  if (/^0\./.test(ip)) return true
  return false
}

async function assertSafeUrl(value: string): Promise<URL> {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error('URL không hợp lệ')
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Chỉ hỗ trợ URL http/https')
  }
  if (url.username || url.password) {
    throw new Error('URL không được chứa thông tin đăng nhập')
  }
  if (isBlockedHost(url.hostname)) {
    throw new Error('Không thể truy cập địa chỉ nội bộ')
  }

  const addresses = await dns.lookup(url.hostname, { all: true })
  if (!addresses.length || addresses.some(item => isPrivateIp(item.address))) {
    throw new Error('URL trỏ tới địa chỉ mạng không được phép')
  }

  return url
}

async function readLimitedText(response: Response): Promise<string> {
  const contentLength = Number(response.headers.get('content-length') || 0)
  if (contentLength > MAX_HTML_BYTES) {
    throw new Error('Trang HTML vượt quá giới hạn 5MB')
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  if (buffer.byteLength > MAX_HTML_BYTES) {
    throw new Error('Trang HTML vượt quá giới hạn 5MB')
  }
  return buffer.toString('utf8')
}

export async function fetchRemoteHtml(inputUrl: string) {
  let current = await assertSafeUrl(inputUrl.trim())

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount++) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    let response: Response

    try {
      response = await fetch(current, {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'user-agent': 'MFC-Salespage-Importer/1.0',
          accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.1',
        },
      })
    } catch (error: any) {
      if (error?.name === 'AbortError') throw new Error('Trang nguồn phản hồi quá chậm')
      throw new Error('Không thể tải trang nguồn')
    } finally {
      clearTimeout(timeout)
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      if (!location) throw new Error('Trang nguồn chuyển hướng không hợp lệ')
      if (redirectCount === MAX_REDIRECTS) throw new Error('Trang nguồn chuyển hướng quá nhiều lần')
      current = await assertSafeUrl(new URL(location, current).toString())
      continue
    }

    if (!response.ok) {
      throw new Error(`Không thể tải trang nguồn (HTTP ${response.status})`)
    }

    const contentType = (response.headers.get('content-type') || '').toLowerCase()
    if (contentType && !contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      throw new Error('URL không trả về tài liệu HTML')
    }

    const html = await readLimitedText(response)
    return { html, finalUrl: current.toString() }
  }

  throw new Error('Không thể tải trang nguồn')
}
