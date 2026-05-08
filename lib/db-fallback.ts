/**
 * Dữ liệu dự phòng khi không kết nối được Database
 */

export const FALLBACK_PROFILE = {
  id: 0,
  title: 'Học Viện BRK',
  subtitle: 'Tri thức là sức mạnh - Nâng tầm năng lực thực chiến',
  showCommunity: true,
  showAllCourses: true,
  communityTitle: 'Cộng đồng học tập',
  coursesTitle: 'Khóa học tiêu biểu',
  allCoursesTitle: 'Tất cả khóa học',
  footerText: '© 2026 BRK Academy. Mọi quyền được bảo lưu.',
  backgroundColor: '#FAE0C7',
  heroImage: null,
  heroOverlay: 0.3,
  messageContent: 'Chào mừng bạn đến với cộng đồng BRK!',
  messageDetail: 'Nơi kết nối và chia sẻ những giá trị thực chiến nhất.',
  messageImage: null,
  surveyTitle: 'Khảo sát năng lực',
  customRoadmap: null,
  roadmapTitle: 'Lộ trình phát triển',
  courseIds: [],
  accentColor: '#4EB09B',
  textColor: '#333333',
  footerLinks: null,
  metaTitle: 'BRK Academy',
  metaDescription: 'Học viện đào tạo kỹ năng thực chiến hàng đầu',
  metaImage: null,
  themeId: 'classic',
  viewCount: 0,
  slug: 'brk',
  isDefault: true,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const FALLBACK_COURSES = [
  {
    id: 1,
    id_khoa: 'BRK01',
    name_lop: 'Khóa học Thực chiến AI',
    name_khoa: 'Công nghệ AI',
    status: true,
    category: 'Công nghệ',
    link_anh_bia: null,
    phi_coc: 0,
    pin: 1,
  },
  {
    id: 2,
    id_khoa: 'BRK02',
    name_lop: 'Xây dựng Nhân hiệu Gốc',
    name_khoa: 'Phát triển bản thân',
    status: true,
    category: 'Kỹ năng',
    link_anh_bia: null,
    phi_coc: 0,
    pin: 2,
  }
];

export const FALLBACK_POSTS = [];
export const FALLBACK_SURVEY = null;
export const FALLBACK_THEME = 'classic';
