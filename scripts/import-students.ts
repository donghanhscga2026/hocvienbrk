
import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Giả lập danh sách học viên cũ (Bạn có thể đọc từ file Excel/CSV ở đây)
const oldStudents = [
    { name: 'Nguyễn Văn A', email: 'a@gmail.com', phone: '0901234567' },
    { name: 'Trần Thị B', email: 'b@gmail.com', phone: '0901234568' },
    // ... thêm 100 học viên khác
]

async function main() {
    console.log('Start importing...')

    // Mật khẩu mặc định cho học viên cũ (ví dụ: 123456)
    const defaultPassword = await bcrypt.hash('123456', 10)

    for (const student of oldStudents) {
        const user = await prisma.user.create({
            data: {
                name: student.name,
                email: student.email,
                phone: student.phone,
                password: defaultPassword,
                role: Role.STUDENT,
                // ID sẽ tự động tăng (3 -> 4 -> 5...) do Database Sequence quản lý
                // Không sợ xung đột với dữ liệu hiện tại
            },
        })
        console.log(`Created user with id: ${user.id}`)
    }

    console.log('Import finished.')
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect())
