import { getCurrentDeploymentBrand } from '@/lib/site-profile/deployment-runtime'

export type PagePresentation = 'wi300' | 'classic'

/**
 * Khóa trang dùng cho quyết định hiển thị. Mỗi trang công khai/cá nhân có
 * một khóa riêng để GĐ3 có thể chọn giao diện cho từng trang.
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
 * Điểm rẽ nhánh hiển thị duy nhất giữa hai giao diện của nền tảng:
 * logic xử lý và dữ liệu dùng chung, phần hiển thị tách riêng —
 * bản wi300 chỉ chạy trên bản triển khai có deployment brand wi300,
 * bản classic của giautoandien là mặc định ở mọi nơi còn lại.
 *
 * GĐ2: quyết định chỉ dựa vào deployment brand (có brand → 'wi300',
 * không có → 'classic').
 *
 * ĐIỂM NỐI GĐ3 (chưa cài đặt ở GĐ2): tại đây sẽ tra thêm lựa chọn theo
 * từng pageKey trong siteConfig của SiteProfile hiện tại
 * (getCurrentSiteProfile + getSiteRuntimeConfig) — khi site đã chọn rõ
 * 'wi300' hoặc 'classic' cho pageKey đó thì lựa chọn của site thắng
 * deployment brand; chưa chọn thì giữ quy tắc GĐ2 ở trên.
 */
export async function getPagePresentation(pageKey: PageKey): Promise<PagePresentation> {
  void pageKey // GĐ3 sẽ dùng pageKey để tra siteConfig override theo từng trang.
  const brand = await getCurrentDeploymentBrand()
  return brand ? 'wi300' : 'classic'
}
