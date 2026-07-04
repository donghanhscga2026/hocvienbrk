'use server'

import prisma from '@/lib/prisma'
import { auth } from '@/auth'
import { Role } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { addUserToClosure } from '@/lib/closure-helpers'
import { trackAffiliateConversion } from '@/lib/affiliate/tracking'

const DEFAULT_PASSWORD_HASH = "$2a$10$K.0H2bV8r3kPQZ3kP8YQ2.tQZQ3dZ4vF5H1dQ1pO7gK8sD6yN3q"

export interface PreviewRow {
    rowIndex: number
    name: string
    email: string
    phone: string
    referrerId: number
    status: 'NEW' | 'EXISTING' | 'CONFLICT'
    userId?: number
    conflictDetail?: string
}

interface BulkImportSummary {
    createdUsers: { id: number; name: string; email: string; phone: string }[]
    createdEnrollments: { userId: number; courseId: number }[]
    modifiedUsers: { userId: number; field: string; oldValue: string; newValue: string }[]
}

function parseCSV(text: string): string[][] {
    const rows: string[][] = []
    let currentRow: string[] = []
    let currentCell = ''
    let inQuotes = false

    for (let i = 0; i < text.length; i++) {
        const char = text[i]
        const nextChar = text[i + 1]

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                currentCell += '"'
                i++
            } else {
                inQuotes = !inQuotes
            }
        } else if (char === ',' && !inQuotes) {
            currentRow.push(currentCell)
            currentCell = ''
        } else if (char === '\n' && !inQuotes) {
            currentRow.push(currentCell)
            if (currentRow.some(cell => cell.trim())) {
                rows.push(currentRow)
            }
            currentRow = []
            currentCell = ''
        } else if (char === '\r' && !inQuotes) {
            // skip
        } else {
            currentCell += char
        }
    }
    if (currentRow.length > 0 || currentCell) {
        currentRow.push(currentCell)
        if (currentRow.some(cell => cell.trim())) {
            rows.push(currentRow)
        }
    }
    return rows
}

function extractSheetId(url: string): string | null {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
    return match ? match[1] : null
}

function normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '').replace(/^0+/, '')
}

