/** Chỉ đọc cấu hình Vercel project; không thay đổi nhận diện trong database chung. */
function asset(value: string | undefined, fallback: string) {
  const url = value?.trim()
  if (!url) return fallback
  if (url.startsWith('/') && !url.startsWith('//') && !url.includes('\\')) return url
  try { return new URL(url).protocol === 'https:' ? url : fallback } catch { return fallback }
}

export function getDeploymentBrand(env: Record<string, string | undefined> = process.env) {
  if (env.SITE_VARIANT?.trim().toLowerCase() !== 'wi300') return null
  const name = env.WI300_NAME?.trim() || 'WI300'
  const tagline = env.WI300_TAGLINE?.trim() || 'Liên minh 300 doanh nghiệp số'
  const logoUrl = asset(env.WI300_LOGO_URL, '/wi300/wipa-logo.png')
  return {
    variant: 'wi300' as const, name, tagline,
    description: env.WI300_DESCRIPTION?.trim() || 'WI300 — Nền tảng kết nối cá nhân và doanh nghiệp với tri thức, khóa học, sản phẩm, dịch vụ và cơ hội hợp tác từ Liên minh 300 doanh nghiệp số.',
    seoTitle: env.WI300_SEO_TITLE?.trim() || `${name} | ${tagline}`,
    logoUrl, wordmarkUrl: logoUrl,
    iconUrl: asset(env.WI300_FAVICON_URL, '/wi300/wipa-icon.png'),
    ogImageUrl: asset(env.WI300_OG_IMAGE_URL, logoUrl),
    palette: {
      primary: '#af2528', onPrimary: '#ffffff', accent: '#aa913c',
      background: '#fbf8f2', surface: '#ffffff',
      onSurface: '#28241f', muted: '#70685e', outline: '#e8e0d3',
    },
  }
}

export type DeploymentBrand = NonNullable<ReturnType<typeof getDeploymentBrand>>
