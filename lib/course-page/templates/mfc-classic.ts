import { CoursePage } from '@/lib/course-page/types'

export function createClassicCoursePage(slug: string): CoursePage {
  const now = new Date().toISOString()
  return {
    id: 'mfc-classic-template',
    slug,
    name: 'MFC Classic Salespage',
    status: 'published',
    useTemplate: true,
    publishedAt: now,
    createdAt: now,
    updatedAt: now,
    seo: { title: '', description: '' },
    theme: {
      primaryColor: '#C9683C',
      secondaryColor: '#E8C468',
      backgroundColor: '#1A1B26',
      surfaceColor: '#242633',
      textColor: '#F2E8D5',
      mutedTextColor: '#A9A7A1',
    },
    navigation: { shortName: 'MFC', ctaText: 'Kích hoạt ngay', sticky: true },
    checkoutConfig: {
      enabled: true, provider: 'vietqr', currency: 'VND',
      paymentDescriptionPrefix: 'CK', orderExpirationMinutes: 15,
      registrationFields: [
        { name: 'fullName', label: 'Họ và tên', type: 'text', required: true },
        { name: 'phone', label: 'Số điện thoại', type: 'tel', required: true },
      ],
      successMode: 'show_message',
    },
    sections: [
      { id:'classic-hero', sectionKey:'hero', type:'hero', enabled:true, sortOrder:10, visibility:'all', variant:'classic', content:{ title:'Tên khóa học', description:'Mô tả ngắn của khóa học', primaryCta:{label:'Kích hoạt ngay',action:'open_registration'} } },
      { id:'classic-benefits', sectionKey:'benefits', type:'benefits', enabled:true, sortOrder:20, visibility:'all', variant:'classic', content:{ title:'Bạn sẽ nhận được gì?', items:[] } },
      { id:'classic-curriculum', sectionKey:'curriculum', type:'curriculum', enabled:true, sortOrder:30, visibility:'all', variant:'classic', content:{ title:'Nội dung khóa học' } },
      { id:'classic-testimonials', sectionKey:'testimonials', type:'testimonials', enabled:true, sortOrder:40, visibility:'all', variant:'classic', content:{ title:'Cảm nhận học viên' } },
      { id:'classic-pricing', sectionKey:'pricing', type:'pricing', enabled:true, sortOrder:50, visibility:'unregistered', variant:'classic', content:{ title:'Kích hoạt khóa học', plans:[], paymentNote:'', securePaymentText:'' } },
    ] as any,
  }
}