export async function previewBulkEnrollAction(spreadsheetUrl: string, courseId: number) {
    try {
        const session = await auth()
        if (!session?.user?.id) return { success: false, error: 'Vui lòng đăng nhập.' }

        const userId = parseInt(session.user.id)
        const isAdmin = session.user.role === Role.ADMIN
        const isTeacher = session.user.role === Role.TEACHER

        if (!isAdmin && !isTeacher) return { success: false, error: 'Không có quyền thực hiện.' }

        // Verify course access
        const course = await prisma.course.findUnique({
            where: { id: courseId },
            select: { id: true, name_lop: true, teacherId: true }
        })
        if (!course) return { success: false, error: 'Khóa học không tồn tại.' }
        if (isTeacher && course.teacherId !== userId) {
            return { success: false, error: 'Bạn không phụ trách khóa học này.' }
        }

        // Extract sheet ID and fetch CSV
        const sheetId = extractSheetId(spreadsheetUrl)
        if (!sheetId) return { success: false, error: 'Link Google Sheet không hợp lệ.' }

        const response = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`)
        if (!response.ok) return { success: false, error: 'Không thể đọc Google Sheet. Vui lòng đảm bảo sheet ở chế độ public.' }

        const csvText = await response.text()
        const rows = parseCSV(csvText)
        if (rows.length < 2) return { success: false, error: 'Sheet không có dữ liệu (cần ít nhất 1 dòng header + 1 dòng dữ liệu).' }

        // Parse headers
        const headers = rows[0].map(h => h.trim().toLowerCase())
        const nameIdx = headers.indexOf('name')
        const emailIdx = headers.indexOf('email')
        const phoneIdx = headers.indexOf('phone')
        const referrerIdx = headers.indexOf('referrerid')

        if (nameIdx === -1 || emailIdx === -1 || phoneIdx === -1) {
            return { success: false, error: 'Sheet cần có các cột: name, email, phone.' }
        }

        const previewRows: PreviewRow[] = []
        let newCount = 0, existingCount = 0, conflictCount = 0

        for (let i = 1; i < rows.length; i++) {
            const cols = rows[i]
            const name = (cols[nameIdx] || '').trim()
            const email = (cols[emailIdx] || '').trim().toLowerCase()
            const phone = normalizePhone(cols[phoneIdx] || '')
            const rawReferrer = (cols[referrerIdx] || '').trim()
            const referrerId = rawReferrer ? parseInt(rawReferrer) || 0 : 0

            if (!name || !email || !phone) {
                previewRows.push({
                    rowIndex: i + 1, name, email, phone, referrerId,
                    status: 'CONFLICT',
                    conflictDetail: 'Thiếu thông tin bắt buộc (name/email/phone).'
                })
                conflictCount++
                continue
            }

            // Check DB for existing user by email OR phone
            const existingUser = await prisma.user.findFirst({
                where: {
                    OR: [
                        { email },
                        { phone: { contains: phone } }
                    ]
                }
            })

            if (!existingUser) {
                previewRows.push({ rowIndex: i + 1, name, email, phone, referrerId, status: 'NEW' })
                newCount++
            } else {
                const emailMatch = existingUser.email?.toLowerCase() === email
                const phoneMatch = normalizePhone(existingUser.phone || '') === phone

                if (emailMatch && phoneMatch) {
                    // Same user, already exists
                    previewRows.push({
                        rowIndex: i + 1, name, email, phone, referrerId,
                        status: 'EXISTING',
                        userId: existingUser.id
                    })
                    existingCount++
                } else if (emailMatch || phoneMatch) {
                    // Same user but phone or email changed
                    previewRows.push({
                        rowIndex: i + 1, name, email, phone, referrerId,
                        status: 'EXISTING',
                        userId: existingUser.id,
                        conflictDetail: emailMatch
                            ? `SĐT khác (cũ: ${existingUser.phone}, mới: ${phone})`
                            : `Email khác (cũ: ${existingUser.email}, mới: ${email})`
                    })
                    existingCount++
                } else {
                    // Both email and phone belong to different users
                    const phoneUser = await prisma.user.findFirst({
                        where: { phone: { contains: phone } }
                    })
                    previewRows.push({
                        rowIndex: i + 1, name, email, phone, referrerId,
                        status: 'CONFLICT',
                        conflictDetail: `Email thuộc user #${existingUser.id}, SĐT thuộc user #${phoneUser?.id || '?'}`
                    })
                    conflictCount++
                }
            }
        }

        // Dự đoán ID cho các user mới
        const reservedIds = await prisma.reservedId.findMany({ select: { id: true } })
        const reservedSet = new Set(reservedIds.map(r => r.id))
        const maxUser = await prisma.user.findFirst({
            where: { id: { notIn: reservedIds.map(r => r.id) } },
            orderBy: { id: 'desc' },
            select: { id: true }
        })
        let predictedId = maxUser?.id ? maxUser.id + 1 : 1

        for (const row of previewRows) {
            if (row.status === 'NEW') {
                while (reservedSet.has(predictedId)) predictedId++
                row.userId = predictedId
                predictedId++
            }
        }

        return {
            success: true,
            rows: previewRows,
            summary: { total: previewRows.length, new: newCount, existing: existingCount, conflict: conflictCount },
            course: { id: course.id, name: course.name_lop }
        }
    } catch (error: any) {
        console.error('[BulkEnroll] preview error:', error)
        return { success: false, error: error.message || 'Lỗi khi xem trước.' }
    }
}

