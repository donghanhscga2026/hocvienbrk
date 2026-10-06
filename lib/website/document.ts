import { z } from 'zod'

export const kinds = ['container', 'heading', 'text', 'image', 'video', 'button', 'courses', 'testimonials', 'posts', 'form', 'affiliate', 'html', 'divider'] as const
export type Kind = typeof kinds[number]
export const labels: Record<Kind, string> = { container: 'Bố cục / cột', heading: 'Tiêu đề', text: 'Văn bản', image: 'Ảnh', video: 'Video', button: 'Nút', courses: 'Khóa học', testimonials: 'Lời chứng thực', posts: 'Bài viết', form: 'Form tư vấn → CRM', affiliate: 'Nút affiliate', html: 'HTML / CSS', divider: 'Đường phân cách' }
const color = z.string().regex(/^(#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})|transparent)$/i)
const safeLink = z.string().max(2000).refine(v => !v || /^https?:\/\/[^\s]+$/i.test(v) || /^\/(?!\/)[^\s\\]*$/.test(v) || /^#[\w-]+$/.test(v), 'Liên kết phải là HTTPS/HTTP, đường dẫn / hoặc #anchor.')
const fonts = z.enum(['inherit','sans-serif','serif','monospace'])
const styleSchema = z.object({ background: color.optional(), color: color.optional(), padding: z.number().min(0).max(240).optional(), gap: z.number().min(0).max(120).optional(), columns: z.number().int().min(1).max(6).optional(), fontSize: z.number().min(10).max(120).optional(), fontFamily: fonts.optional(), width: z.number().min(5).max(100).optional(), radius: z.number().min(0).max(100).optional(), maxWidth: z.number().min(200).max(2400).optional(), align: z.enum(['left', 'center', 'right']).optional(), minHeight: z.number().min(0).max(2000).optional() }).strict()
export type NodeStyle = z.infer<typeof styleSchema>
export interface WebsiteNode { id: string; kind: Kind; text: string; url: string; html: string; css: string; courseIds: number[]; style: NodeStyle; mobile: NodeStyle; children: WebsiteNode[] }
const nodeSchema: z.ZodType<WebsiteNode> = z.lazy(() => z.object({ id: z.string().regex(/^[\w-]{1,80}$/), kind: z.enum(kinds), text: z.string().max(20000), url: safeLink, html: z.string().max(100000), css: z.string().max(30000), courseIds: z.array(z.number().int().positive()).max(200), style: styleSchema, mobile: styleSchema, children: z.array(nodeSchema).max(200) }).strict())
export const documentSchema = z.object({ version: z.literal(1), name: z.string().trim().min(1).max(120), description: z.string().max(500), color, background: color, layout: z.object({ maxWidth: z.number().min(320).max(2400), padding: z.number().min(0).max(100), gap: z.number().min(0).max(120), fontFamily: fonts, showHeader: z.boolean(), showFooter: z.boolean() }).strict().default({ maxWidth: 1200, padding: 24, gap: 32, fontFamily: 'inherit', showHeader: true, showFooter: true }), pages: z.array(z.object({ id: z.string().regex(/^[\w-]{1,80}$/), title: z.string().trim().min(1).max(120), slug: z.string().regex(/^([a-z0-9]+(-[a-z0-9]+)*)?$/).max(80), nodes: z.array(nodeSchema).max(200) }).strict()).min(1).max(30) }).strict().superRefine((doc, ctx) => {
  const ids = new Set<string>(); const slugs = new Set<string>(); let count = 0
  const fail = (message: string) => ctx.addIssue({ code: 'custom', message })
  function walk(nodes: WebsiteNode[], depth: number) { if (depth > 8) { fail('Bố cục tối đa 8 cấp.'); return } for (const n of nodes) { count++; if(ids.has(n.id)) fail('ID thành phần bị trùng.'); ids.add(n.id); if(n.kind !== 'container' && n.children.length) fail('Chỉ bố cục mới chứa thành phần con.'); walk(n.children, depth + 1) } }
  for (const p of doc.pages) { if(ids.has(p.id)) fail('ID trang bị trùng.'); ids.add(p.id); if(slugs.has(p.slug)) fail('Đường dẫn trang bị trùng.'); slugs.add(p.slug); walk(p.nodes, 1) }
  if(!slugs.has('')) fail('Website cần một trang chủ có đường dẫn trống.')
  if(count > 500) fail('Website tối đa 500 thành phần.')
})
export type WebsiteDocument = z.infer<typeof documentSchema>
export function documentError(error: unknown) { return error instanceof z.ZodError ? error.issues[0]?.message || 'Thiết kế không hợp lệ.' : error instanceof Error ? error.message : 'Không thể xử lý thiết kế.' }
export function parseDocument(raw: unknown): WebsiteDocument {
  // Guard recursion before Zod evaluates the recursive schema, including imports.
  const fail = (message: string): never => { throw new z.ZodError([{ code: 'custom', path: [], message }]) }
  if (raw == null) fail('Thiếu thiết kế website.')
  if (new TextEncoder().encode(JSON.stringify(raw)).length > 600000) fail('Website vượt giới hạn 600 KB.')
  function depth(value: unknown, level = 0) { if(level > 32) fail('JSON lồng quá sâu.'); if(value && typeof value === 'object') for(const v of Object.values(value)) depth(v, level + 1) }
  depth(raw)
  return documentSchema.parse(raw)
}
export const uid = () => 'n-' + crypto.randomUUID()
export function makeNode(kind: Kind): WebsiteNode { return { id: uid(), kind, text: kind === 'heading' ? 'Tiêu đề của bạn' : kind === 'button' ? 'Tìm hiểu thêm' : kind === 'form' ? 'Đăng ký tư vấn' : kind === 'text' ? 'Viết câu chuyện, giá trị và lời giới thiệu của bạn tại đây.' : labels[kind], url: '', html: '<h2>Thiết kế theo cách của bạn</h2><p>Chèn HTML và CSS tại đây.</p>', css: 'body { font-family: sans-serif; padding: 24px; }', courseIds: [], style: kind === 'container' ? { padding: 24, gap: 20, columns: 1 } : {}, mobile: {}, children: [] } }
export function blankDocument(name = 'Website của tôi'): WebsiteDocument { return { version: 1, name, description: '', color: '#7c3aed', background: '#ffffff', layout: { maxWidth: 1200, padding: 24, gap: 32, fontFamily: 'inherit', showHeader: true, showFooter: true }, pages: [{ id: uid(), title: 'Trang chủ', slug: '', nodes: [] }] } }
export function walkNodes(nodes: WebsiteNode[]): WebsiteNode[] { return nodes.flatMap(n => [n, ...walkNodes(n.children)]) }
export function updateNode(nodes: WebsiteNode[], id: string, update: (node: WebsiteNode) => WebsiteNode): WebsiteNode[] { return nodes.map(n => n.id === id ? update(n) : { ...n, children: updateNode(n.children, id, update) }) }
export function removeNode(nodes: WebsiteNode[], id: string): WebsiteNode[] { return nodes.filter(n => n.id !== id).map(n => ({ ...n, children: removeNode(n.children, id) })) }
export function cloneNode(node: WebsiteNode): WebsiteNode { return { ...structuredClone(node), id: uid(), children: node.children.map(cloneNode) } }
export function moveNode(nodes: WebsiteNode[], id: string, parent: string | null, before?: string): WebsiteNode[] {
  const source = walkNodes(nodes).find(n => n.id === id)
  if(!source || id === before || (parent && walkNodes([source]).some(n => n.id === parent))) return nodes
  if(parent && !walkNodes(nodes).some(n => n.id === parent && n.kind === 'container')) return nodes
  const removed = removeNode(nodes, id)
  function insert(list: WebsiteNode[]) { const index = before ? list.findIndex(n => n.id === before) : -1; const result = [...list]; result.splice(index < 0 ? list.length : index, 0, source!); return result }
  return parent ? updateNode(removed, parent, n => ({ ...n, children: insert(n.children) })) : insert(removed)
}
export function templateDocument(key: string, name: string): WebsiteDocument {
  if (key === 'shared-complete') return completeTemplateDocument(name)
  if (key === 'shared' || key === 'shared-sales') return sharedTemplateDocument(name, key === 'shared-sales')
  const doc = blankDocument(name)
  if(key === 'blank') return doc
  const hero = makeNode('container'); hero.style = { background: '#f5f3ff', padding: 64, gap: 24, radius: 24 }; hero.mobile = { padding: 24 }
  const title = makeNode('heading'); title.text = key === 'business' ? 'Cùng bạn tạo nên những thay đổi có giá trị' : 'Học tập. Chuyển hóa. Phát triển.'; title.style = { fontSize: 48 }; title.mobile = { fontSize: 30 }
  const text = makeNode('text'); text.text = 'Giới thiệu thương hiệu và điều bạn giúp khách hàng đạt được.'
  const cta = makeNode('button'); cta.text = 'Khám phá khóa học'; cta.url = '#courses'
  hero.children = [title, text, cta]
  const intro = makeNode('container'); intro.style.columns = 2; intro.mobile.columns = 1
  const about = makeNode('text'); about.text = 'Về chúng tôi\nChia sẻ câu chuyện, kinh nghiệm và những giá trị bạn mang lại.'; intro.children = [about, makeNode('image')]
  doc.pages[0].nodes = [hero, intro, makeNode('courses'), makeNode('testimonials'), makeNode('form')]
  return doc
}

/** Mẫu chung gồm các khối có thể sửa; khóa học và form đọc dữ liệu của website. */
export function sharedTemplateDocument(name = 'Thương hiệu của bạn', sales = false): WebsiteDocument {
  const doc = blankDocument(name)
  doc.description = 'Giới thiệu chuyên môn, dịch vụ và các chương trình học của bạn.'
  doc.color = '#0f766e'
  doc.background = '#f8faf9'
  doc.layout = {...doc.layout, maxWidth: 1160, padding: 24, gap: 32, showHeader: !sales, showFooter: true}
  const text = (kind: 'heading' | 'text', value: string, size?: number) => {
    const node = makeNode(kind); node.text = value
    if (size) {node.style.fontSize = size; node.mobile.fontSize = Math.min(size, 32)}
    return node
  }
  const box = (children: WebsiteNode[], background = '#ffffff', columns = 1) => {
    const node = makeNode('container')
    node.style = {background, padding: 32, gap: 20, radius: 24, columns}
    node.mobile = {padding: 20, columns: 1}
    node.children = children
    return node
  }
  const button = (label: string, url: string) => {
    const node = makeNode('button'); node.text = label; node.url = url; return node
  }
  const hero = box([
    text('text', sales ? 'Chương trình dành cho bạn' : 'Chuyên môn · Giá trị · Kết nối'),
    text('heading', sales ? 'Bắt đầu hành trình học tập phù hợp với bạn' : 'Biến kiến thức thành giá trị. Cùng bạn tiến xa hơn.', 48),
    text('text', 'Chia sẻ bạn giúp ai, giải quyết vấn đề gì và điều khách hàng có thể nhận được. Thay nội dung này bằng lời giới thiệu của bạn.'),
    button(sales ? 'Khám phá chương trình' : 'Xem khóa học của tôi', '#courses'),
  ], '#e8f3ef')
  const services = box([
    box([text('heading', 'Học tập có định hướng', 24), text('text', 'Các chương trình giúp bạn xây nền tảng và thực hành từng bước.')], '#f8faf9'),
    box([text('heading', 'Tư vấn phù hợp', 24), text('text', 'Cùng tìm giải pháp phù hợp với mục tiêu và hoàn cảnh của bạn.')], '#f8faf9'),
    box([text('heading', 'Đồng hành lâu dài', 24), text('text', 'Kết nối, chia sẻ kinh nghiệm và hỗ trợ trong quá trình áp dụng.')], '#f8faf9'),
  ], '#ffffff', 3)
  const about = box([
    text('heading', 'Chuyên môn của bạn, câu chuyện của bạn', 30),
    text('text', 'Giới thiệu người phụ trách, kinh nghiệm và cách bạn đồng hành với khách hàng. Chỉ đưa những thông tin và kết quả đã có thật.'),
    button('Trao đổi cùng tôi', '/lien-he'),
  ])
  const courses = makeNode('courses'); courses.text = 'Khóa học và chương trình'
  const faq = box([
    text('heading', 'Trước khi bắt đầu', 30),
    text('heading', 'Tôi nên chọn chương trình nào?', 22),
    text('text', 'Xem nội dung từng khóa học hoặc gửi thông tin để được tư vấn.'),
    text('heading', 'Đăng ký ở đâu?', 22),
    text('text', 'Mở khóa học và đăng ký qua quy trình của nền tảng. Quyền học theo đăng ký của từng tài khoản.'),
  ])
  const form = makeNode('form'); form.text = 'Bạn cần một hướng đi phù hợp?'
  doc.pages[0].nodes = [hero, services, courses, ...(sales ? [] : [about]), faq, form]
  const contact = makeNode('form'); contact.text = 'Gửi nhu cầu của bạn'
  doc.pages.push({id: uid(), title: 'Liên hệ', slug: 'lien-he', nodes: [
    text('heading', 'Cùng trao đổi về mục tiêu của bạn', 36),
    text('text', 'Điền thông tin để chủ website liên hệ và tư vấn.'), contact,
  ]})
  return doc
}

/** Nội dung minh họa đầy đủ cho website dịch vụ; không có giá hay đánh giá bịa đặt. */
export function completeTemplateDocument(name = 'Hương Lucy', sales = false): WebsiteDocument {
  const doc = sharedTemplateDocument(name, sales)
  doc.description = 'Website, landing page và ứng dụng AI dành cho chuyên gia, nhà đào tạo và người kinh doanh nhỏ.'
  const copy = (kind: 'heading' | 'text', value: string, size = kind === 'heading' ? 28 : 17) => {
    const node = makeNode(kind); node.text = value; node.style = {fontSize:size}; node.mobile = {fontSize:Math.min(size,30)}; return node
  }
  const cta = (title: string, url: string) => {const node=makeNode('button');node.text=title;node.url=url;return node}
  const section = (children: WebsiteNode[], background = '#ffffff', columns = 1) => {
    const node=makeNode('container');node.style={padding:32,gap:24,radius:24,background,columns};node.mobile={padding:20,columns:1};node.children=children;return node
  }
  const card = (title: string, body: string) => section([copy('heading',title,23),copy('text',body)],'#f3f7f5')
  const hero=section([
    copy('text','Website · Landing page · AI cho người làm chuyên môn',15),
    copy('heading',sales?'Một nơi để khách hiểu bạn, tin bạn và bắt đầu kết nối':'Đưa chuyên môn của bạn lên một website có định hướng.',48),
    copy('text','Dành cho chuyên gia, nhà đào tạo và người kinh doanh nhỏ: tập hợp câu chuyện, dịch vụ, khóa học và nội dung của bạn vào một nơi dễ tìm, dễ đọc và dễ liên hệ.'),
    cta('Trao đổi về website của tôi','/lien-he'),
    copy('text','Bắt đầu từ nhu cầu thực tế · Chỉnh được nội dung · Dùng được trên điện thoại',15),
  ],'#e8f3ef')
  const illustration=makeNode('image')
  illustration.url='/website-demo-preview.svg'
  illustration.text='Minh họa website có menu, nội dung giới thiệu và các thẻ khóa học'
  illustration.style={radius:20}
  hero.children=[section(hero.children,'#e8f3ef'),illustration]
  hero.style.columns=2
  const problems=section([
    copy('heading','Bạn có nhiều giá trị để chia sẻ, nhưng khách đang phải tìm ở quá nhiều nơi.'),
    copy('text','Bài viết nằm trên mạng xã hội, khóa học ở một nền tảng khác, thông tin dịch vụ gửi qua tin nhắn. Khi khách muốn tìm hiểu, họ khó biết nên bắt đầu ở đâu. Website giúp bạn sắp xếp lại hành trình này.'),
    section([card('Thông tin rải rác','Gom giới thiệu, dịch vụ và khóa học vào một địa chỉ thống nhất.'),card('Khó trình bày giá trị','Làm rõ bạn giúp ai, giải quyết điều gì và cách làm việc cùng bạn.'),card('Khách chưa biết bước tiếp theo','Đặt lời mời liên hệ, đăng ký hoặc nhận tài liệu ở đúng chỗ.')],'#ffffff',3),
  ])
  const services=section([
    copy('heading','Chọn giải pháp phù hợp với bước phát triển của bạn.'),
    section([
      card('Website thương hiệu cá nhân','Trang chủ, giới thiệu, dịch vụ, khóa học và liên hệ. Phù hợp khi bạn cần một nơi trình bày chuyên môn và nội dung lâu dài.'),
      card('Landing page cho một mục tiêu','Trang bán khóa học, đăng ký sự kiện hoặc nhận quà tặng. Nội dung tập trung vào một lời mời và một hành động cụ thể.'),
      card('AI hỗ trợ sáng tạo nội dung','Ứng dụng AI vào ý tưởng, nội dung, hình ảnh và video. Chọn công cụ theo công việc thực tế, hướng dẫn từng bước để bạn tự sử dụng.'),
    ],'#ffffff',3),
    cta('Xem phạm vi từng dịch vụ','/dich-vu'),
  ])
  const process=section([
    copy('heading','Từ ý tưởng đến website: từng bước rõ ràng.'),
    section([
      card('01 · Làm rõ nhu cầu','Xác định khách hàng, mục tiêu của website, nội dung cần có và hành động bạn muốn khách thực hiện.'),
      card('02 · Sắp xếp nội dung','Xây cấu trúc trang, thông điệp chính, hình ảnh và nguồn khóa học được kết nối.'),
      card('03 · Thiết kế và kiểm tra','Chỉnh giao diện trên máy tính, điện thoại; kiểm tra menu, liên kết và form trước khi xuất bản.'),
      card('04 · Bàn giao và sử dụng','Hướng dẫn cập nhật nội dung, quản lý tên miền và bật các tiện ích được cấp.'),
    ],'#ffffff',2),
  ])
  const about=section([
    copy('heading','Xin chào, tôi là '+name+'.'),
    copy('text','Tôi làm việc trong lĩnh vực website, thiết kế banner, logo, hình ảnh và AI. Tôi muốn giúp người làm chuyên môn có một nơi trình bày giá trị rõ ràng và sử dụng công nghệ thuận tiện hơn.'),
    copy('text','Cách tiếp cận của tôi bắt đầu từ nội dung và nhu cầu của người dùng: khách cần biết gì, tìm thông tin ở đâu và làm gì tiếp theo. Giao diện được xây quanh những câu hỏi đó.'),
    cta('Tìm hiểu cách tôi làm việc','/gioi-thieu'),
  ],'#e8f3ef')
  const examples=section([
    copy('heading','Ba cách áp dụng cùng một mẫu website.'),
    copy('text','Các tình huống sau là minh họa cách dùng mẫu, không phải dự án khách hàng đã thực hiện.'),
    section([card('Chuyên gia đào tạo','Giới thiệu chuyên gia → chương trình học → nội dung chia sẻ → đăng ký tư vấn.'),card('Dịch vụ chuyên môn','Vấn đề của khách → giải pháp → phạm vi dịch vụ → quy trình → gửi yêu cầu.'),card('Chiến dịch nhận quà','Lợi ích quà tặng → nội dung nhận được → cách sử dụng → form đăng ký.')],'#ffffff',3),
  ])
  const packages=section([
    copy('heading','Phạm vi dịch vụ để bạn dễ lựa chọn.'),
    copy('text','Đây là cấu trúc gói minh họa. Giá và phạm vi bàn giao cần thống nhất sau khi trao đổi, chưa phải bảng giá công bố.'),
    section([
      card('Landing page','Một trang tập trung: thông điệp, lợi ích, nội dung sản phẩm, câu hỏi thường gặp và form liên hệ. Dành cho một chiến dịch hoặc lời mời cụ thể.'),
      card('Website chuyên gia','Bộ trang giới thiệu thương hiệu, dịch vụ, chương trình học và liên hệ. Dùng menu và bộ màu chung; cập nhật nội dung theo từng trang.'),
      card('Website kết nối nền tảng','Website có nguồn khóa học từ hệ thống chính và các tiện ích được cấp. CRM, Affiliate hoặc ứng dụng khác được bật theo cấu hình và quyền tài khoản.'),
    ],'#ffffff',3),
    cta('Nhận đề xuất theo nhu cầu','/lien-he'),
  ])
  const courses=makeNode('courses');courses.text='Học thêm để chủ động sử dụng website và AI'
  const faq=section([
    copy('heading','Những điều bạn thường muốn biết trước khi bắt đầu.'),
    ...[
      ['Tôi chưa có đủ nội dung, có làm được không?','Có thể bắt đầu bằng thông tin cơ bản về bạn, dịch vụ và khách hàng. Sau đó hoàn thiện nội dung theo từng trang; ảnh và thông tin chưa có cần được đánh dấu để bổ sung.'],
      ['Tôi có thể tự thay chữ, ảnh và màu không?','Với mẫu dùng các khối của hệ thống, bạn chỉnh nội dung trong trình thiết kế, lưu nháp và xuất bản sau khi xem trước.'],
      ['Khóa học có phải nhập lại vào website này không?','Không. Khối Khóa học đọc nguồn đã chọn từ nền tảng chính. Quyền học bài vẫn theo đăng ký của học viên.'],
      ['Tôi có thể dùng tên miền riêng không?','Có. Kết nối tên miền trong Quản lý website, hoàn tất cấu hình DNS và kiểm tra trước khi sử dụng.'],
      ['Có thể dùng mẫu HTML riêng không?','Có khối HTML/CSS cách ly. File có JavaScript hoặc tài nguyên ngoài cần được xử lý tương thích; không phải mọi file đều nhập nguyên trạng được.'],
      ['Tôi nên bắt đầu bằng website hay landing page?','Chọn landing page khi có một lời mời cụ thể. Chọn website khi cần nhiều trang để trình bày chuyên môn, dịch vụ và nội dung lâu dài.'],
    ].flatMap(([question,answer])=>[copy('heading',question,21),copy('text',answer)]),
  ])
  const lead=makeNode('form');lead.text='Bạn đang muốn xây website cho mục tiêu nào?'
  const invitation=section([copy('heading','Bắt đầu từ một cuộc trao đổi cụ thể.'),copy('text','Hãy chia sẻ lĩnh vực, khách hàng bạn muốn phục vụ và điều đang khiến bạn vướng. Tôi sẽ cùng bạn xác định những trang cần có và bước nên làm trước.'),lead],'#e8f3ef')
  doc.pages[0].nodes=[hero,problems,services,process,...(sales?[]:[about]),examples,courses,packages,faq,invitation]
  const cloned=(nodes:WebsiteNode[])=>nodes.map(cloneNode)
  doc.pages=[doc.pages[0],
    {id:uid(),title:'Giới thiệu',slug:'gioi-thieu',nodes:cloned([about,process,invitation])},
    {id:uid(),title:'Dịch vụ',slug:'dich-vu',nodes:cloned([services,packages,faq,invitation])},
    {id:uid(),title:'Khóa học',slug:'chuong-trinh',nodes:[copy('heading','Chương trình học dành cho bạn',36),copy('text','Xem nội dung từng chương trình để chọn hướng học phù hợp. Danh sách trên website thật lấy từ nguồn khóa học được chủ website lựa chọn.'),cloneNode(courses)]},
    {id:uid(),title:'Liên hệ',slug:'lien-he',nodes:[copy('heading','Cùng trao đổi về mục tiêu của bạn',36),copy('text','Gửi lĩnh vực hoạt động, website hiện tại nếu có, các trang bạn cần và thời điểm dự kiến. Không cần biết lập trình để bắt đầu.'),cloneNode(lead),copy('text','Form trong bản xem thử không gửi dữ liệu. Khi xuất bản, form cần quyền CRM và thông tin liên hệ thực tế của chủ website.')]},
  ]
  return doc
}
