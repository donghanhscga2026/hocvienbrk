import prisma from '@/lib/prisma'
import nextConfig from '../../next.config'
import { appFrameKey, extendFramePolicy, isAppFrameDocument } from './app-frame-domains'
import { readAppFrameSettings } from './app-frame-settings'

let cached: { key: string; until: number; origins: string[] } | null = null
export async function appFrameResponse<T extends Response>(response: T, path: string): Promise<T> {
  if (
    process.env.SITE_VARIANT?.trim().toLowerCase() !== 'wi300' ||
    !isAppFrameDocument(path) ||
    response.status >= 300
  )
    return response
  let origins: string[] = []
  const key = appFrameKey()
  try {
    if (cached?.key === key && Date.now() < cached.until) origins = cached.origins
    else {
      origins = (await readAppFrameSettings(prisma, key)).origins
      cached = { key, until: Date.now() + 30_000, origins }
    }
  } catch {
    cached = null
  } // Khi lỗi đọc, giữ chính sách cố định thay vì mở rộng tùy ý.
  const rules = await nextConfig.headers!()
  const defaults = rules.find((rule) => rule.source === '/:path*')!.headers
  for (const name of ['Content-Security-Policy', 'Content-Security-Policy-Report-Only']) {
    const policy = defaults.find((header) => header.key === name)!.value
    response.headers.set(name, extendFramePolicy(policy, origins))
  }
  // Proxy đặt policy ở mỗi request trước cache; không thay cache của trang công khai.
  if (path.startsWith('/tools/') || path.endsWith('/su-dung'))
    response.headers.set('Cache-Control', 'private, no-store')
  return response
}