export async function confirmBulkEnrollAction(rows: PreviewRow[], courseId: number) {
    try {
        const session = await auth()
        if (!session?.user?.id) return { success: false, error: 'Vui lòng đăng nhập.' }

        const userId = parseInt(session.user.id)
        const isAdmin = session.user.role === Role.ADMIN
        const isTeacher = session.user.role === Role.TEACHER

        if (!isAdmin && !isTeacher) return { success: false, error: 'Không có quyền thực hiện.' }

        const course = await prisma.course.findUnique({
            where: { id: courseId },
            select: { id: true, name_lop: true, teacherId: true }
        })
        if (!course) return { success: false, error: 'Khóa học không tồn tại.' }
        if (isTeacher && course.teacherId !== userId) {
            return { success: false, error: 'Bạn không phụ trách khóa học này.' }
        }

        const { getNextAvailableId } = await import('@/lib/id-helper')
        const summary: BulkImportSummary = { createdUsers: [], createdEnrollments: [], modifiedUsers: [] }
        const errors: string[] = []
        const filteredRows = rows.filter(r => r.status !== 'CONFLICT')

        // Pre-compute IDs và closure data trước transaction
        const pendingClosures: { userId: number; referrerId: number }[] = []
        const pendingAffiliates: { userId: number; referrerId: number }[] = []

        // Lấy reserved IDs + nextId 1 lần duy nhất, pattern giống preview
        const reservedIds = await prisma.reservedId.findMany({ select: { id: true } })
        const reservedSet = new Set(reservedIds.map(r => r.id))
        let nextId = await getNextAvailableId()

        for (const row of filteredRows) {
            if (row.status === 'NEW') {
                while (reservedSet.has(nextId)) nextId++
                row.userId = nextId
                nextId++
                summary.createdUsers.push({ id: row.userId, name: row.name, email: row.email, phone: row.phone })
                pendingClosures.push({ userId: row.userId, referrerId: row.referrerId || 0 })
                if (row.referrerId && row.referrerId > 0) {
                    pendingAffiliates.push({ userId: row.userId, referrerId: row.referrerId })
                }
            } else if (row.status === 'EXISTING' && row.userId) {
                const existingUser = await prisma.user.findUnique({ where: { id: row.userId } })
                if (existingUser) {
                    if (existingUser.email?.toLowerCase() !== row.email) {
                        summary.modifiedUsers.push({ userId: row.userId, field: 'email', oldValue: existingUser.email || '', newValue: row.email })
                    }
                    const oldPhone = normalizePhone(existingUser.phone || '')
                    if (oldPhone !== row.phone) {
                        summary.modifiedUsers.push({ userId: row.userId, field: 'phone', oldValue: existingUser.phone || '', newValue: row.phone })
                    }
                }
            }
        }

        // Transaction chỉ cho CRUD thiết yếu
        await prisma.$transaction(async (tx) => {
            for (const row of filteredRows) {
                try {
                    if (row.status === 'NEW' && row.userId) {
                        await tx.user.create({
                            data: {
                                id: row.userId,
                                name: row.name,
                                email: row.email,
                                phone: row.phone,
                                role: 'STUDENT' as Role,
                                referrerId: row.referrerId || 0,
                                password: DEFAULT_PASSWORD_HASH
                            }
                        })
                    } else if (row.status === 'EXISTING' && row.userId) {
                        const updates: any = {}
                        const mods = summary.modifiedUsers.filter(m => m.userId === row.userId)
                        for (const m of mods) updates[m.field] = m.newValue
                        if (Object.keys(updates).length > 0) {
                            await tx.user.update({ where: { id: row.userId }, data: updates })
                        }
                    }

                    if (row.userId && row.userId === 2689) {
                        errors.push(`Dòng #${row.rowIndex}: Tài khoản test #2689 không được phép tham gia khóa học`)
                        continue
                    }
                    if (row.userId) {
                        await tx.enrollment.upsert({
                            where: { userId_courseId: { userId: row.userId, courseId } },
                            update: { status: 'ACTIVE', startedAt: new Date() },
                            create: { userId: row.userId, courseId, status: 'ACTIVE', startedAt: new Date() }
                        })
                        summary.createdEnrollments.push({ userId: row.userId, courseId })
                    }
                } catch (err: any) {
                    errors.push(`Dòng #${row.rowIndex}: ${err.message}`)
                }
            }
        }, { timeout: 60000 })

        // Closure + affiliate tracking sau transaction
        for (const p of pendingClosures) {
            try { await addUserToClosure(p.userId, p.referrerId) } catch (e) { /* non-critical */ }
        }
        for (const p of pendingAffiliates) {
            try {
                await trackAffiliateConversion({ refCode: p.referrerId.toString(), userId: p.userId, type: 'REGISTRATION' })
            } catch (e) { /* non-critical */ }
        }

        // Write log
        const log = await prisma.bulkImportLog.create({
            data: {
                courseId,
                userId,
                summary: JSON.stringify(summary)
            }
        })

        // Auto-verify email + Telegram cho user mới (email gửi qua Email MKT campaign riêng)
        const { sendTelegram } = await import('@/lib/notifications')
        for (const row of filteredRows) {
            if (!row.userId) continue
            try {
                if (row.status === 'NEW') {
                    await prisma.user.update({
                        where: { id: row.userId },
                        data: { emailVerified: new Date() }
                    })
                    const teleMsg = `🎓 <b>BULK ENROLL - TẠO TÀI KHOẢN MỚI</b>\n👤 Học viên: <b>${row.name}</b> (#${row.userId})\n📧 Email: ${row.email}\n📚 Khóa học: <b>${course.name_lop}</b>`
                    await sendTelegram(teleMsg, 'ACTIVATE')
                }
            } catch (e) {
                // non-critical
            }
        }

        return {
            success: true,
            batchId: log.id,
            created: summary.createdUsers.length,
            enrolled: summary.createdEnrollments.length,
            modified: summary.modifiedUsers.length,
            errors: errors.length > 0 ? errors : undefined
        }
    } catch (error: any) {
        console.error('[BulkEnroll] confirm error:', error)
        return { success: false, error: error.message || 'Lỗi khi ghi danh.' }
    }
}

