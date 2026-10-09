/** Cấu hình riêng của Vercel project; không ghi đè cấu hình dùng chung trong DB. */
export function getDeploymentBrand(env: Record<string, string | undefined> = process.env) {
  if (env.SITE_VARIANT?.trim().toLowerCase() !== 'wi300') return null
  return {
    variant: 'wi300' as const,
    name: env.WI300_NAME?.trim() || 'WI300',
    tagline: env.WI300_TAGLINE?.trim() || 'Liên minh 300 doanh nghiệp số',
    description: env.WI300_DESCRIPTION?.trim() || 'Kết nối tri thức, phát triển năng lực và đồng hành cùng cộng đồng doanh nghiệp số.',
    logoUrl: '/wi300/logo-full.png',
    wordmarkUrl: '/wi300/logo-wordmark.png',
    iconUrl: '/wi300/logo-symbol.png',
    palette: {
      primary: '#2457eb', onPrimary: '#ffffff', accent: '#7534d9',
      background: '#f7f9ff', surface: '#ffffff',
      onSurface: '#111c36', muted: '#52617a', outline: '#dde5f3',
    },
  }
}

export type DeploymentBrand = NonNullable<ReturnType<typeof getDeploymentBrand>>
