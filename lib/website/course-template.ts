import { createCoursePageFromTemplate, CourseTemplateKey } from '@/lib/course-page/templates'
import { blankDocument, makeNode, parseDocument, WebsiteNode } from './document'

/** Content adaptation, not a replacement for the course registration/payment renderer. */
export function adaptCourseTemplate(key: CourseTemplateKey, name: string) {
  const source = createCoursePageFromTemplate(key, '')
  const doc = blankDocument(name)
  doc.color = source.theme.primaryColor || doc.color
  doc.background = source.theme.backgroundColor || doc.background
  const notes: string[] = []
  function contentNodes(value: unknown, depth = 0): WebsiteNode[] {
    if(!value || depth > 6) return []
    if(Array.isArray(value)) return value.flatMap(v => contentNodes(v,depth+1))
    if(typeof value !== 'object') return []
    const result: WebsiteNode[] = []
    for(const [field,v] of Object.entries(value)) {
      if(typeof v === 'string' && ['title','name','eyebrow','description','text','content','role','quote'].includes(field) && v) { const n = makeNode(field === 'title' || field === 'name' ? 'heading' : 'text'); n.text = v; result.push(n) }
      else if(typeof v === 'string' && ['imageUrl','image'].includes(field) && /^https?:\/\//.test(v)) { const n = makeNode('image'); n.url = v; result.push(n) }
      else if(field === 'paragraphs' && Array.isArray(v)) { const n = makeNode('text'); n.text = v.filter(x => typeof x === 'string').join('\n\n'); result.push(n) }
      else if(Array.isArray(v) || (v && typeof v === 'object' && !['cta','primaryCta','secondaryCta'].includes(field))) result.push(...contentNodes(v,depth+1))
    }
    return result
  }
  for(const section of source.sections.filter(s => s.enabled)) {
    if(['pricing','curriculum','registration','checkout'].includes(section.type)) { notes.push(section.type + ': sử dụng khối khóa học và trang đăng ký hiện có.'); continue }
    if(String(section.type) === 'testimonials') { const n = makeNode('testimonials'); doc.pages[0].nodes.push(n); continue }
    const n = makeNode('container'); n.style = { padding: 32, gap: 20, color: source.theme.textColor || '#172033', background: source.theme.surfaceColor || '#ffffff', radius: 20 }; n.mobile = { padding: 20 }; n.children = contentNodes(section.content)
    if(n.children.length) doc.pages[0].nodes.push(n)
    else notes.push(section.type + ': không có nội dung tương thích; cần thiết kế thêm.')
  }
  doc.pages[0].nodes.push(makeNode('courses'),makeNode('form'))
  notes.unshift('Chuyển nội dung mẫu sang các thành phần có thể sửa. Bố cục không phải bản sao nguyên trạng; thanh toán và affiliate tiếp tục ở trang khóa học của hệ thống.')
  return { document: parseDocument(doc), notes }
}
