import type { WebsiteDocument, WebsiteNode } from './document'

const image = (id: string, fileId: string, text: string, style: WebsiteNode['style'] = {}): WebsiteNode => ({
  id, kind: 'image', text, url: `https://drive.google.com/uc?export=view&id=${fileId}`, html: '', css: '', courseIds: [], style, mobile: {}, children: []
})
const heading = (id: string, text: string, fontSize = 42, color = '#DAAF37'): WebsiteNode => ({
  id, kind: 'heading', text, url: '', html: '', css: '', courseIds: [], style: { fontSize, color, align: 'center' }, mobile: { fontSize: Math.min(fontSize, 30) }, children: []
})
const text = (id: string, value: string, color = '#F5E7C4', align: 'left' | 'center' | 'right' = 'left'): WebsiteNode => ({
  id, kind: 'text', text: value, url: '', html: '', css: '', courseIds: [], style: { color, align, fontSize: 17 }, mobile: { fontSize: 16 }, children: []
})
const button = (id: string, label: string, url: string): WebsiteNode => ({
  id, kind: 'button', text: label, url, html: '', css: '', courseIds: [], style: { align: 'center' }, mobile: {}, children: []
})
const container = (id: string, children: WebsiteNode[], style: WebsiteNode['style'] = {}, mobile: WebsiteNode['mobile'] = {}): WebsiteNode => ({
  id, kind: 'container', text: id, url: '', html: '', css: '', courseIds: [], style: { gap: 24, ...style }, mobile: { columns: 1, padding: 24, ...mobile }, children
})