export async function revertBulkEnrollAction(batchId: string) {
    try {
        const session = await auth()
        if (!session?.user?.id) return { success: false, error: 'Vui lòng đăng nhập.' }

        const isAdmin = session.user.role === Role.ADMIN
        const isTeacher = session.user.role === Role.TEACHER
        if (!isAdmin && !isTeacher) return { success: false, error: 'Không có quyền thực hiện.' }

        const log = await prisma.bulkImportLog.findUnique({ where: { id: batchId } })
        if (!log) return { success: false, error: 'Không tìm thấy lịch sử import.' }
        if (log.revertedAt) return { success: false, error: 'Thao tác này đã được hoàn tác trước đó.' }

        const summary: BulkImportSummary = typeof log.summary === 'string' ? JSON.parse(log.summary) : log.summary

        await prisma.$transaction(async (tx) => {
            // Delete enrollments created
            for (const enr of summary.createdEnrollments) {
                await tx.enrollment.deleteMany({
                    where: { userId: enr.userId, courseId: enr.courseId }
                })
            }

            // Delete newly created users (only if they have no other data)
            for (const u of summary.createdUsers) {
                const otherEnrollments = await tx.enrollment.count({
                    where: { userId: u.id, courseId: { not: log.courseId } }
                })
                if (otherEnrollments === 0) {
                    await tx.userClosure.deleteMany({ where: { descendantId: u.id } })
                    await tx.userClosure.deleteMany({ where: { ancestorId: u.id } })
                    await tx.user.delete({ where: { id: u.id } })
                }
            }

            // Restore modified users
            for (const mod of summary.modifiedUsers) {
                await tx.user.update({
                    where: { id: mod.userId },
                    data: { [mod.field]: mod.oldValue }
                })
            }

            // Mark log as reverted
            await tx.bulkImportLog.update({
                where: { id: batchId },
                data: { revertedAt: new Date() }
            })
        })

        return {
            success: true,
            revertedUsers: summary.createdUsers.length,
            revertedEnrollments: summary.createdEnrollments.length,
            restoredModifications: summary.modifiedUsers.length
        }
    } catch (error: any) {
        console.error('[BulkEnroll] revert error:', error)
        return { success: false, error: error.message || 'Lỗi khi hoàn tác.' }
    }
}
