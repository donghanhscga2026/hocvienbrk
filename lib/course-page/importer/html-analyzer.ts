import {
  ImportedAction,
  ImportedCard,
  ImportedImage,
  ImportedSectionCandidate,
  ImportedSectionType,
  WebsiteTemplateAnalysis,
} from './types'

const MAX_SECTIONS = 80
const MAX_TEXT_ITEMS = 120
const MAX_IMAGES_PER_SECTION = 40

function decodeHtml(value: string): string {
  const named: Record<string, string> = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
    ndash: '–', mdash: '—', hellip: '…',
  }
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (all, name) => named[name.toLowerCase()] ?? all)
}

function cleanText(html: string): string {
  return decodeHtml(
    html
      .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
      .replace(/<!--([\s\S]*?)-->/g, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/[\t\r ]+/g, ' ')
    .replace(/\n\s*/g, '\n')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function attr(attrs: string, name: string): string | undefined {
  const match = attrs.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>]+))`, 'i'))
  return decodeHtml(match?.[1] ?? match?.[2] ?? match?.[3] ?? '').trim() || undefined
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items))
}

function resolveAssetUrl(value: string | undefined, baseUrl?: string): string | undefined {
  if (!value) return undefined
  const v = value.trim()
  if (!v || v.startsWith('javascript:')) return undefined
  if (v.startsWith('data:image/')) return v
  if (/^(https?:)?\/\//i.test(v)) {
    try { return new URL(v, baseUrl).toString() } catch { return v }
  }
  if (!baseUrl) return v
  try { return new URL(v, baseUrl).toString() } catch { return v }
}

function extractTagTexts(html: string, tag: string): string[] {
  const out: string[] = []
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi')
  let match: RegExpExecArray | null
  while ((match = re.exec(html)) && out.length < MAX_TEXT_ITEMS) {
    const text = cleanText(match[1])
    if (text) out.push(text)
  }
  return out
}

function extractHeading(html: string): string | undefined {
  const match = html.match(/<h[1-3]\b[^>]*>([\s\S]*?)<\/h[1-3]>/i)
  return match ? cleanText(match[1]) || undefined : undefined
}

function extractImages(html: string, baseUrl?: string): ImportedImage[] {
  const images: ImportedImage[] = []
  const re = /<img\b([^>]*)>/gi
  let match: RegExpExecArray | null
  while ((match = re.exec(html)) && images.length < MAX_IMAGES_PER_SECTION) {
    const attrs = match[1]
    const src = resolveAssetUrl(attr(attrs, 'src') || attr(attrs, 'data-src'), baseUrl)
    if (!src) continue
    const alt = attr(attrs, 'alt')
    const className = attr(attrs, 'class')
    const ariaHidden = attr(attrs, 'aria-hidden')
    const decorative = ariaHidden === 'true'
      || /(?:^|\s)(?:leaf-ic|deco|clover)(?:\s|$)/i.test(className || '')
    const brand = !decorative && (
      /(?:logo|brand)/i.test(className || '')
      || /^(?:wipa|wi\s*grow|logo)/i.test(alt || '')
    )
    images.push({
      src,
      alt,
      className,
      role: decorative ? 'decorative' : brand ? 'brand' : 'content',
    })
  }
  return images
}

function extractCards(html: string, baseUrl?: string): ImportedCard[] {
  const cards: ImportedCard[] = []
  const re = /<article\b[^>]*>([\s\S]*?)<\/article>/gi
  let match: RegExpExecArray | null
  while ((match = re.exec(html)) && cards.length < 30) {
    const body = match[1]
    const heading = body.match(/<h[2-4]\b[^>]*>([\s\S]*?)<\/h[2-4]>/i)
    const subtitle = body.match(/<(?:small|span)\b[^>]*class\s*=\s*(?:"[^"]*(?:role|badge|tag|sub)[^"]*"|'[^']*(?:role|badge|tag|sub)[^']*')[^>]*>([\s\S]*?)<\/(?:small|span)>/i)
    const paragraphs = extractTagTexts(body, 'p')
    const image = extractImages(body, baseUrl)[0]
    const title = heading ? cleanText(heading[1]) : undefined
    let residual = body
    if (heading?.[0]) residual = residual.replace(heading[0], ' ')
    if (subtitle?.[0]) residual = residual.replace(subtitle[0], ' ')
    residual = residual.replace(/<img\b[^>]*>/gi, ' ').replace(/<svg\b[\s\S]*?<\/svg>/gi, ' ')
    const residualText = cleanText(residual)
    const text = paragraphs.join('\n').trim() || residualText || undefined
    if (title || text || image) {
      cards.push({
        title,
        subtitle: subtitle ? cleanText(subtitle[1]) : undefined,
        text,
        image,
      })
    }
  }
  return cards
}

function extractTableRows(html: string): string[] {
  const rows: string[] = []
  const re = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi
  let match: RegExpExecArray | null
  while ((match = re.exec(html)) && rows.length < 40) {
    const cells = extractTagTexts(match[1], 'th').concat(extractTagTexts(match[1], 'td'))
    const text = cells.join(' — ').trim()
    if (text) rows.push(text)
  }
  return rows
}

function extractActions(html: string, baseUrl?: string): ImportedAction[] {
  const actions: ImportedAction[] = []
  const linkRe = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi
  let match: RegExpExecArray | null
  while ((match = linkRe.exec(html)) && actions.length < 30) {
    const label = cleanText(match[2])
    if (!label) continue
    const rawHref = attr(match[1], 'href')
    let href = rawHref
    if (rawHref && !rawHref.startsWith('#')) {
      const resolved = resolveAssetUrl(rawHref, baseUrl)
      try {
        const resolvedUrl = resolved ? new URL(resolved) : null
        const base = baseUrl ? new URL(baseUrl) : null
        href = resolvedUrl && base && resolvedUrl.origin === base.origin && resolvedUrl.pathname === base.pathname && resolvedUrl.hash
          ? resolvedUrl.hash
          : resolved
      } catch {
        href = resolved
      }
    }
    actions.push({
      label,
      href,
      kind: 'link',
    })
  }
  const buttonRe = /<button\b[^>]*>([\s\S]*?)<\/button>/gi
  while ((match = buttonRe.exec(html)) && actions.length < 30) {
    const label = cleanText(match[1])
    if (label) actions.push({ label, kind: 'button' })
  }
  return actions
}

function extractFaq(html: string) {
  const items: Array<{ question: string; answer: string }> = []
  const re = /<details\b[^>]*>([\s\S]*?)<\/details>/gi
  let match: RegExpExecArray | null
  while ((match = re.exec(html)) && items.length < 40) {
    const summary = match[1].match(/<summary\b[^>]*>([\s\S]*?)<\/summary>/i)
    const question = summary ? cleanText(summary[1]) : ''
    const body = summary ? match[1].replace(summary[0], '') : match[1]
    const answer = cleanText(body)
    if (question || answer) items.push({ question, answer })
  }
  return items
}

function extractFormFields(html: string) {
  const fields: Array<{ name?: string; type?: string; placeholder?: string }> = []
  const re = /<(input|textarea|select)\b([^>]*)>/gi
  let match: RegExpExecArray | null
  while ((match = re.exec(html)) && fields.length < 40) {
    const attrs = match[2]
    const type = match[1].toLowerCase() === 'input' ? attr(attrs, 'type') || 'text' : match[1].toLowerCase()
    if (type === 'hidden' || type === 'submit') continue
    fields.push({ name: attr(attrs, 'name'), type, placeholder: attr(attrs, 'placeholder') })
  }
  return fields
}

function inferSectionType(input: {
  tag: string
  id?: string
  className?: string
  heading?: string
  html: string
  imageCount: number
  faqCount: number
  formCount: number
  index: number
}): { type: ImportedSectionType; confidence: number } {
  const identity = [input.id, input.className].filter(Boolean).join(' ').toLowerCase()
  const heading = (input.heading || '').toLowerCase()
  const haystack = [identity, heading, cleanText(input.html).slice(0, 500)]
    .filter(Boolean).join(' ').toLowerCase()

  if (input.tag === 'header') return { type: 'header', confidence: 0.99 }
  if (input.tag === 'footer') return { type: 'footer', confidence: 0.99 }
  if (input.tag === 'nav' && /(sticky|fixed|bottom|bar|đăng ký|dang-ky|cta)/i.test(haystack)) return { type: 'sticky_cta', confidence: 0.94 }

  // Prefer explicit section identity/heading over broad text keywords.
  // This prevents sections such as "Phù hợp" from being classified as a form
  // merely because their body text mentions "đăng ký".
  if (input.faqCount >= 2 || /(faq|hỏi đáp|hoi-dap|câu hỏi thường gặp)/i.test(identity + ' ' + heading)) {
    return { type: 'faq', confidence: 0.98 }
  }
  if (/(hero|banner|masthead|đầu trang)/i.test(identity) || /<h1\b/i.test(input.html)) {
    return { type: 'hero', confidence: 0.96 }
  }
  if (/(quà tặng|qua-tang|bonus|gift)/i.test(identity + ' ' + heading)) {
    return { type: 'bonuses', confidence: 0.98 }
  }
  if (/(phù hợp|phu-hop|dành cho ai|không phù hợp|fit)/i.test(identity + ' ' + heading)) {
    return { type: 'fit', confidence: 0.97 }
  }
  if (/(lời kết|loi-ket|closing|kết thúc)/i.test(identity + ' ' + heading)) {
    return { type: 'closing_message', confidence: 0.96 }
  }
  if (
    input.formCount > 0
    || /(dang-ky|registration|register|lead[-_ ]?form|opt-?in)/i.test(identity)
    || /^đăng ký\b/i.test(heading)
  ) {
    return { type: 'registration', confidence: 0.98 }
  }
  if (/(diễn giả|dien-gia|speaker|instructor|giảng viên|chuyên gia)/i.test(identity + ' ' + heading)) {
    return { type: 'instructor', confidence: 0.96 }
  }
  if (/(sau[- ]?\d+[- ]?ngày|sau .*ngày|kết quả|ket-qua|outcome|nhận được|lợi ích)/i.test(identity + ' ' + heading)) {
    return { type: 'outcomes', confidence: 0.94 }
  }
  if (/(hành trình|hanh-trinh|roadmap|timeline|lộ trình|chương trình học)/i.test(identity + ' ' + heading)) {
    return { type: 'roadmap', confidence: 0.94 }
  }
  if (input.imageCount >= 4 || /(gallery|khoảnh khắc|khoanh-khac|hình ảnh|thu vien anh)/i.test(identity + ' ' + heading)) {
    return { type: 'gallery', confidence: 0.92 }
  }
  if (/(nỗi đau|noi-dau|pain|vấn đề|van-de|đang thấy|khó khăn)/i.test(identity + ' ' + heading)) {
    return { type: 'pain_points', confidence: 0.9 }
  }
  if (/(học phí|hoc-phi|pricing|price|giá bán|đầu tư)/i.test(identity + ' ' + heading)) {
    return { type: 'pricing', confidence: 0.96 }
  }
  return { type: 'rich_content', confidence: 0.6 }
}

function pickSectionLabel(type: ImportedSectionType, heading: string | undefined, index: number): string {
  if (heading) return heading.slice(0, 90)
  const names: Record<ImportedSectionType, string> = {
    header: 'Header / Điều hướng',
    hero: 'Hero',
    pain_points: 'Vấn đề / Nỗi đau',
    outcomes: 'Kết quả / Lợi ích',
    roadmap: 'Hành trình / Lộ trình',
    gallery: 'Thư viện hình ảnh',
    instructor: 'Diễn giả / Chuyên gia',
    bonuses: 'Quà tặng',
    pricing: 'Học phí / Giá',
    fit: 'Phù hợp / Không phù hợp',
    faq: 'Câu hỏi thường gặp',
    registration: 'Form đăng ký',
    closing_message: 'Lời kết',
    footer: 'Footer',
    sticky_cta: 'Thanh hành động cố định',
    rich_content: 'Nội dung',
  }
  return `${names[type]} ${index + 1}`
}

function sectionContent(
  type: ImportedSectionType,
  heading: string | undefined,
  paragraphs: string[],
  listItems: string[],
  images: ImportedImage[],
  cards: ImportedCard[],
  tableRows: string[],
  actions: ImportedAction[],
  faqItems: Array<{ question: string; answer: string }>,
  formFields: Array<{ name?: string; type?: string; placeholder?: string }>,
): Record<string, unknown> {
  const description = paragraphs[0] || ''
  const primaryAction = actions[0]
  const contentImages = images.filter(image => image.role !== 'decorative' && image.role !== 'brand')
  const displayImages = contentImages.length ? contentImages : images.filter(image => image.role !== 'decorative')

  switch (type) {
    case 'hero':
      return {
        title: heading || 'Tiêu đề',
        description,
        imageUrl: displayImages[0]?.src,
        imageAlt: displayImages[0]?.alt,
        primaryCta: primaryAction ? {
          label: primaryAction.label,
          action: primaryAction.href?.startsWith('#') ? 'scroll' : 'external_link',
          target: primaryAction.href,
        } : { label: 'Đăng ký ngay', action: 'open_registration' },
      }
    case 'pain_points':
      return {
        title: heading || 'Vấn đề khách hàng đang gặp',
        description,
        items: listItems.map((item, i) => ({ id: `pain-${i + 1}`, title: '', description: item })),
      }
    case 'outcomes':
      return {
        title: heading || 'Kết quả nhận được',
        description,
        items: (cards.length ? cards.map((card, i) => ({
          id: `outcome-${i + 1}`,
          title: card.title,
          description: card.text || card.subtitle || '',
          imageUrl: card.image?.src,
        })) : listItems.map((item, i) => ({ id: `outcome-${i + 1}`, description: item }))),
      }
    case 'roadmap':
      return {
        title: heading || 'Hành trình',
        description,
        phases: listItems.map((item, i) => ({
          id: `phase-${i + 1}`,
          period: `Bước ${i + 1}`,
          title: item.slice(0, 100),
          description: item,
        })),
      }
    case 'instructor':
      return {
        title: heading || 'Người đồng hành',
        description,
        instructors: cards.map((card, i) => ({
          id: `instructor-${i + 1}`,
          name: card.title || `Chuyên gia ${i + 1}`,
          role: card.subtitle || '',
          imageUrl: card.image?.src,
          bio: card.text ? [card.text] : [],
        })),
        sourceText: [...paragraphs, ...listItems].slice(0, 30),
        sourceImages: displayImages,
      }
    case 'bonuses':
      return {
        title: heading || 'Quà tặng',
        description,
        items: (cards.length ? cards.map((card, i) => ({
          id: `bonus-${i + 1}`,
          title: card.title || card.text || `Quà tặng ${i + 1}`,
          description: card.text,
          imageUrl: card.image?.src,
        })) : listItems.map((item, i) => ({ id: `bonus-${i + 1}`, title: item }))),
        sourceImages: images,
      }
    case 'pricing': {
      const text = [heading, ...paragraphs, ...listItems].filter(Boolean).join(' ')
      const prices = unique((text.match(/\b\d{1,3}(?:[\.\s]\d{3})+(?:đ|\s*vnđ)?\b/gi) || []).map(v => v.trim()))
      return {
        title: heading || 'Học phí',
        description,
        detectedPrices: prices,
        plans: [],
        valueRows: tableRows,
        actions,
      }
    }
    case 'gallery':
      return { title: heading || 'Hình ảnh', description, images: displayImages }
    case 'fit':
      return { title: heading || 'Chương trình phù hợp với ai?', description, items: listItems }
    case 'faq':
      return { title: heading || 'Câu hỏi thường gặp', description, items: faqItems }
    case 'registration':
      return { title: heading || 'Đăng ký', description, fields: formFields, actions }
    case 'closing_message':
      return { title: heading, paragraphs: paragraphs.length ? paragraphs : listItems }
    case 'header':
    case 'footer':
      return { title: heading, paragraphs, links: actions, images: images.filter(image => image.role !== 'decorative') }
    case 'sticky_cta':
      return { title: heading, actions }
    default:
      return {
        title: heading,
        description,
        paragraphs: paragraphs.slice(1),
        imageUrl: displayImages[0]?.src,
        imageAlt: displayImages[0]?.alt,
        cta: primaryAction ? { label: primaryAction.label, target: primaryAction.href } : undefined,
      }
  }
}

function extractColors(css: string): string[] {
  const raw = css.match(/#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/gi) || []
  const counts = new Map<string, number>()
  raw.forEach(value => {
    const normalized = value.toLowerCase().replace(/\s+/g, '')
    counts.set(normalized, (counts.get(normalized) || 0) + 1)
  })
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([value]) => value)
}

function extractFonts(css: string): string[] {
  const fonts: string[] = []

  const variableRe = /--(?:font|font-[a-z0-9_-]+)\s*:\s*([^;}{]+)/gi
  let match: RegExpExecArray | null
  while ((match = variableRe.exec(css))) {
    const first = match[1].split(',')[0].trim().replace(/^['"]|['"]$/g, '')
    if (first && !first.startsWith('var(') && !/^(inherit|initial|system-ui)$/i.test(first)) fonts.push(first)
  }

  const familyRe = /font-family\s*:\s*([^;}{]+)/gi
  while ((match = familyRe.exec(css))) {
    const first = match[1].split(',')[0].trim().replace(/^['"]|['"]$/g, '')
    if (first && !first.startsWith('var(') && !/^(inherit|initial|system-ui)$/i.test(first)) fonts.push(first)
  }
  return unique(fonts).slice(0, 8)
}

function extractCss(html: string): string {
  const chunks: string[] = []
  const re = /<style\b[^>]*>([\s\S]*?)<\/style>/gi
  let match: RegExpExecArray | null
  while ((match = re.exec(html))) chunks.push(match[1])
  return chunks.join('\n')
}

function extractCssVariables(css: string): Record<string, string> {
  const vars: Record<string, string> = {}
  const re = /(--[a-z0-9_-]+)\s*:\s*([^;}{]+)/gi
  let match: RegExpExecArray | null
  while ((match = re.exec(css))) {
    vars[match[1]] = match[2].trim()
  }
  return vars
}

function resolveCssValue(value: string | undefined, vars: Record<string, string>): string | undefined {
  if (!value) return undefined
  return value.replace(/var\((--[a-z0-9_-]+)(?:,\s*[^)]+)?\)/gi, (_, name) => vars[name] || '').trim() || undefined
}

function findSectionDeclarations(
  css: string,
  sourceId: string | undefined,
  sourceClass: string | undefined,
): Record<string, string> {
  const selectors = [
    sourceId ? `#${sourceId}` : '',
    ...(sourceClass || '').split(/\s+/).filter(Boolean).map(name => `.${name}`),
  ].filter(Boolean)
  if (!selectors.length) return {}

  const out: Record<string, string> = {}
  const ruleRe = /([^{}]+)\{([^{}]+)\}/g
  let match: RegExpExecArray | null
  while ((match = ruleRe.exec(css))) {
    const selector = match[1]
    if (!selectors.some(token => selector.split(',').some(part => part.trim() === token || part.trim().startsWith(token + ':')))) continue
    const declRe = /([a-z-]+)\s*:\s*([^;]+)/gi
    let decl: RegExpExecArray | null
    while ((decl = declRe.exec(match[2]))) out[decl[1].toLowerCase()] = decl[2].trim()
  }
  return out
}

