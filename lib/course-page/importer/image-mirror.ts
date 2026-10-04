import { resolveImageUrl } from '@/lib/image-utils'
import type { WebsiteTemplateAnalysis } from './types'

type MirrorOptions = {
  sectionIds?: string[]
  dataOnly?: boolean
  failOnEmbeddedData?: boolean
}

function replaceStrings(value: unknown, replacements: Map<string, string>): unknown {
  if (typeof value === 'string') return replacements.get(value) || value
  if (Array.isArray(value)) return value.map(item => replaceStrings(item, replacements))
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        replaceStrings(item, replacements),
      ]),
    )
  }
  return value
}

export async function mirrorAnalysisImages(
  analysis: WebsiteTemplateAnalysis,
  options: MirrorOptions = {},
): Promise<WebsiteTemplateAnalysis> {
  const selected = options.sectionIds ? new Set(options.sectionIds) : null
  const candidates = analysis.sections
    .filter(section => !selected || selected.has(section.id))
    .flatMap(section => section.images || [])
    .map(image => image.src)
    .filter(Boolean)
    .filter(src => options.dataOnly ? /^data:image\//i.test(src) : /^(?:https?:\/\/|data:image\/)/i.test(src))

  const urls = Array.from(new Set(candidates)).slice(0, 60)
  if (!urls.length) return JSON.parse(JSON.stringify(analysis))

  const replacements = new Map<string, string>()
  for (let i = 0; i < urls.length; i += 4) {
    const batch = urls.slice(i, i + 4)
    const resolved = await Promise.all(
      batch.map(url => resolveImageUrl(url, 'course-templates')),
    )
    batch.forEach((url, index) => {
      const stored = resolved[index]
      if (stored && stored !== url) replacements.set(url, stored)
    })
  }

  const mirrored = replaceStrings(
    JSON.parse(JSON.stringify(analysis)),
    replacements,
  ) as WebsiteTemplateAnalysis

  if (options.failOnEmbeddedData) {
    const unresolved = mirrored.sections
      .flatMap(section => section.images || [])
      .filter(image => /^data:image\//i.test(image.src))
    if (unresolved.length) {
      throw new Error('Không thể lưu một số ảnh nhúng vào kho ảnh. Vui lòng thử lại hoặc kiểm tra cấu hình Supabase Storage.')
    }
  }

  return mirrored
}
