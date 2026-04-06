import { PrismaClient, Role } from '@prisma/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config()

const options: any = {
    datasourceUrl: process.env.DATABASE_URL
}

const prisma = new PrismaClient(options)

async function main() {
    console.log('Starting seed...')
    try {
        const admin = await prisma.user.upsert({
            where: { id: 0 },
            update: {},
            create: {
                id: 0,
                email: 'admin@brk.com',
                name: 'BRK Admin',
                role: Role.ADMIN,
                phone: '0909000000',
                password: '$2b$10$EpRnTzVlqHNP0.fMdQbL.e/KA/1h.q9s525aw.z8M.CI6k.v1Giv2',
            },
        })
        console.log('Seed admin:', { admin })

        const tools = [
            {
                slug: 'youtube-links',
                name: 'Lấy Link YouTube',
                description: 'bgRed600|Lấy link video từ playlist/kênh YouTube',
                icon: 'Youtube',
                url: '/tools/youtube-links',
                roles: [],
                order: 1,
                isActive: true,
            },
            {
                slug: 'youtube-manager',
                name: 'Quản lý Video',
                description: 'bgRed700|Quản lý và publish video hàng loạt',
                icon: 'Youtube',
                url: '/tools/youtube-manager',
                roles: [Role.STUDENT],
                order: 2,
                isActive: true,
            },
            {
                slug: 'settings',
                name: 'Cài Đặt',
                description: 'bgGray500|Cài đặt theme và cấu hình',
                icon: 'Settings',
                url: '/admin/settings',
                roles: [],
                order: 3,
                isActive: true,
            },
            {
                slug: 'affiliate',
                name: 'Affiliate',
                description: 'bgEmerald500|Quản lý affiliate marketing',
                icon: 'DollarSign',
                url: '/admin/affiliate',
                roles: [Role.STUDENT],
                order: 4,
                isActive: true,
            },
            {
                slug: 'genealogy',
                name: 'Nhân Mạch',
                description: 'bgIndigo500|Quản lý cây phả hệ',
                icon: 'Users',
                url: '/admin/genealogy',
                roles: [Role.STUDENT],
                order: 5,
                isActive: true,
            },
            {
                slug: 'payments',
                name: 'Thanh Toán',
                description: 'bgGreen500|Quản lý thanh toán',
                icon: 'CreditCard',
                url: '/admin/payments',
                roles: [Role.TEACHER],
                order: 6,
                isActive: true,
            },
            {
                slug: 'students',
                name: 'Thành Viên',
                description: 'bgCyan500|Quản lý học viên',
                icon: 'Users',
                url: '/admin/students',
                roles: [Role.TEACHER],
                order: 7,
                isActive: true,
            },
            {
                slug: 'courses',
                name: 'Khóa Học',
                description: 'bgOrange500|Quản lý khóa học',
                icon: 'BookOpen',
                url: '/admin/courses',
                roles: [Role.TEACHER],
                order: 8,
                isActive: true,
            },
            {
                slug: 'posts',
                name: 'Bảng Tin',
                description: 'bgBlue500|Quản lý bài đăng',
                icon: 'FileText',
                url: '/admin/posts',
                roles: [Role.ADMIN],
                order: 9,
                isActive: true,
            },
            {
                slug: 'reserved-ids',
                name: 'Số Đẹp',
                description: 'bgPurple500|Quản lý số đẹp',
                icon: 'Gem',
                url: '/admin/reserved-ids',
                roles: [Role.ADMIN],
                order: 10,
                isActive: true,
            },
            {
                slug: 'roadmap',
                name: 'Lộ Trình',
                description: 'bgTeal500|Quản lý lộ trình học',
                icon: 'Map',
                url: '/admin/roadmap',
                roles: [Role.ADMIN],
                order: 11,
                isActive: true,
            },
            {
                slug: 'campaigns',
                name: 'Email MKT',
                description: 'bgRed400|Quản lý chiến dịch email marketing',
                icon: 'Mail',
                url: '/admin/campaigns',
                roles: [Role.ADMIN],
                order: 12,
                isActive: true,
            },
        ]

        for (const tool of tools) {
            await prisma.tool.upsert({
                where: { slug: tool.slug },
                update: tool,
                create: tool,
            })
        }
        console.log('Seed tools: OK')

    } catch (error) {
        console.error('Seed failed:', error)
        throw error
    }
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
