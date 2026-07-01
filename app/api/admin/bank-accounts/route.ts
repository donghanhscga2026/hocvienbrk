import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { auth } from '@/auth'

export async function GET() {
    try {
        const session = await auth()
        if (session?.user?.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const accounts = await prisma.userBankAccount.findMany({
            orderBy: [{ createdAt: 'desc' }],
            include: {
                user: { select: { id: true, name: true, email: true, phone: true } },
            },
        })
        return NextResponse.json({ accounts })
    } catch (error: any) {
        return NextResponse.json({ error: 'Failed to fetch bank accounts' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const session = await auth()
        if (session?.user?.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { userId, accountType, accountHolder, accountNumber, bankName, qrCodeUrl, isDefault } = body

        if (!userId) {
            return NextResponse.json({ error: 'Vui lòng chọn người dùng' }, { status: 400 })
        }
        if (!accountHolder?.trim()) {
            return NextResponse.json({ error: 'Tên chủ tài khoản là bắt buộc' }, { status: 400 })
        }
        if (!accountNumber?.trim()) {
            return NextResponse.json({ error: 'Số tài khoản là bắt buộc' }, { status: 400 })
        }

        const user = await prisma.user.findUnique({ where: { id: userId } })
        if (!user) {
            return NextResponse.json({ error: 'Người dùng không tồn tại' }, { status: 404 })
        }

        if (isDefault) {
            await prisma.userBankAccount.updateMany({
                where: { userId, isDefault: true },
                data: { isDefault: false },
            })
        }

        const account = await prisma.userBankAccount.create({
            data: {
                userId,
                accountType: accountType || 'BANK',
                accountHolder: accountHolder.trim(),
                accountNumber: accountNumber.trim(),
                bankName: bankName || null,
                qrCodeUrl: qrCodeUrl || null,
                isDefault: isDefault || false,
            },
        })

        return NextResponse.json({ success: true, account })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function PUT(request: Request) {
    try {
        const session = await auth()
        if (session?.user?.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { id, accountType, accountHolder, accountNumber, bankName, qrCodeUrl, isDefault } = body

        if (!id) {
            return NextResponse.json({ error: 'ID tài khoản là bắt buộc' }, { status: 400 })
        }

        const existing = await prisma.userBankAccount.findUnique({ where: { id } })
        if (!existing) {
            return NextResponse.json({ error: 'Không tìm thấy tài khoản' }, { status: 404 })
        }

        if (isDefault) {
            await prisma.userBankAccount.updateMany({
                where: { userId: existing.userId, isDefault: true, id: { not: id } },
                data: { isDefault: false },
            })
        }

        const data: any = {}
        if (accountType) data.accountType = accountType
        if (accountHolder?.trim()) data.accountHolder = accountHolder.trim()
        if (accountNumber?.trim()) data.accountNumber = accountNumber.trim()
        if (bankName !== undefined) data.bankName = bankName
        if (qrCodeUrl !== undefined) data.qrCodeUrl = qrCodeUrl
        if (isDefault !== undefined) data.isDefault = isDefault

        const account = await prisma.userBankAccount.update({ where: { id }, data })

        return NextResponse.json({ success: true, account })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function DELETE(request: Request) {
    try {
        const session = await auth()
        if (session?.user?.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { id } = body

        if (!id) {
            return NextResponse.json({ error: 'ID tài khoản là bắt buộc' }, { status: 400 })
        }

        const existing = await prisma.userBankAccount.findUnique({ where: { id } })
        if (!existing) {
            return NextResponse.json({ error: 'Không tìm thấy tài khoản' }, { status: 404 })
        }

        await prisma.userBankAccount.delete({ where: { id } })
        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