function extractMeta(html: string, name: string): string | undefined {
  const metaRe = /<meta\b([^>]*)>/gi
  let match: RegExpExecArray | null
  while ((match = metaRe.exec(html))) {
    const attrs = match[1]
    const key = attr(attrs, 'name') || attr(attrs, 'property')
    if (key?.toLowerCase() === name.toLowerCase()) return attr(attrs, 'content')
  }
  return undefined
}

function inferSavedFromUrl(html: string): string | undefined {
  const match = html.match(/<!--\s*saved from url=\([^)]*\)(https?:\/\/[^\s]+)\s*-->/i)
  return match?.[1]
}

function inferDesign(input: {
  html: string
  type: ImportedSectionType
  listCount: number
  imageCount: number
  css: string
  cssVars: Record<string, string>
  sourceId?: string
  sourceClass?: string
}) {
  const style = attr((input.html.match(/^<\w+\b([^>]*)>/i)?.[1] || ''), 'style') || ''
  const inlineBg = style.match(/background(?:-color)?\s*:\s*([^;]+)/i)?.[1]?.trim()
  const inlineColor = style.match(/(?:^|;)\s*color\s*:\s*([^;]+)/i)?.[1]?.trim()
  const inlinePadding = style.match(/padding\s*:\s*([^;]+)/i)?.[1]?.trim()
  const declarations = findSectionDeclarations(input.css, input.sourceId, input.sourceClass)

  const backgroundColor = resolveCssValue(
    inlineBg || declarations['background-color'] || declarations.background,
    input.cssVars,
  )
  const textColor = resolveCssValue(inlineColor || declarations.color, input.cssVars)
  const padding = resolveCssValue(inlinePadding || declarations.padding, input.cssVars)
  const borderRadius = resolveCssValue(declarations['border-radius'], input.cssVars)
  const center = /text-align\s*:\s*center/i.test(style) || declarations['text-align'] === 'center'

  let suggestedLayout: 'single' | 'split' | 'grid' | 'timeline' | 'gallery' = 'single'
  if (input.type === 'roadmap') suggestedLayout = 'timeline'
  else if (input.type === 'gallery') suggestedLayout = 'gallery'
  else if (input.imageCount && (input.listCount || input.type === 'hero')) suggestedLayout = 'split'
  else if (input.listCount >= 3) suggestedLayout = 'grid'

  return {
    backgroundColor,
    textColor,
    alignment: center ? 'center' as const : undefined,
    suggestedLayout,
    columns: suggestedLayout === 'grid' ? Math.min(3, Math.max(2, input.listCount)) : undefined,
    borderRadius,
    padding,
  }
}