export function theTopTemplateDocument(name = 'Học viện The Top 1%'): WebsiteDocument {
  const gold = '#DAAF37', dark = '#0A0F1C', cream = '#F5E7C4'
  const pillar = (id: string, title: string, body: string, background: string) =>
    container(id, [heading(id+'-h', title, 30), text(id+'-t', body, cream, 'center'), button(id+'-b', 'KHÁM PHÁ NGAY', '#hanh-trinh')], { background, padding: 32, radius: 28 })

  const hero = container('thetop-hero', [
    text('thetop-kicker', 'FAMILY & FRIENDS • PEACE • LOVE', gold, 'center'),
    heading('thetop-title', 'HỌC VIỆN THE TOP 1%', 62),
    heading('thetop-subtitle', 'THỊNH VƯỢNG & HẠNH PHÚC\nTRÊN CON ĐƯỜNG MINH TRIẾT', 34, cream),
    text('thetop-lead', 'Kết nối tri thức • Rèn luyện thân tâm • Kiến tạo sự nghiệp • Lan tỏa giá trị\nCùng bạn và gia đình vươn tới phiên bản tốt đẹp nhất.', cream, 'center'),
    button('thetop-cta', 'KHÁM PHÁ HÀNH TRÌNH', '#hanh-trinh'),
  ], { background: dark, padding: 72, gap: 22, align: 'center', minHeight: 620 }, { padding: 30 })

  const pillars = container('thetop-pillars', [
    heading('pillars-title', '3 TRỤ CỘT ĐÀO TẠO', 40),
    container('pillars-grid', [
      pillar('pillar-life', 'TRƯỜNG SINH', '6 bước Trường Sinh\nHơi thở diệu kỳ\nCân bằng đường huyết', '#073B22'),
      pillar('pillar-peace', 'AN LẠC', 'Nâng tầm người\nKiến tạo tương lai như ý\nChạm vào nguồn lực tài chính\nMagical Book\nĐánh thức hiện tại trong con\n90 ngày thực hành lòng biết ơn', '#35104F'),
      pillar('pillar-business', 'DOANH NHÂN TAM BẢO', 'Doanh nhân Tam Bảo\nTrain The Coach\nKiến tạo Nhà Khai Vấn\nKinh doanh bền vững', '#0B3158'),
    ], { columns: 3, gap: 24 })
  ], { background: '#080D18', padding: 56 })

  const cause = container('thetop-cause', [
    heading('cause-title', 'ĐIỀU QUAN TRỌNG KHÔNG PHẢI QUẢ — MÀ LÀ NHÂN', 38),
    container('cause-grid', [
      text('cause-left', 'THÂN TRƯỜNG SINH\nTÂM AN LẠC\nTRÍ GIÁC NGỘ\n\nTiền bạc • Danh vọng • Hạnh phúc gia đình • Các mối quan hệ • Sức khỏe…', cream, 'center'),
      text('cause-right', 'KHÔNG THỂ ĐỔI QUẢ THÌ ĐỔI NHÂN\n\n“Muốn thay đổi số phận phải thay đổi TẬP KHÍ.”\n\nTẬP KHÍ là thói quen phản ứng tự động của Tâm trước sự vật, sự việc bên ngoài. Chính thói quen phản ứng này là gốc của NHÂN cần chuyển hóa.', cream, 'center')
    ], { columns: 2, gap: 28 })
  ], { background: '#101728', padding: 56 })

  const founder = container('thetop-founder', [
    image('founder-image', '18xXBR6HfEX5mMrJ7xI6YKP0Az01ST5X5', 'Người sáng lập The Top 1%'),
    container('founder-copy', [
      text('founder-kicker', 'NGƯỜI SÁNG LẬP THE TOP 1%', gold),
      heading('founder-title', 'ỨNG DỤNG GIÁO LÝ ĐẠO PHẬT VÀO CUỘC SỐNG VÀ KINH DOANH', 36),
      text('founder-text', 'Hành trình chuyển hóa bắt đầu từ việc thấy rõ Tập Khí, quản trị cái Nhân và kiến tạo đời sống có chánh kiến, an lạc và giá trị.', cream)
    ], { padding: 20 })
  ], { background: '#07101F', padding: 56, columns: 2, gap: 40 })

  const who = container('thetop-who', [
    heading('who-title', 'THE TOP 1% LÀ AI?', 42),
    text('who-no', 'KHÔNG PHẢI những người giàu nhất, có địa vị cao nhất hay thành công nhất về tiền bạc vật chất.', '#E5C36A', 'center'),
    text('who-yes', 'MÀ LÀ những người sống có CHÁNH KIẾN • có SỰ NGHIỆP CHÂN MẠNG • có CUỘC ĐỜI CHÁNH ĐẠO • thành công nhờ tạo lập giá trị, giải quyết vấn đề xã hội, nâng đỡ người khác và phụng sự cộng đồng.', cream, 'center'),
    image('who-image', '11jCgpbg3fKfayhKZxfZqYPiVOrik85KQ', 'Cộng đồng The Top 1%')
  ], { background: '#0A0F1C', padding: 56, gap: 26 })

  const foundations = container('thetop-foundations', [
    heading('foundations-title', 'THE TOP 1% — XÂY DỰNG 3 NỀN TẢNG CON NGƯỜI', 40),
    container('foundations-grid', [
      pillar('foundation-family', '01 • GIA ĐÌNH & BẠN BÈ', 'CLB Trường Sinh An Lạc\nMột môi trường nâng đỡ, cùng hướng thiện, hướng thượng; một nơi để trở về, phụng sự và cống hiến.', '#073B22'),
      pillar('foundation-spirit', '02 • CHUYỂN ĐỔI TÂM THỨC', 'Thấu hiểu Bản Ngã\nChuyển hóa Tập Khí\nKhai mở Trí Tuệ\nSống tỉnh thức, nội tâm vững vàng và an lạc.', '#35104F'),
      pillar('foundation-career', '03 • SỰ NGHIỆP & THU NHẬP', 'Xây dựng tự do tài chính\nSự nghiệp lợi mình, lợi người, lợi chúng sinh\nTrở thành Doanh Nhân Tam Bảo.', '#0B3158')
    ], { columns: 3, gap: 24 }),
    image('foundations-image', '174m80UAa1q3d_vyG8QjTuvx9d_W8Yhp-', 'Ba nền tảng The Top 1%')
  ], { background: '#0D1422', padding: 56 })

  const journey = container('hanh-trinh', [
    heading('journey-title', 'BẢN ĐỒ CON ĐƯỜNG VƯƠN TỚI THE TOP 1%', 40),
    text('journey-path', 'THÀNH VIÊN  →  LEADERS PHỤNG SỰ  →  LEADERS KHỞI XƯỚNG  →  DOANH NHÂN TAM BẢO  →  THE TOP 1%', cream, 'center'),
    button('journey-button', 'BẮT ĐẦU HÀNH TRÌNH NGAY', '#courses')
  ], { background: '#09182A', padding: 60, align: 'center' })

  const programs: WebsiteNode = { id: 'courses', kind: 'courses', text: 'CÁC KHÓA HỌC NỔI BẬT', url: '', html: '', css: '', courseIds: [], style: { background: '#0A0F1C', color: cream, padding: 40 }, mobile: { padding: 20 }, children: [] }

  const community = container('thetop-community', [
    heading('community-title', 'HOẠT ĐỘNG CỘNG ĐỒNG', 40),
    image('community-image', '1gExIBj-I7cgD_GJ5q1tUyMUWQsuWeZvJ', 'Hoạt động cộng đồng The Top 1%'),
    text('community-text', 'HƠI THỞ DIỆU KỲ  •  TREKKING & KHÁM PHÁ  •  QUỸ THIỆN HUỆ  •  DU LỊCH & DU XUÂN  •  KẾT NỐI DOANH NHÂN', cream, 'center'),
    button('community-cta', 'THAM GIA CỘNG ĐỒNG', '#hanh-trinh')
  ], { background: '#07101F', padding: 56 })

  const footer = container('thetop-footer', [
    heading('footer-brand', 'THE TOP 1%', 30),
    text('footer-tagline', 'Thịnh vượng và hạnh phúc trên con đường minh triết.', cream, 'center')
  ], { background: '#050912', padding: 36, align: 'center' })

  return {
    id: 'thetop1',
    version: 1,
    name,
    description: 'Website Học viện The Top 1% — Thịnh vượng & Hạnh phúc trên con đường minh triết',
    color: gold,
    background: dark,
    layout: { maxWidth: 1600, padding: 0, gap: 0, fontFamily: 'serif', showHeader: false, showFooter: false },
    pages: [{ id: 'thetop-home', title: 'Trang chủ', slug: '', nodes: [hero, pillars, cause, founder, who, foundations, journey, programs, community, footer] }, { id: 'thetop-about', title: 'Về The Top 1%', slug: 've-chung-toi', nodes: [] }, { id: 'thetop-courses', title: 'Khóa học', slug: 'khoa-hoc', nodes: [] }]
  }
}
