/** Bản thử dùng mẫu cố định để duyệt trải nghiệm; chưa gọi dịch vụ AI. */
export type LandingKind = 'course' | 'service' | 'gift'
export type LandingMode = 'template' | 'suggest' | 'custom'
export type LandingStyle = 'bright' | 'bold' | 'minimal'
export type LandingBrief = {
  kind: LandingKind; mode: LandingMode; name: string; audience: string; benefits: string
  expert: string; price: string; cta: string; ctaUrl: string; customOutline: string
  style: LandingStyle; color: string; imageUrl: string
}
export type LandingSection = { id: string; kind: string; title: string; body: string; needsInput: boolean }
export const initialBrief: LandingBrief = {
  kind: 'course', mode: 'template', name: '', audience: '', benefits: '', expert: '', price: '',
  cta: 'Đăng ký tư vấn', ctaUrl: '', customOutline: '', style: 'bright', color: '#236c1e', imageUrl: '',
}
const headings: Record<string, string> = {
  hero: 'Mở đầu', problem: 'Vấn đề của khách hàng', benefits: 'Lợi ích và kết quả',
  program: 'Nội dung chương trình', process: 'Quy trình thực hiện', content: 'Bạn sẽ nhận được gì',
  expert: 'Người đồng hành', proof: 'Minh chứng và phản hồi', offer: 'Chi phí và quyền lợi',
  faq: 'Câu hỏi thường gặp', cta: 'Đăng ký và liên hệ',
}
const structures: Record<LandingKind, string[]> = {
  course: ['hero','problem','benefits','program','expert','proof','offer','faq','cta'],
  service: ['hero','problem','benefits','process','proof','offer','faq','cta'],
  gift: ['hero','benefits','content','expert','cta'],
}
export function newLandingSection(title = 'Phần mới', kind = 'custom'): LandingSection {
  return { id: crypto.randomUUID(), kind, title, body: '', needsInput: true }
}
export function outlineError(brief: LandingBrief) {
  if (!brief.name.trim() || !brief.audience.trim()) return 'Điền tên sản phẩm và khách hàng trước khi tạo dàn ý.'
  if (brief.mode === 'custom') {
    const lines = brief.customOutline.split('\n').map(s => s.trim()).filter(Boolean)
    if (!lines.length || lines.length > 12 || lines.some(s => s.length > 80)) return 'Dàn ý riêng cần 1–12 phần, mỗi phần tối đa 80 ký tự.'
  }
  return ''
}
export function makeLandingOutline(brief: LandingBrief): LandingSection[] {
  const error = outlineError(brief)
  if (error) throw new Error(error)
  if (brief.mode === 'custom') return brief.customOutline.split('\n').map(s => s.trim()).filter(Boolean).map((title, index) => newLandingSection(title, index === 0 ? 'hero' : 'custom'))
  // Chế độ đề xuất chỉ mô phỏng quy tắc lựa chọn, không giả vờ có phản hồi AI.
  const keys = structures[brief.kind].filter(key => brief.mode !== 'suggest' || key !== 'proof' || !!brief.expert.trim())
  return keys.map(key => newLandingSection(headings[key], key))
}
export function createLandingDraft(brief: LandingBrief, outline: LandingSection[]): LandingSection[] {
  return outline.map(section => {
    const benefits = brief.benefits.trim()
    const content: Record<string, [string, boolean]> = {
      hero: [`Dành cho ${brief.audience.trim()}.\n${benefits || 'Bổ sung lời giới thiệu và lợi ích nổi bật của bạn.'}`, !benefits],
      benefits: [benefits || 'Bổ sung những lợi ích cụ thể mà khách hàng nhận được.', !benefits],
      content: [benefits || 'Bổ sung danh sách nội dung trong quà tặng.', !benefits],
      expert: [brief.expert.trim() || 'Bổ sung tên, chuyên môn và kinh nghiệm thực tế.', !brief.expert.trim()],
      offer: [brief.price.trim() || 'Bổ sung giá và những quyền lợi đi kèm.', !brief.price.trim()],
      cta: [brief.ctaUrl.trim() ? 'Chọn nút bên dưới để liên hệ với chúng tôi.' : 'Bổ sung đường dẫn liên hệ trước khi sử dụng trang.', !brief.ctaUrl.trim()],
      problem: ['Bổ sung khó khăn thực tế của khách hàng và điều bạn có thể hỗ trợ.', true],
      program: ['Bổ sung các phần của chương trình, hình thức học và thời lượng.', true],
      process: ['Bổ sung các bước làm việc, thời gian và phần khách hàng cần chuẩn bị.', true],
      proof: ['Bổ sung minh chứng hoặc phản hồi thật đã được cho phép sử dụng.', true],
      faq: ['Bổ sung câu hỏi và câu trả lời về sản phẩm, cách tham gia và điều kiện.', true],
      custom: ['Bổ sung nội dung cho phần này.', true],
    }
    const [body, needsInput] = content[section.kind] || content.custom
    return { ...section, title: section.kind === 'hero' ? brief.name.trim() : section.title, body, needsInput }
  })
}
export function moveLandingSection(sections: LandingSection[], index: number, direction: -1 | 1) {
  const next = index + direction
  if (index < 0 || index >= sections.length || next < 0 || next >= sections.length) return sections
  const copy = [...sections]
  ;[copy[index], copy[next]] = [copy[next], copy[index]]
  return copy
}
export function safeLandingUrl(value: string) {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : '' } catch { return '' }
}
export function escapeLandingHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!))
}
/** HTML tự chứa CSS, không có JavaScript/form giả; nội dung nhập luôn được escape. */
export function landingHtml(brief: LandingBrief, sections: LandingSection[]) {
  const escape = escapeLandingHtml
  const color = /^#[0-9a-f]{6}$/i.test(brief.color) ? brief.color : '#236c1e'
  // Tự chọn chữ đen/trắng để màu sáng không làm nội dung hoặc nút bị mất chữ.
  const channels = [1, 3, 5].map(offset => parseInt(color.slice(offset, offset + 2), 16) / 255)
  const linear = channels.map(value => value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4))
  const luminance = 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
  const onPrimary = luminance > 0.179 ? '#000000' : '#ffffff'
  const url = safeLandingUrl(brief.ctaUrl)
  const image = safeLandingUrl(brief.imageUrl)
  const bold = brief.style === 'bold'
  const radius = brief.style === 'minimal' ? '4px' : '24px'
  const css = `*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;font-family:Arial,sans-serif;background:${bold ? '#0f172a' : '#f8fafc'};color:${bold ? '#f1f5f9' : '#14231c'};line-height:1.7}header,main,footer{max-width:1100px;margin:auto;padding:24px}header{display:flex;align-items:center;justify-content:space-between;gap:16px;border-bottom:1px solid #94a3b830}header span{font-size:12px;color:${bold ? '#cbd5e1' : '#64748b'}}section{padding:48px 32px;margin:24px 0;border-radius:${radius};background:${bold ? '#1e293b' : '#ffffff'};border:1px solid #94a3b830}.hero{background:${color};color:${onPrimary};padding:64px 40px}.hero p{max-width:680px}h1{font-size:clamp(30px,5vw,56px);line-height:1.15;letter-spacing:-1px;margin:12px 0 24px}h2{font-size:clamp(22px,3vw,32px);line-height:1.3;margin:0 0 18px}p{white-space:pre-wrap;overflow-wrap:anywhere}.cta{display:inline-block;margin-top:20px;padding:14px 24px;border-radius:12px;background:${color};color:${onPrimary};text-decoration:none;font-weight:bold}.hero .cta{background:${onPrimary};color:${color}}.pending{font-size:12px;display:inline-block;padding:4px 10px;border-radius:100px;background:#fef3c7;color:#92400e}img{display:block;width:100%;max-height:440px;object-fit:cover;border-radius:16px;margin-top:24px}footer{font-size:13px;color:${bold ? '#cbd5e1' : '#64748b'}}@media(max-width:600px){header,main,footer{padding:16px}header{align-items:flex-start;flex-direction:column}section{padding:28px 20px;margin:16px 0}.hero{padding:40px 24px}}`
  const blocks = sections.map(section => `<section id="s-${escape(section.id)}" class="${section.kind === 'hero' ? 'hero' : ''}">${section.needsInput ? '<span class="pending">Cần bổ sung nội dung</span>' : ''}<${section.kind === 'hero' ? 'h1' : 'h2'}>${escape(section.title)}</${section.kind === 'hero' ? 'h1' : 'h2'}><p>${escape(section.body)}</p>${section.kind === 'hero' && image ? `<img src="${escape(image)}" alt="${escape(brief.name)}" />` : ''}${(section.kind === 'hero' || section.kind === 'cta') && url ? `<a class="cta" href="${escape(url)}" target="_blank" rel="noopener noreferrer">${escape(brief.cta || 'Liên hệ')}</a>` : ''}</section>`).join('')
  return `<!doctype html><html lang="vi"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${escape(brief.name)} — Bản nháp</title><style>${css}</style></head><body><header><strong>${escape(brief.name)}</strong><span>Bản nháp — kiểm tra nội dung trước khi sử dụng</span></header><main>${blocks}</main><footer>Bản thử Wi Landing AI. Trang chưa được xuất bản.</footer></body></html>`
}
