import { makeNode, WebsiteNode } from './document'

export const sections = [
  ['hero','Hero / lời giới thiệu'], ['about','Về doanh nghiệp'], ['benefits','Lợi ích / dịch vụ'],
  ['gallery','Thư viện ảnh'], ['team','Đội ngũ / chuyên gia'], ['stats','Số liệu nổi bật'],
  ['pricing','Bảng giá'], ['faq','Câu hỏi thường gặp'], ['cta','Kêu gọi hành động'], ['footer','Chân trang tự thiết kế'],
] as const
export function makeSection(key: string): WebsiteNode {
  const section = makeNode('container'); section.text = sections.find(s => s[0] === key)?.[1] || 'Section'
  section.style = { padding: 32, gap: 24, background: '#f8fafc', radius: 20 }; section.mobile = { padding: 20, columns: 1 }
  const title = (text: string) => { const n=makeNode('heading'); n.text=text; return n }
  const text = (value: string) => { const n=makeNode('text'); n.text=value; return n }
  const button = (label: string) => { const n=makeNode('button'); n.text=label; n.url='#courses'; return n }
  const cards = (values: string[]) => { const layout=makeNode('container'); layout.style.columns=values.length; layout.mobile.columns=1; layout.children=values.map(value=>{ const card=makeNode('container'); card.style={ padding:24,background:'#ffffff',radius:16,gap:16 }; card.children=[title(value),text('Thay nội dung này bằng thông tin của bạn.')]; return card }); return layout }
  switch(key) {
    case 'hero': section.children=[title('Giải pháp giúp khách hàng phát triển'),text('Một lời giới thiệu rõ ràng về giá trị bạn mang lại.'),button('Khám phá ngay')]; section.style.padding=64; section.children[0].style.fontSize=48; section.children[0].mobile.fontSize=30; break
    case 'about': { section.style.columns=2; const content=makeNode('container'); content.children=[title('Câu chuyện của chúng tôi'),text('Chia sẻ sứ mệnh, hành trình và điều tạo nên sự khác biệt.')]; section.children=[content,makeNode('image')]; break }
    case 'benefits': section.children=[title('Giá trị dành cho bạn'),cards(['Giá trị 1','Giá trị 2','Giá trị 3'])]; break
    case 'gallery': { const images=makeNode('container'); images.style.columns=3; images.mobile.columns=1; images.children=[makeNode('image'),makeNode('image'),makeNode('image')]; section.children=[title('Khoảnh khắc nổi bật'),images]; break }
    case 'team': { const team=cards(['Chuyên gia 1','Chuyên gia 2']); team.children.forEach(card=>card.children.unshift(makeNode('image'))); section.children=[title('Đội ngũ đồng hành'),team]; break }
    case 'stats': section.children=[title('Dấu ấn của chúng tôi'),cards(['Số liệu 1','Số liệu 2','Số liệu 3'])]; break
    case 'pricing': { const plans=cards(['Gói cơ bản','Gói nâng cao','Gói đồng hành']); plans.children.forEach(card=>card.children.push(text('Thay bằng giá và quyền lợi thực tế.'),button('Xem khóa học và đăng ký'))); section.children=[title('Chọn chương trình phù hợp'),plans]; break }
    case 'faq': section.children=[title('Câu hỏi thường gặp'),title('Câu hỏi 1'),text('Viết câu trả lời tại đây.'),title('Câu hỏi 2'),text('Viết câu trả lời tại đây.')]; break
    case 'cta': section.children=[title('Bắt đầu hành trình của bạn'),text('Điều gì sẽ thay đổi khi khách hàng lựa chọn bạn?'),button('Tìm hiểu thêm')]; section.style.align='center'; break
    case 'footer': section.style.columns=3; section.children=[text('Thương hiệu\nLời giới thiệu ngắn'),text('Liên hệ\nEmail / điện thoại / địa chỉ'),text('Chính sách\nThêm các nút liên kết đến trang chính sách.')]; break
    default: section.children=[title('Section của bạn')]
  }
  return section
}
