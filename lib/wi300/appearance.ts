import { z } from 'zod'
import type { CSSProperties } from 'react'
import { safeProjectUrl } from './projects'
import { managedPageSchema, RESERVED_PAGE_SLUGS } from './managed-pages'

const text = z.string().trim().min(1).max(300)
const description = z.string().trim().max(1500)
const url = z.string().trim().max(1000).refine(safeProjectUrl, 'Dùng đường dẫn nội bộ hoặc https:// hợp lệ.')
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Màu cần có dạng #236c1e.')
const cta = z.object({ title: text, description, label: text, url: url.refine(Boolean, 'Nhập đường dẫn cho nút.') }).strict()
const teachingCTA = { title: 'Bạn muốn chia sẻ chuyên môn?', description: 'Đồng hành cùng Wi để lan tỏa kiến thức và tạo giá trị cho cộng đồng', label: 'Đăng ký làm giảng viên', url: '/doi-tac' }
const optionalText = z.string().trim().max(300)
const footerLink = z.object({ label: text, url: url.refine(Boolean, 'Nhập đường dẫn liên kết.') }).strict()
export const defaultFooter = {
  logoUrl: '', description: 'Kết nối cá nhân và doanh nghiệp với tri thức, các giá trị và cơ hội hợp tác trong hệ sinh thái Wi.',
  note: '300DNS là dự án của WIPA. Các dự án thuộc 300DNS được WIPA cố vấn.', contact: '',
  copyright: '', socials: [] as { label: string; url: string }[],
  groups: [
    { title: 'Khám phá', links: [{ label: 'Các dự án Wi', url: '/du-an' }, { label: 'Khóa học', url: '/khoa-hoc' }, { label: 'Sản phẩm', url: '/san-pham' }, { label: 'Dịch vụ', url: '/dich-vu' }, { label: 'Giới thiệu WI300', url: '/gioi-thieu' }] },
    { title: 'Không gian của bạn', links: [{ label: 'Không gian của tôi', url: '/my-space' }, { label: 'Học tập của tôi', url: '/my-space?tab=learning' }, { label: 'Tài khoản', url: '/account-settings' }] },
  ],
}
const footerSchema = z.object({ logoUrl: url, description, note: description, contact: description, copyright: optionalText,
  socials: z.array(footerLink).max(8), groups: z.array(z.object({ title: text, links: z.array(footerLink).max(12) }).strict()).max(4),
}).strict()
export const defaultHeaderMenu = [
  { label: 'Trang chủ', url: '/', visible: true },
  { label: 'Khóa học', url: '/khoa-hoc', visible: true },
  { label: 'Sản phẩm', url: '/san-pham', visible: true },
  { label: 'Dịch vụ', url: '/dich-vu', visible: true },
]
const headerMenuSchema = z.array(z.object({ label: text, url: url.refine(Boolean, 'Nhập đường dẫn menu.'), visible: z.boolean() }).strict()).max(12).refine(items => new Set(items.map(item => item.url)).size === items.length, 'Đường dẫn menu trùng nhau.')
export const defaultPageSeo = { title: '', description: '', imageUrl: '', keywords: '', inheritRobots: true, index: true, follow: true }
const pageSeoSchema = z.object({ title: z.string().trim().max(160), description: z.string().trim().max(500), imageUrl: url, keywords: optionalText, inheritRobots: z.boolean(), index: z.boolean(), follow: z.boolean() }).strict().default(() => ({ ...defaultPageSeo }))
export const HOME_SECTIONS = ['hero', 'discovery', 'projects', 'start'] as const
export const homeSectionLabels = { hero: 'Hero', discovery: 'Bạn đang tìm gì?', projects: 'Khám phá hệ sinh thái Wi', start: 'Bắt đầu cùng Wi' }
export const appearanceSchema = z.object({
  hiddenPages: z.array(z.string().min(1).max(120)).max(100).default([]),
  pageContent: z.record(z.string().min(1).max(120), managedPageSchema).default({}),
  customPages: z.array(managedPageSchema).max(50).default([]).refine(pages => pages.every(page => !!page.slug && !RESERVED_PAGE_SLUGS.includes(page.slug)) && new Set(pages.map(page => page.slug)).size === pages.length && new Set(pages.map(page => page.id)).size === pages.length, 'Đường dẫn trang bị trùng hoặc thuộc trang hệ thống.'),
  common: z.object({ name: optionalText.default(''), tagline: optionalText.default(''), logoUrl: url, iconUrl: url, primary: color, accent: color, background: color, foreground: color, width: z.enum(['1120', '1280', '1440']), radius: z.enum(['small', 'medium', 'round']), font: z.enum(['vietnam', 'system']), stickyHeader: z.boolean(), showFooter: z.boolean() }).strict(),
  // Giá trị mặc định giúp đọc nguyên vẹn các bản cấu hình cũ đã mã hóa.
  seo: z.object({ title: z.string().trim().max(160), description: z.string().trim().max(500), imageUrl: url, keywords: optionalText, index: z.boolean(), follow: z.boolean() }).strict().default({ title: '', description: '', imageUrl: '', keywords: '', index: true, follow: true }),
  footer: footerSchema.default(defaultFooter),
  headerMenu: headerMenuSchema.default(() => structuredClone(defaultHeaderMenu)),
  pageSeo: z.object({ home: pageSeoSchema, courses: pageSeoSchema, projects: pageSeoSchema, teachers: pageSeoSchema }).strict().default(() => ({ home: { ...defaultPageSeo }, courses: { ...defaultPageSeo }, projects: { ...defaultPageSeo }, teachers: { ...defaultPageSeo } })),
  home: z.object({ title: text, description, imageUrl: url, primaryLabel: text, primaryUrl: url.refine(Boolean), secondaryLabel: text, secondaryUrl: url.refine(Boolean), sections: z.object({ hero: z.boolean(), discovery: z.boolean(), projects: z.boolean(), start: z.boolean() }).strict(), order: z.array(z.enum(HOME_SECTIONS)).length(4).refine(values => new Set(values).size === 4, 'Mỗi mục chỉ được xuất hiện một lần.'), projectLimit: z.number().int().min(1).max(40) }).strict(),
  courses: z.object({ title: text, description, showHero: z.boolean().default(true), heroVariant: z.enum(['minimal', 'illustrated', 'bold']).default('illustrated'), heroImageUrl: url.default(''), heroLabel: text.default('Khám phá khóa học'), heroUrl: url.refine(Boolean, 'Nhập đường dẫn nút hero.').default('/khoa-hoc#khoa-hoc'), columns: z.number().int().min(2).max(4), showSearch: z.boolean(), showCategories: z.boolean(), showFee: z.boolean(), showTeachers: z.boolean(), teacherTotal: z.number().int().min(1).max(50), teacherPerView: z.number().int().min(3).max(5), teacherLayout: z.enum(['grid', 'slide']), autoplay: z.boolean(), interval: z.number().int().min(3).max(20), arrows: z.boolean(), showCTA: z.boolean(), cta }).strict(),
  projects: z.object({ title: text, description, imageUrl: url, layout: z.enum(['vertical', 'horizontal']), columns: z.number().int().min(2).max(4), showHero: z.boolean(), showSearch: z.boolean(), showFilter: z.boolean(), showCounts: z.boolean(), showCTA: z.boolean(), cta }).strict(),
  teachers: z.object({ title: text, description, imageUrl: url, columns: z.number().int().min(3).max(5), showHero: z.boolean(), showSearch: z.boolean(), showFields: z.boolean(), showCTA: z.boolean(), cta }).strict(),
}).strict()
export type WiAppearance = z.infer<typeof appearanceSchema>
export const defaultAppearance: WiAppearance = appearanceSchema.parse({
  common: { logoUrl: '', iconUrl: '', primary: '#236c1e', accent: '#b51a18', background: '#f3f7df', foreground: '#203126', width: '1280', radius: 'medium', font: 'vietnam', stickyHeader: true, showFooter: true },
  home: { title: 'Kết nối con người.\nLan tỏa giá trị.', description: 'Wi300 kết nối cá nhân và doanh nghiệp với tri thức, sản phẩm, dịch vụ và cơ hội hợp tác trong hệ sinh thái Wi.', imageUrl: '', primaryLabel: 'Khám phá khóa học', primaryUrl: '/khoa-hoc', secondaryLabel: 'Khám phá hệ sinh thái', secondaryUrl: '/#du-an-wi', sections: { hero: true, discovery: true, projects: true, start: true }, order: [...HOME_SECTIONS], projectLimit: 8 },
  courses: { title: 'Khóa học', description: 'Tìm kiến thức và kỹ năng cho bước tiến tiếp theo.', columns: 3, showSearch: true, showCategories: true, showFee: true, showTeachers: true, teacherTotal: 20, teacherPerView: 5, teacherLayout: 'slide', autoplay: true, interval: 5, arrows: true, showCTA: true, cta: teachingCTA },
  projects: { title: 'Các dự án Wi', description: 'Khám phá dự án, khóa học, sản phẩm và dịch vụ trong hệ sinh thái Wi.', imageUrl: '', layout: 'vertical', columns: 4, showHero: true, showSearch: true, showFilter: true, showCounts: true, showCTA: true, cta: { title: 'Cùng kết nối, cùng phát triển', description: 'Tham gia hệ sinh thái Wi để lan tỏa tri thức, kết nối cộng đồng và kiến tạo giá trị bền vững.', label: 'Đồng hành cùng Wi', url: '/doi-tac' } },
  teachers: { title: 'Đội ngũ giảng viên', description: 'Gặp gỡ những người chia sẻ tri thức trong hệ sinh thái Wi.', imageUrl: '', columns: 5, showHero: true, showSearch: true, showFields: true, showCTA: true, cta: teachingCTA },
})
export function appearanceStyle(settings: WiAppearance): CSSProperties {
  const c = settings.common
  return { '--color-primary': c.primary, '--color-accent': c.accent, '--color-background': c.background, '--color-on-surface': c.foreground, '--color-surface': '#ffffff', '--color-on-primary': '#ffffff', '--color-muted': '#58675c', '--color-outline': '#dce8d7', '--wi300-content-width': `${c.width}px`, '--wi300-radius': { small: '0.5rem', medium: '1rem', round: '1.5rem' }[c.radius], '--wi300-font': c.font === 'system' ? 'ui-sans-serif, system-ui, sans-serif' : 'var(--font-be-vietnam-pro), ui-sans-serif, system-ui, sans-serif' } as CSSProperties
}
// Chỉ dùng các lớp tĩnh để Tailwind tạo đủ CSS cho tất cả lựa chọn.
export const gridColumns: Record<number, string> = { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-2 lg:grid-cols-3', 4: 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4', 5: 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5' }
export const slideColumns: Record<number, string> = { 3: 'sm:basis-[calc((100%-20px)/2)] lg:basis-[calc((100%-40px)/3)]', 4: 'sm:basis-[calc((100%-20px)/2)] lg:basis-[calc((100%-60px)/4)]', 5: 'sm:basis-[calc((100%-20px)/2)] lg:basis-[calc((100%-40px)/3)] xl:basis-[calc((100%-80px)/5)]' }