export function analyzeWebsiteHtml(input: {
  html: string
  sourceType: 'url' | 'html'
  sourceUrl?: string
  finalUrl?: string
}): WebsiteTemplateAnalysis {
  const { html, sourceType, sourceUrl, finalUrl } = input
  const warnings: string[] = []
  const savedFromUrl = inferSavedFromUrl(html)
  const sourcePageUrl = finalUrl || sourceUrl || savedFromUrl
  // A browser-exported HTML file usually rewrites images to a sibling *_files
  // folder. Do not pretend those local paths exist on the original website.
  // URL imports can safely resolve relative assets against the fetched URL.
  const assetBaseUrl = sourceType === 'url' ? sourcePageUrl : (sourceUrl || undefined)

  const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)
  const title = titleMatch ? cleanText(titleMatch[1]) : 'Mẫu website đã nhập'
  const description = extractMeta(html, 'description')
  const language = attr(html.match(/<html\b([^>]*)>/i)?.[1] || '', 'lang')
  const css = extractCss(html)
  const cssVars = extractCssVariables(css)
  const colors = extractColors(css)
  const fonts = extractFonts(css)

  const blocks: Array<{ tag: string; attrs: string; html: string }> = []
  const blockRe = /<(header|section|footer|nav)\b([^>]*)>([\s\S]*?)<\/\1>/gi
  let blockMatch: RegExpExecArray | null
  while ((blockMatch = blockRe.exec(html)) && blocks.length < MAX_SECTIONS) {
    blocks.push({ tag: blockMatch[1].toLowerCase(), attrs: blockMatch[2], html: blockMatch[0] })
  }

  if (!blocks.length) {
    const mainMatch = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)
    blocks.push({ tag: 'section', attrs: '', html: mainMatch?.[0] || html })
    warnings.push('Trang không có thẻ section rõ ràng; hệ thống đã gom nội dung thành một khối tổng.')
  }

  const sections: ImportedSectionCandidate[] = blocks.map((block, index) => {
    const sourceId = attr(block.attrs, 'id')
    const sourceClass = attr(block.attrs, 'class')
    const heading = extractHeading(block.html)
    const paragraphs = extractTagTexts(block.html, 'p').slice(0, MAX_TEXT_ITEMS)
    const listItems = extractTagTexts(block.html, 'li').slice(0, MAX_TEXT_ITEMS)
    const images = extractImages(block.html, assetBaseUrl)
    const cards = extractCards(block.html, assetBaseUrl)
    const tableRows = extractTableRows(block.html)
    const actions = extractActions(block.html, sourcePageUrl)
    const faqItems = extractFaq(block.html)
    const formFields = extractFormFields(block.html)
    const inferred = inferSectionType({
      tag: block.tag,
      id: sourceId,
      className: sourceClass,
      heading,
      html: block.html,
      imageCount: images.length,
      faqCount: faqItems.length,
      formCount: formFields.length,
      index,
    })

    return {
      id: `imported-${index + 1}`,
      sourceId,
      sourceClass,
      label: pickSectionLabel(inferred.type, heading, index),
      sectionType: inferred.type,
      enabled: true,
      sortOrder: index,
      confidence: inferred.confidence,
      heading,
      paragraphs,
      listItems,
      images,
      cards,
      tableRows,
      actions,
      faqItems: faqItems.length ? faqItems : undefined,
      formFields: formFields.length ? formFields : undefined,
      content: sectionContent(inferred.type, heading, paragraphs, listItems, images, cards, tableRows, actions, faqItems, formFields),
      design: inferDesign({
        html: block.html,
        type: inferred.type,
        listCount: listItems.length || cards.length,
        imageCount: images.length,
        css,
        cssVars,
        sourceId,
        sourceClass,
      }),
    }
  })

  const unresolvedLocalAssets = sections
    .flatMap(section => section.images)
    .filter(image => !/^(https?:\/\/|data:image\/)/i.test(image.src)).length
  if (unresolvedLocalAssets) {
    warnings.push(`${unresolvedLocalAssets} ảnh đang dùng đường dẫn file cục bộ/tương đối. Hãy nhập bằng URL gốc hoặc tải lại ảnh trong Builder để template không phụ thuộc file trên máy.`)
  }
  if (sourceType === 'url' && /<(script)[\s>]/i.test(html)) {
    warnings.push('JavaScript của website nguồn không được sao chép; chỉ cấu trúc, nội dung và thiết kế an toàn được phân tích.')
  }

  const totalImages = sections.reduce((sum, section) => sum + section.images.length, 0)
  const totalLinks = sections.reduce((sum, section) => sum + section.actions.filter(action => action.kind === 'link').length, 0)
  const totalForms = sections.reduce((sum, section) => sum + (section.formFields?.length ? 1 : 0), 0)

  return {
    sourceType,
    sourceUrl,
    finalUrl,
    title,
    description,
    language,
    colors,
    fonts,
    theme: {
      primaryColor: resolveCssValue(cssVars['--green'] || cssVars['--primary'] || cssVars['--accent'], cssVars) || colors[0],
      secondaryColor: resolveCssValue(cssVars['--gold'] || cssVars['--secondary'], cssVars) || colors[1],
      backgroundColor: resolveCssValue(cssVars['--bg'] || cssVars['--background'], cssVars)
        || colors.find(color => /#(?:fff|ffffff|fbf|f[0-9a-f]{5})/i.test(color)) || colors[2],
      textColor: resolveCssValue(cssVars['--text'] || cssVars['--foreground'], cssVars)
        || colors.find(color => /#(?:1|2|3)[0-9a-f]{5}/i.test(color)) || colors[3],
      headingFont: fonts[0],
      bodyFont: fonts[0],
      borderRadius: resolveCssValue(cssVars['--radius'], cssVars),
      containerWidth: resolveCssValue(cssVars['--maxw'] || cssVars['--container'], cssVars),
    },
    sections,
    stats: {
      sections: sections.length,
      images: totalImages,
      links: totalLinks,
      forms: totalForms,
    },
    warnings,
  }
}
