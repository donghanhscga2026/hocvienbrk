// Dữ liệu cấu trúc Organization + WebSite cho trang gốc. Nội dung lấy từ
// cấu hình thương hiệu/hồ sơ đang chạy của đúng tên miền hiện tại — sameAs
// chỉ gồm liên kết ngoài (https) mà quản trị viên đã khai trong cấu hình
// footer, không suy đoán thêm bất kỳ kênh mạng xã hội nào.

export interface SiteIdentity {
  name: string
  url: string
  description?: string
  logoUrl?: string
  sameAs?: string[]
}

function absoluteUrl(base: string, value?: string): string | undefined {
  if (!value) return undefined
  try {
    return new URL(value, base).toString()
  } catch {
    return undefined
  }
}

/** Trích các URL https từ mảng liên kết footer dạng { label, url }. */
export function externalUrls(links: unknown): string[] {
  if (!Array.isArray(links)) return []
  const urls = links
    .map((link) =>
      link && typeof link === 'object' ? (link as { url?: unknown }).url : undefined,
    )
    .filter((url): url is string => typeof url === 'string' && /^https:\/\//i.test(url))
  return [...new Set(urls)]
}

export function siteJsonLd({ name, url, description, logoUrl, sameAs }: SiteIdentity) {
  const base = url.endsWith('/') ? url : `${url}/`
  const organization: Record<string, unknown> = {
    '@type': 'Organization',
    '@id': `${base}#organization`,
    name,
    url: base,
  }
  if (description) organization.description = description
  const logo = absoluteUrl(base, logoUrl)
  if (logo) organization.logo = logo
  const links = [...new Set((sameAs ?? []).filter((link) => /^https:\/\//i.test(link)))]
  if (links.length) organization.sameAs = links
  const website: Record<string, unknown> = {
    '@type': 'WebSite',
    '@id': `${base}#website`,
    url: base,
    name,
    inLanguage: 'vi-VN',
    publisher: { '@id': `${base}#organization` },
  }
  return { '@context': 'https://schema.org', '@graph': [organization, website] }
}
