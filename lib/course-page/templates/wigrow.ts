import { CoursePage } from '@/lib/course-page/types'

const IMG = {
  hero: 'https://w.ladicdn.com/s750x1000/63ea07ec81c3610012d4afa0/gia-dinh-ngam-binh-minh-ben-thung-lung-20261003094557-1swxa.png',
  seed: 'https://w.ladicdn.com/s750x1000/63ea07ec81c3610012d4afa0/dong-hanh-cung-con-yeu-thuong-nay-mam-20261003094317-zx8l7.png',
  environment: 'https://w.ladicdn.com/s750x1000/63ea07ec81c3610012d4afa0/pique-nique-familial-au-jardin-dore-20261003102144-hw5vt.png',
  expertCuong: 'https://w.ladicdn.com/s550x550/63ea07ec81c3610012d4afa0/7795333d9d4d1d13445c-20261003085616-lwvmg.jpg',
  expertHuong: 'https://w.ladicdn.com/s550x650/63ea07ec81c3610012d4afa0/2aobor2vwqeptssfwxmgwuspvclt2mjf14ylhzt6-20261003102820-jhqx_.jpg',
  journey: 'https://w.ladicdn.com/s700x950/63ea07ec81c3610012d4afa0/2aobor2w9dx9n9aky9xswqrin1ggkuyvvim0fsla-20261003105147-h47uh.jpg',
}

