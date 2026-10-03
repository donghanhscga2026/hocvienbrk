import { CoursePage } from '@/lib/course-page/types'

const IMG = {
  hero: 'https://w.ladicdn.com/s750x1000/63ea07ec81c3610012d4afa0/gia-dinh-ngam-binh-minh-ben-thung-lung-20261003094557-1swxa.png',
  seed: 'https://w.ladicdn.com/s750x1000/63ea07ec81c3610012d4afa0/dong-hanh-cung-con-yeu-thuong-nay-mam-20261003094317-zx8l7.png',
  environment: 'https://w.ladicdn.com/s750x1000/63ea07ec81c3610012d4afa0/pique-nique-familial-au-jardin-dore-20261003102144-hw5vt.png',
  experts: 'https://w.ladicdn.com/s450x400/63ea07ec81c3610012d4afa0/3-20261003094948-qwvft.png',
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
      { id:'wg-hero', sectionKey:'hero', type:'hero', enabled:true, sortOrder:10, visibility:'all', variant:'section-light', anchorId:'gioi-thieu', content:{
        eyebrow:'WI.GROW • WIPA', title:'Đồng hành cùng con', highlightedText:'Tuổi dậy thì',
        description:'WI.GROW là dự án thuộc hệ sinh thái WIPA, kiến tạo môi trường trưởng thành bắt đầu từ gia đình, nơi cha mẹ, trẻ và chuyên gia cùng học, cùng thực hành và cùng lan tỏa những giá trị tốt đẹp.',
        imageUrl:IMG.hero, imageAlt:'Đồng hành cùng con tuổi dậy thì',
        primaryCta:{label:'Đăng ký tham gia',action:'open_registration'}, secondaryCta:{label:'Tìm hiểu hành trình',action:'scroll',target:'tam-nhin'}
      }},
      { id:'wg-seed', sectionKey:'seed', type:'rich_content', enabled:true, sortOrder:20, visibility:'all', variant:'section-light', anchorId:'yeu-thuong', content:{
        eyebrow:'WI.GROW', title:'Đất lành nuôi hạt – Yêu thương nuôi người',
        description:'Một hạt mầm cần đất tốt để bén rễ. Một đứa trẻ cũng cần một môi trường an toàn để được là chính mình, được lắng nghe và lớn lên trên hành trình yêu thương.',
        imageUrl:IMG.seed, imageAlt:'Đất lành nuôi hạt, yêu thương nuôi người', imagePosition:'right'
      }},
      { id:'wg-vision', sectionKey:'vision', type:'rich_content', enabled:true, sortOrder:30, visibility:'all', variant:'section-soft', anchorId:'tam-nhin', content:{
        eyebrow:'Tầm nhìn', title:'Gia đình là một môi trường trưởng thành',
        paragraphs:['Mỗi gia đình có thể tự trở thành một môi trường trưởng thành: cha mẹ biết kiến tạo môi trường, trẻ từng bước biết tự dẫn dắt, các gia đình cùng nâng đỡ nhau và trao truyền những giá trị tốt đẹp cho thế hệ tiếp theo.'],
        imageUrl:IMG.environment, imageAlt:'Kiến tạo môi trường cùng con trưởng thành', imagePosition:'left'
      }},
      { id:'wg-mission', sectionKey:'mission', type:'rich_content', enabled:true, sortOrder:40, visibility:'all', variant:'section-light', anchorId:'su-menh', content:{
        eyebrow:'Sứ mệnh', title:'Kết nối cha mẹ, trẻ và chuyên gia',
        paragraphs:['Kết nối cha mẹ, trẻ và chuyên gia trên một nền tảng nhận thức chung; đưa tri thức vào đời sống gia đình thông qua thực hành, trải nghiệm và kiểm chứng.','Từ đó, nuôi dưỡng năng lực thấu hiểu, lựa chọn, chịu trách nhiệm và tự chủ của mỗi người; lan tỏa những cách làm hiệu quả đến cộng đồng.']
      }},
      { id:'wg-experts', sectionKey:'experts', type:'instructor', enabled:true, sortOrder:50, visibility:'all', variant:'section-soft', anchorId:'chuyen-gia', content:{
        eyebrow:'CHUYÊN GIA', title:'Đồng hành cùng các chuyên gia', instructors:[
          {id:'ngo-manh-cuong',name:'Thầy Ngô Mạnh Cường',role:'Nhà đào tạo Tâm Thức và Năng Lượng • Cố vấn nâng tầm Nhân Hiệu & Thương Hiệu',imageUrl:IMG.experts,bio:[]},
          {id:'tran-ngoc-huong',name:'Cô Trần Ngọc Hương',role:'Thạc sĩ tâm lý học',bio:['“Đừng yêu con chỉ vì con trở thành người mà ba mẹ mong muốn. Hãy yêu con cả khi con đang học cách trở thành chính mình.”']}
        ]
      }},
      { id:'wg-journey', sectionKey:'journey', type:'rich_content', enabled:true, sortOrder:60, visibility:'all', variant:'section-light', anchorId:'sau-hanh-trinh', content:{
        eyebrow:'SAU HÀNH TRÌNH', title:'Cha mẹ có thể', imageUrl:IMG.journey, imageAlt:'Những thay đổi cha mẹ có thể đạt được sau hành trình', imagePosition:'top',
        cta:{label:'Đăng ký tham gia',action:'open_registration'}
      }},
      { id:'wg-close', sectionKey:'closing', type:'closing_message', enabled:true, sortOrder:70, visibility:'all', variant:'section-success', anchorId:'dang-ky', content:{
        title:'Đồng hành cùng con – bắt đầu từ gia đình', paragraphs:['Kiến tạo môi trường trưởng thành để cha mẹ và con cùng học, cùng thực hành và cùng lớn lên.'], signature:'WI.GROW'
      }}
    ] as any
  }
}

export const WIGROW_COURSE_SLUG = '7NGAY_CUNG_CON_TUOI_DAY_THI'
