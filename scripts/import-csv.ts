
import fs from 'fs'
import csv from 'csv-parser'
import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

interface UserRow {
    id: string
    name: string
    email: string
    phone: string
    password?: string
    role: string
    referrerId?: string
    createdAt?: string
}

async function main() {
    const results: UserRow[] = []
    const csvFilePath = 'processed-users.preview.csv'

    if (!fs.existsSync(csvFilePath)) {
        console.error(`Error: File '${csvFilePath}' not found. Please run 'npm run process-legacy' first.`)
        process.exit(1)
    }

    // Đọc toàn bộ file vào bộ nhớ
    console.log('Reading processed CSV file...')
    await new Promise((resolve, reject) => {
        fs.createReadStream(csvFilePath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', resolve)
            .on('error', reject)
    })

    console.log(`Loaded ${results.length} users.`)

    try {
        // 1. XÓA SẠCH DỮ LIỆU CŨ (Để tránh conflict ID)
        console.log('🗑️  Cleaning existing database...')
        // Xóa theo thứ tự để tránh lỗi ràng buộc khóa ngoại
        await prisma.account.deleteMany()
        await prisma.session.deleteMany()
        await prisma.user.deleteMany()
        console.log('✅ Database cleaned.')

        // 2. PHASE 1: INSERT USER (Chưa có Referrer)
        console.log('🚀 Phase 1: Inserting Users (Ignoring Referrer)...')

        // Hash password mặc định 1 lần dùng chung cho nhanh (nếu ko có pass riêng)
        const defaultHash = await bcrypt.hash('Brk@3773', 10)

        // Map để theo dõi email đã sử dụng (để tránh lỗi Unique Email)
        const usedEmails = new Set<string>()

        let successCount = 0
        for (const row of results) {

            let email = row.email
            // XỬ LÝ TRÙNG EMAIL: Nếu email đã có trong batch này
            if (usedEmails.has(email)) {
                const originalEmail = email
                email = `duplicate_${row.id}_${email}`
                console.warn(`⚠️  Email conflict for ID ${row.id}: '${originalEmail}' -> Renamed to '${email}'`)
            }
            usedEmails.add(email)

            let passwordHash = defaultHash
            if (row.password && row.password !== 'Brk@3773') {
                passwordHash = await bcrypt.hash(row.password, 10)
            }

            await prisma.user.create({
                data: {
                    id: parseInt(row.id), // GIỮ NGUYÊN ID CŨ
                    name: row.name,
                    email: email, // Email đã xử lý trùng
                    phone: row.phone,
                    password: passwordHash,
                    role: row.role as Role,
                    referrerId: null, // Để null trước, update sau
                    createdAt: row.createdAt ? new Date(row.createdAt) : new Date(),
                }
            })
            process.stdout.write('.')
            successCount++
        }
        console.log(`\n✅ Phase 1 Finished: Inserted ${successCount} users.`)

        // 3. PHASE 2: UPDATE REFERRER
        console.log('🔗 Phase 2: Linking Referrers...')
        let linkCount = 0

        // Tạo Map để tra cứu nhanh ID tồn tại (tránh lỗi key nếu referrerId ko có trong list)
        const allIds = new Set(results.map(r => parseInt(r.id)))

        for (const row of results) {
            const referrerId = row.referrerId ? parseInt(row.referrerId) : null

            if (referrerId && referrerId > 0) {
                // Chỉ update nếu referrerId CÓ TỒN TẠI trong danh sách import
                if (allIds.has(referrerId)) {
                    await prisma.user.update({
                        where: { id: parseInt(row.id) },
                        data: { referrerId: referrerId }
                    })
                    linkCount++
                } else {
                    // console.warn(`\n⚠️  Warning: User ${row.id} has referrerId ${referrerId} but that ID does not exist. Skipped link.`)
                }
            }
        }
        console.log(`\n✅ Phase 2 Finished: Linked ${linkCount} referrals.`)

        // 4. RESET SEQUENCE
        console.log('🔄 Resetting Database Sequence...')
        await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"User"', 'id'), coalesce(max(id)+1, 1), false) FROM "User";`)
        console.log('✅ Sequence reset successful.')

    } catch (error) {
        console.error('\n❌ Import Failed:', error)
    } finally {
        await prisma.$disconnect()
    }
}

main()