export function createWiGrowCoursePage(slug: string): CoursePage {
  const now = new Date().toISOString()
  return {
    id: 'wigrow-template',
    slug,
    name: '7 Ngày Đồng Hành Cùng Con Tuổi Dậy Thì',
    status: 'published',
    useTemplate: true,
    publishedAt: now,
    createdAt: now,
    updatedAt: now,
    seo: {
      title: '7 Ngày Đồng Hành Cùng Con Tuổi Dậy Thì | WI.GROW',
      description: 'Đồng hành cùng con tuổi dậy thì trong môi trường trưởng thành bắt đầu từ gia đình.',
      image: IMG.hero,
    },
    theme: {
      primaryColor: '#17863B',
      secondaryColor: '#F5B62E',
      accentColor: '#219653',
      backgroundColor: '#FFFDF5',
      surfaceColor: '#F2F8E9',
      textColor: '#174B2A',
      mutedTextColor: '#405848',
      borderColor: '#DCE9D8',
      borderRadius: '22px',
      buttonRadius: '12px',
      containerWidth: '1120px',
    },
    navigation: {
      shortName: 'WI.GROW',
      ctaText: 'Đăng ký tham gia',
      ctaTargetSectionId: 'dang-ky',
      sticky: true,
      showProgress: false,
    },
    checkoutConfig: {
      enabled: true,
      provider: 'vietqr',
      currency: 'VND',
      paymentDescriptionPrefix: 'WIGROW',
      orderExpirationMinutes: 15,
      registrationFields: [
        { name: 'fullName', label: 'Họ và tên', type: 'text', required: true },
        { name: 'phone', label: 'Số điện thoại', type: 'tel', required: true },
        { name: 'email', label: 'Email', type: 'email', required: false },
      ],
      successMode: 'show_message',
    },
    sections: [
      { id:'wg-art-hero', sectionKey:'art-hero', type:'wigrow_artwork', enabled:true, sortOrder:10, visibility:'all', variant:'source', anchorId:'gioi-thieu', content:{ imageUrl:IMG.hero, imageAlt:'Đồng hành cùng con tuổi dậy thì', maxWidth:750, background:'#ffffff', overlay:{ title:'Đồng hành\nCùng con', accent:'Tuổi dậy thì', top:22 } }},
      { id:'wg-intro', sectionKey:'intro', type:'rich_content', enabled:true, sortOrder:20, visibility:'all', variant:'section-light', anchorId:'gioi-thieu-du-an', content:{
        eyebrow:'WI.GROW', title:'Kiến tạo môi trường trưởng thành bắt đầu từ gia đình',
        description:'WI.GROW là dự án thuộc hệ sinh thái WIPA, kiến tạo môi trường trưởng thành bắt đầu từ gia đình, nơi cha mẹ, trẻ và chuyên gia cùng học, cùng thực hành và cùng lan tỏa những giá trị tốt đẹp.',
        cta:{label:'Đăng ký tham gia',action:'open_registration'}
      }},
      { id:'wg-art-seed', sectionKey:'art-seed', type:'wigrow_artwork', enabled:true, sortOrder:30, visibility:'all', variant:'source', anchorId:'yeu-thuong', content:{ imageUrl:IMG.seed, imageAlt:'Đất lành nuôi hạt – Yêu thương nuôi người', maxWidth:750, background:'#ffffff', overlay:{ title:'Đất lành nuôi hạt', accent:'Yêu thương nuôi người', description:'Một hạt mầm cần đất tốt để bén rễ. Một đứa trẻ cũng cần một môi trường an toàn để được là chính mình, được lắng nghe và lớn lên trên hành trình yêu thương', top:17 } }},
      { id:'wg-vision', sectionKey:'vision', type:'rich_content', enabled:true, sortOrder:40, visibility:'all', variant:'section-soft', anchorId:'tam-nhin', content:{
        eyebrow:'Tầm nhìn', title:'Gia đình là một môi trường trưởng thành',
        paragraphs:['Mỗi gia đình có thể tự trở thành một môi trường trưởng thành: cha mẹ biết kiến tạo môi trường, trẻ từng bước biết tự dẫn dắt, các gia đình cùng nâng đỡ nhau và trao truyền những giá trị tốt đẹp cho thế hệ tiếp theo.']
      }},
      { id:'wg-mission', sectionKey:'mission', type:'rich_content', enabled:true, sortOrder:50, visibility:'all', variant:'section-light', anchorId:'su-menh', content:{
        eyebrow:'Sứ mệnh', title:'Kết nối cha mẹ, trẻ và chuyên gia',
        paragraphs:['Kết nối cha mẹ, trẻ và chuyên gia trên một nền tảng nhận thức chung; đưa tri thức vào đời sống gia đình thông qua thực hành, trải nghiệm và kiểm chứng.','Từ đó, nuôi dưỡng năng lực thấu hiểu, lựa chọn, chịu trách nhiệm và tự chủ của mỗi người; lan tỏa những cách làm hiệu quả đến cộng đồng.']
      }},
      { id:'wg-art-environment', sectionKey:'art-environment', type:'wigrow_artwork', enabled:true, sortOrder:60, visibility:'all', variant:'source', anchorId:'kien-tao-moi-truong', content:{ imageUrl:IMG.environment, imageAlt:'Kiến tạo môi trường – Cùng con trưởng thành', maxWidth:750, background:'#ffffff', overlay:{ title:'Kiến tạo môi trường', accent:'Cùng con trưởng thành', description:'WI.GROW là dự án thuộc hệ sinh thái WIPA, kiến tạo môi trường trưởng thành bắt đầu từ gia đình, nơi cha mẹ, trẻ và chuyên gia cùng học, cùng thực hành và cùng lan tỏa những giá trị tốt đẹp.', top:16 } }},
      { id:'wg-experts', sectionKey:'experts', type:'instructor', enabled:true, sortOrder:70, visibility:'all', variant:'section-soft', anchorId:'chuyen-gia', content:{
        eyebrow:'CHUYÊN GIA', title:'Đồng hành cùng các chuyên gia', instructors:[
          {id:'ngo-manh-cuong',name:'Thầy Ngô Mạnh Cường',role:'Nhà đào tạo Tâm Thức và Năng Lượng • Cố vấn nâng tầm Nhân Hiệu & Thương Hiệu',imageUrl:IMG.expertCuong,bio:[]},
          {id:'tran-ngoc-huong',name:'Cô Trần Ngọc Hương',role:'Thạc sĩ tâm lý học',imageUrl:IMG.expertHuong,bio:['“Đừng yêu con chỉ vì con trở thành người mà ba mẹ mong muốn. Hãy yêu con cả khi con đang học cách trở thành chính mình.”']}
        ]
      }},
      { id:'wg-art-journey', sectionKey:'art-journey', type:'wigrow_artwork', enabled:true, sortOrder:80, visibility:'all', variant:'source', anchorId:'sau-hanh-trinh', content:{ imageUrl:IMG.journey, imageAlt:'Sau hành trình, cha mẹ có thể', maxWidth:700, background:'#ffffff' }},
      { id:'wg-register', sectionKey:'register', type:'closing_message', enabled:true, sortOrder:90, visibility:'all', variant:'section-success', anchorId:'dang-ky', content:{
        title:'Đăng ký tham gia', paragraphs:['Đồng hành cùng con tuổi dậy thì – bắt đầu từ gia đình.'], signature:'WI.GROW'
      }}
    ] as any
  }
}

export const WIGROW_COURSE_SLUG = '7NGAY_CUNG_CON_TUOI_DAY_THI'
