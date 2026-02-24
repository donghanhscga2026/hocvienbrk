
import fs from 'fs'
import csv from 'csv-parser'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface CourseRow {
    id_lop: string
    name_lop: string
    id_khoa: string
    name_khoa: string
    date_join: string
    status: string
    mo_ta_dai: string
    link_zalo: string
    phi_coc: string
    stk: string
    name_stk: string
    bank_stk: string
    noidung_stk: string
    link_qrcode: string
    file_email: string
    noidung_email: string
    link_anh_bia_khoa: string
    mo_ta_ngan: string
}

async function main() {
    const results: CourseRow[] = []
    const csvFilePath = 'KhoaHoc.csv'

    if (!fs.existsSync(csvFilePath)) {
        console.error(`Error: File '${csvFilePath}' not found.`)
        process.exit(1)
    }

    console.log('Reading KhoaHoc.csv...')
    await new Promise((resolve, reject) => {
        fs.createReadStream(csvFilePath)
            .pipe(csv())
            .on('data', (data: CourseRow) => results.push(data))
            .on('end', resolve)
            .on('error', reject)
    })

    console.log(`Loaded ${results.length} course entries.`)

    let successCount = 0
    for (const row of results) {
        if (!row.id_khoa) continue;

        // Xử lý trùng id_khoa bằng cách tạo unique ID kết hợp tên lớp nếu cần
        // Đặc biệt cho trường hợp AI
        const uniqueKey = row.id_khoa === 'AI' ? `${row.id_khoa}_${row.name_lop.substring(0, 10)}` : row.id_khoa;

        try {
            await (prisma as any).course.upsert({
                where: { id_khoa: uniqueKey },
                update: {
                    name_lop: row.name_lop,
                    name_khoa: row.name_khoa,
                    date_join: row.date_join,
                    status: row.status.toUpperCase() === 'TRUE',
                    mo_ta_ngan: row.mo_ta_ngan,
                    mo_ta_dai: row.mo_ta_dai,
                    link_anh_bia: row.link_anh_bia_khoa,
                    link_zalo: row.link_zalo,
                    phi_coc: parseInt(row.phi_coc) || 0,
                    stk: row.stk,
                    name_stk: row.name_stk,
                    bank_stk: row.bank_stk,
                    noidung_stk: row.noidung_stk,
                    link_qrcode: row.link_qrcode,
                    file_email: row.file_email,
                    noidung_email: row.noidung_email,
                },
                create: {
                    id_khoa: uniqueKey,
                    name_lop: row.name_lop,
                    name_khoa: row.name_khoa,
                    date_join: row.date_join,
                    status: row.status.toUpperCase() === 'TRUE',
                    mo_ta_ngan: row.mo_ta_ngan,
                    mo_ta_dai: row.mo_ta_dai,
                    link_anh_bia: row.link_anh_bia_khoa,
                    link_zalo: row.link_zalo,
                    phi_coc: parseInt(row.phi_coc) || 0,
                    stk: row.stk,
                    name_stk: row.name_stk,
                    bank_stk: row.bank_stk,
                    noidung_stk: row.noidung_stk,
                    link_qrcode: row.link_qrcode,
                    file_email: row.file_email,
                    noidung_email: row.noidung_email,
                }
            })
            successCount++
        } catch (error) {
            console.error(`❌ Failed to seed course ${row.id_khoa}:`, error)
        }
    }

    console.log(`✅ Seeded ${successCount} courses successfully.`)
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
