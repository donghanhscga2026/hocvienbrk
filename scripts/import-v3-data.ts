import fs from 'fs'
import csv from 'csv-parser'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function readCsv(filePath: string): Promise<any[]> {
    const results: any[] = []
    return new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(results))
            .on('error', reject)
    })
}

async function main() {
    console.log('🚀 Bắt đầu quy trình nạp dữ liệu chuẩn hóa (V3 - Nâng cấp)...')

    try {
        const users = await readCsv('User.csv')
        const courses = await readCsv('Course.csv')
        const enrollments = await readCsv('Enrollment.csv')

        // 1. DỌN DẸP DATABASE
        console.log('🗑️  Đang làm sạch Database...')
        await (prisma as any).enrollment.deleteMany()
        await (prisma as any).account.deleteMany()
        await (prisma as any).session.deleteMany()
        await (prisma as any).course.deleteMany()
        await (prisma as any).user.deleteMany()
        console.log('✅ Đã làm sạch dữ liệu cũ.')

        // 2. NẠP KHÓA HỌC
        console.log('📚 Đang nạp danh sách Khóa học...')
        for (const row of courses) {
            await (prisma as any).course.create({
                data: {
                    id: parseInt(row.id),
                    id_khoa: row.id_khoa,
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
        }
        console.log(`✅ Đã nạp ${courses.length} khóa học.`)

        // 3. NẠP NGƯỜI DÙNG (Phase 1: Không có Referrer)
        console.log('👤 Đang nạp danh sách Học viên (Kèm mã hóa mật khẩu)...')
        const userCount = users.length;
        for (let i = 0; i < users.length; i++) {
            const u = users[i];
            try {
                // Mã hóa mật khẩu nếu có
                let passwordHash = null;
                if (u.password && u.password.trim() !== '') {
                    passwordHash = await bcrypt.hash(u.password.trim(), 10);
                }

                // Chuẩn hóa dữ liệu trước khi nạp
                const data: any = {
                    id: parseInt(u.id),
                    name: u.name || null,
                    email: u.email.trim(),
                    phone: u.phone && u.phone.trim() !== '' ? u.phone.trim() : null,
                    role: u.role || 'STUDENT',
                    password: passwordHash,
                };

                // Xử lý ngày tháng
                if (u.createdAt) {
                    const parts = u.createdAt.split(' ');
                    const dateParts = parts[0].split('/');
                    if (dateParts.length === 3) {
                        const d = parseInt(dateParts[0]);
                        const m = parseInt(dateParts[1]) - 1;
                        const y = parseInt(dateParts[2]);

                        if (parts[1]) {
                            const t = parts[1].split(':');
                            data.createdAt = new Date(y, m, d,
                                parseInt(t[0] || '0'),
                                parseInt(t[1] || '0'),
                                parseInt(t[2] || '0'));
                        } else {
                            data.createdAt = new Date(y, m, d);
                        }
                    } else {
                        data.createdAt = new Date(u.createdAt);
                    }
                }

                await (prisma as any).user.create({ data });
                if ((i + 1) % 100 === 0) console.log(`... Đã nạp ${i + 1}/${userCount} học viên.`);
            } catch (err: any) {
                console.error(`❌ Lỗi tại User ID ${u.id} (${u.email}):`, err);
                throw err;
            }
        }

        // 4. CẬP NHẬT REFERRER (Phase 2)
        console.log('🔗 Đang nối quan hệ Người giới thiệu...')
        for (const u of users) {
            // Sửa logic: Cho phép id 0 làm người giới thiệu
            if (u.referrerId && u.referrerId.trim() !== '') {
                await (prisma as any).user.update({
                    where: { id: parseInt(u.id) },
                    data: { referrerId: parseInt(u.referrerId) }
                }).catch(() => { });
            }
        }

        // 5. NẠP ĐĂNG KÍ KHÓA HỌC
        console.log('📋 Đang nạp danh sách Đăng ký (Enrollments)...')
        const enrCount = enrollments.length;
        for (let i = 0; i < enrollments.length; i++) {
            const e = enrollments[i];
            try {
                const data: any = {
                    userId: parseInt(e.userId),
                    courseId: parseInt(e.courseId),
                    status: e.status || 'ACTIVE',
                    phi_coc: parseInt(e.phi_coc) || 0,
                    link_anh_coc: e.link_anh_coc || null,
                };

                // Xử lý ngày bắt đầu (startedAt) nếu có
                if (e.startedAt && e.startedAt.trim() !== '') {
                    data.startedAt = new Date(e.startedAt);
                }

                if (e.createdAt) {
                    const parts = e.createdAt.split(' ');
                    const dateParts = parts[0].split('/');
                    if (dateParts.length === 3) {
                        const d = parseInt(dateParts[0]);
                        const m = parseInt(dateParts[1]) - 1;
                        const y = parseInt(dateParts[2]);
                        if (parts[1]) {
                            const t = parts[1].split(':');
                            data.createdAt = new Date(y, m, d, parseInt(t[0] || '0'), parseInt(t[1] || '0'), parseInt(t[2] || '0'));
                        } else {
                            data.createdAt = new Date(y, m, d);
                        }
                    } else {
                        data.createdAt = new Date(e.createdAt);
                    }
                }

                await (prisma as any).enrollment.create({ data });
                if ((i + 1) % 100 === 0) console.log(`... Đã nạp ${i + 1}/${enrCount} lượt đăng ký.`);
            } catch (err: any) {
                console.error(`❌ Lỗi tại Enrollment dòng ${i + 2} (User: ${e.userId}, Course: ${e.courseId}):`, err.message);
                // Nếu là lỗi trùng lặp (P2002), ta có thể bỏ qua
                if (!err.message.includes('P2002')) throw err;
            }
        }
        console.log(`✅ Đã hoàn tất nạp lượt đăng ký.`)

        // 6. RESET SEQUENCES (PostgreSQL)
        console.log('🔄 Đang đồng bộ lại bộ đếm ID (Sequence)...')
        await (prisma as any).$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"User"', 'id'), (SELECT MAX(id) FROM "User"));`)
        await (prisma as any).$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"Course"', 'id'), (SELECT MAX(id) FROM "Course"));`)
        await (prisma as any).$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"Enrollment"', 'id'), (SELECT MAX(id) FROM "Enrollment"));`)
        console.log('🎯 HOÀN TẤT NẠP DỮ LIỆU CHUẨN HÓA V3!')

    } catch (error) {
        console.error('❌ LỖI TRONG QUÁ TRÌNH NẠP:', error)
    } finally {
        await prisma.$disconnect()
    }
}

main()
