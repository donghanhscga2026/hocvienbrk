import prisma from '@/lib/prisma'

const LANDINGS = [
    {
        slug: 'hocxaykenh',
        title: 'Khóa Học Xây Kênh TikTok',
        subtitle: 'Học cách xây dựng kênh TikTok từ A-Z',
        description: 'Khóa học toàn diện giúp bạn tạo và phát triển kênh TikTok thành công. Bao gồm chiến lược nội dung, quay video, editing và cách kiếm tiền.',
        heroImage: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=1200',
        ctaText: 'Đăng ký ngay',
        template: 'hero-cta',
        config: {
            backgroundColor: '#ffffff',
            textColor: '#1a1a1a',
            accentColor: '#2563eb',
            heroOverlay: true,
            features: [
                'Học từ cơ bản đến nâng cao',
                'Cập nhật xu hướng mới nhất',
                'Hỗ trợ 1-1 từ giảng viên',
                'Cộng đồng học viên 5000+ members'
            ]
        },
        isActive: true,
        customCommission: { f1: 15, f2: 7, f3: 3 }
    },
    {
        slug: 'banhang',
        title: 'Khóa Học Bán Hàng Online',
        subtitle: 'Biến TikTok thành máy in tiền',
        description: 'Khóa học bán hàng online giúp bạn kiếm tiền từ TikTok. Học cách setup shop, dropshipping và fulfillment.',
        heroImage: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200',
        ctaText: 'Bắt đầu ngay',
        template: 'feature-grid',
        config: {
            backgroundColor: '#f9fafb',
            textColor: '#1a1a1a',
            accentColor: '#059669',
            features: [
                'Setup shop TikTok Shop',
                'Chiến lược dropshipping',
                'Quảng cáo hiệu quả',
                'Fulfillment và logistics'
            ],
            stats: {
                students: '3000+',
                rating: '4.9',
                courses: '25+'
            }
        },
        isActive: true,
        customCommission: { f1: 20, f2: 10, f3: 5 }
    },
    {
        slug: 'webinar-free',
        title: 'Webinar Miễn Phí: Cách Kiếm Tiền Từ TikTok',
        subtitle: 'Cách kiếm 10 triệu/tháng từ TikTok',
        description: 'Webinar miễn phí chia sẻ chiến lược kiếm tiền từ TikTok. Đặc biệt dành cho người mới bắt đầu.',
        heroImage: 'https://images.unsplash.com/photo-1591115765373-5207764f72e7?w=1200',
        ctaText: 'Đăng ký ngay',
        template: 'webinar-reg',
        config: {
            backgroundColor: '#ffffff',
            textColor: '#1a1a1a',
            accentColor: '#7c3aed',
            webinarDate: '20/04/2026',
            webinarTime: '20:00 - 21:30',
            webinarDuration: '90 phút',
            spotsLeft: 47,
            spotsTotal: 100,
            features: [
                'Cách chọn niche sinh lời',
                'Content strategy hiệu quả',
                'Cách viral tự nhiên',
                'Monetize kênh nhanh chóng'
            ]
        },
        isActive: true,
        customCommission: { f1: 10, f2: 5, f3: 2 }
    }
]

async function main() {
    console.log('🌱 Seeding landing pages...')
    
    for (const landing of LANDINGS) {
        const existing = await prisma.landingPage.findUnique({
            where: { slug: landing.slug }
        })
        
        if (existing) {
            console.log(`⚠️  Landing "${landing.slug}" already exists, skipping...`)
            continue
        }
        
        await prisma.landingPage.create({
            data: landing
        })
        console.log(`✅ Created landing: /landing/${landing.slug}`)
    }
    
    console.log('✨ Done!')
}

main()
    .catch((e) => {
        console.error('❌ Error:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
