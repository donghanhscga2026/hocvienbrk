import prisma from '@/lib/prisma'
import { appearanceKey, readAppearance } from '@/lib/wi300/appearance-service'
import { configuredBrand } from '@/lib/wi300/website-config'
import { getCurrentDeploymentBrand } from '@/lib/site-profile/deployment-runtime'
import type { DeploymentBrand } from '@/lib/site-profile/deployment-brand'
import { getSiteRuntimeConfig } from '@/lib/site-profile/config'
import { getCurrentSiteProfile } from '@/lib/site-profile/runtime'

export type PagePresentation = 'wi300' | 'classic'

/**
 * Khóa trang dùng cho quyết định hiển thị. Mỗi trang công khai/cá nhân có
 * một khóa riêng để có thể chọn giao diện cho từng trang.
 */
export type PageKey =
  | 'home'
  | 'courses'
  | 'teachers'
  | 'teacher-detail'
  | 'products'
  | 'services'
  | 'about'
  | 'partners'
  | 'explore'
  | 'projects'
  | 'project-detail'
  | 'project-owner'
  | 'external-apps'
  | 'external-app'
  | 'my-space'

/**
 * Quy tắc phân giải thuần (test gác cổng gọi trực tiếp hàm này):
 * lựa chọn theo từng trang của site (override) thắng mọi mặc định;
 * không có override thì theo deployment — có deployment brand wi300
 * dùng bản wi300, không có dùng bản classic của giautoandien.
 */
export function resolvePagePresentation(
  override: PagePresentation | undefined,
  hasDeploymentBrand: boolean,
): PagePresentation {
  if (override) return override
  return hasDeploymentBrand ? 'wi300' : 'classic'
}

/** Lựa chọn theo từng trang trong siteConfig (ui.pages) của SiteProfile hiện tại. */
async function getSitePageOverride(pageKey: PageKey): Promise<PagePresentation | undefined> {
  try {
    const profile = await getCurrentSiteProfile()
    if (!profile) return undefined
    return getSiteRuntimeConfig(profile).ui.pages[pageKey]
  } catch {
    // Đọc cấu hình site lỗi thì coi như chưa chọn, giữ quy tắc theo deployment.
    return undefined
  }
}

/**
 * Điểm rẽ nhánh hiển thị duy nhất giữa hai giao diện của nền tảng:
 * logic xử lý và dữ liệu dùng chung, phần hiển thị tách riêng.
 *
 * GĐ2: quyết định chỉ dựa vào deployment brand (có brand → 'wi300',
 * không có → 'classic').
 *
 * GĐ3: tra thêm lựa chọn theo từng pageKey trong siteConfig của
 * SiteProfile hiện tại (ui.pages, xem getSiteRuntimeConfig trong
 * config.ts) — site đã chọn rõ 'wi300' hoặc 'classic' cho pageKey đó
 * thì lựa chọn của site thắng deployment brand; chưa chọn thì giữ
 * quy tắc GĐ2. Mặc định không đổi cho mọi site chưa đặt công tắc.
 */
export async function getPagePresentation(pageKey: PageKey): Promise<PagePresentation> {
  const [override, brand] = await Promise.all([
    getSitePageOverride(pageKey),
    getCurrentDeploymentBrand(),
  ])
  return resolvePagePresentation(override, !!brand)
}

/**
 * Dựng brand cho bản wi300 được CHỌN DÙNG theo từng trang trên project
 * không có deployment brand wi300 (ví dụ giautoandien bật bản wi300 cho
 * đúng một trang). Tên và logo lấy từ branding của chính SiteProfile
 * hiện tại — không lấy tên/logo WI300; cấu hình hiển thị đã xuất bản
 * (appearance) đọc cùng nguồn với deployment brand, bảng màu chốt qua
 * configuredBrand như bình thường, riêng tên/logo của profile được giữ
 * nguyên sau bước đó để không lẫn nhận diện của site khác.
 */
async function getOptInBrand(): Promise<DeploymentBrand | null> {
  let profile: Awaited<ReturnType<typeof getCurrentSiteProfile>>
  try {
    profile = await getCurrentSiteProfile()
  } catch {
    return null
  }
  if (!profile) return null
  const config = getSiteRuntimeConfig(profile)
  const name = config.branding.name || profile.title || 'Website'
  const logoUrl = config.branding.logoUrl || ''
  const base: DeploymentBrand = {
    variant: 'wi300',
    name,
    tagline: profile.subtitle || '',
    description: profile.metaDescription || profile.subtitle || '',
    seoTitle: profile.metaTitle || name,
    logoUrl,
    wordmarkUrl: logoUrl,
    iconUrl: config.branding.faviconUrl || '',
    ogImageUrl: profile.metaImage || profile.heroImage || logoUrl,
    palette: {
      primary: '#236c1e', onPrimary: '#ffffff', accent: '#b51a18',
      background: '#f3f7df', surface: '#ffffff',
      onSurface: '#203126', muted: '#58675c', outline: '#dce8d7',
    },
  }
  try {
    const { published } = await readAppearance(prisma, appearanceKey())
    const configured = configuredBrand(base, published)
    return {
      ...configured,
      name,
      logoUrl: logoUrl || configured.logoUrl,
      wordmarkUrl: logoUrl || configured.wordmarkUrl,
      iconUrl: config.branding.faviconUrl || configured.iconUrl,
    }
  } catch {
    return base
  }
}

/**
 * Brand để render nhánh wi300 của một trang: deployment brand nếu có;
 * nếu không có mà trang được chọn dùng bản wi300 qua công tắc ui.pages
 * thì dựng brand chọn-dùng từ SiteProfile hiện tại; trường hợp còn lại
 * (trang đang ở bản classic) trả null như trước.
 *
 * Lưu ý phạm vi: brand này chỉ đổi PHẦN NỘI DUNG trang. Khung shell
 * toàn site (header/footer Wi300Shell, Wi300BrandProvider ở layout)
 * vẫn theo deployment — layout chỉ bọc shell khi có deployment brand.
 */
export async function getPresentationBrand(pageKey: PageKey): Promise<DeploymentBrand | null> {
  if (await getPagePresentation(pageKey) !== 'wi300') return null
  const deployment = await getCurrentDeploymentBrand()
  if (deployment) return deployment
  return getOptInBrand()
}
