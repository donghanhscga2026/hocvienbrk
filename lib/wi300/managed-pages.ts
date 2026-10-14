import { z } from 'zod'
import { contentSeoSchema } from '@/lib/content/seo'
import { safeProjectUrl } from './projects'
import inventory from './page-inventory.json'
const safeUrl = z.string().trim().max(1000).refine(safeProjectUrl, 'Dùng đường dẫn nội bộ hoặc HTTPS hợp lệ.')
export const managedPageSchema = z.object({
  id: z.string().min(1).max(120), slug: z.string().max(120).regex(/^$|^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().trim().min(1).max(300), title: z.string().trim().max(300), description: z.string().trim().max(1500),
  body: z.string().trim().max(30000), imageUrl: safeUrl, layout: z.enum(['stack', 'split']), columns: z.number().int().min(2).max(4),
  showHero: z.boolean(), showContent: z.boolean(), showCTA: z.boolean(), showList: z.boolean().default(true), showForm: z.boolean().default(true), ctaLabel: z.string().trim().max(300), ctaUrl: safeUrl,
  published: z.boolean(), deleted: z.boolean(), inheritRobots: z.boolean(), seo: contentSeoSchema,
}).strict().refine(page => !page.showCTA || !page.ctaLabel || !!page.ctaUrl, 'Nhập đường dẫn cho nút liên kết.')
export type ManagedPage = z.infer<typeof managedPageSchema>
export const SYSTEM_WEBSITE_PAGES = inventory.pages
export const RESERVED_PAGE_SLUGS = inventory.reserved
export function newManagedPage(id: string, slug: string, name: string): ManagedPage {
  return managedPageSchema.parse({ id, slug, name, title: '', description: '', body: '', imageUrl: '', layout: 'stack', columns: 3,
    showHero: true, showContent: true, showCTA: true, ctaLabel: '', ctaUrl: '', published: true, deleted: false, inheritRobots: true, seo: {} })
}
export function pageForUrl(url: string) { return SYSTEM_WEBSITE_PAGES.find(page => page.url === url.split(/[?#]/)[0]) }
export function websiteLinkVisible(url: string, settings?: { hiddenPages: string[]; customPages: ManagedPage[] }) {
  const system = pageForUrl(url)
  if (system && settings?.hiddenPages.includes(system.id)) return false
  const custom = settings?.customPages.find(page => '/' + page.slug === url.split(/[?#]/)[0])
  return !custom || (custom.published && !custom.deleted)
}
