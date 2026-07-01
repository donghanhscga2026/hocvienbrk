import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { auth } from '@/auth'

export async function GET(request: Request) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        const currentUserId = parseInt(session.user.id)

        const { searchParams } = new URL(request.url)
        const targetUserId = searchParams.get('userId')

        let userId = currentUserId
        if (targetUserId) {
            const targetId = parseInt(targetUserId)
            if (targetId !== currentUserId) {
                const isAdmin = session.user.role === 'ADMIN'
                const currentUser = await prisma.user.findUnique({ where: { id: currentUserId }, select: { role: true } })
                if (currentUser?.role !== 'ADMIN') {
                    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
                }
            }
            userId = targetId
        }

        const accounts = await prisma.userBankAccount.findMany({
            where: { userId },
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
        })
        return NextResponse.json({ accounts })
    } catch (error: any) {
        console.error('Get bank accounts error:', error)
        return NextResponse.json({ error: 'Failed to fetch bank accounts' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        const userId = parseInt(session.user.id)

        const body = await request.json()
        const { accountType, accountHolder, accountNumber, bankName, qrCodeUrl, isDefault } = body

        if (!accountHolder?.trim()) {
            return NextResponse.json({ error: 'Tên chủ tài khoản là bắt buộc' }, { status: 400 })
        }
        if (!accountNumber?.trim()) {
            return NextResponse.json({ error: 'Số tài khoản là bắt buộc' }, { status: 400 })
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
        console.error('Create bank account error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function PUT(request: Request) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        const userId = parseInt(session.user.id)

        const body = await request.json()
        const { id, accountType, accountHolder, accountNumber, bankName, qrCodeUrl, isDefault } = body

        if (!id) {
            return NextResponse.json({ error: 'ID tài khoản là bắt buộc' }, { status: 400 })
        }

        const existing = await prisma.userBankAccount.findFirst({
            where: { id, userId },
        })
        if (!existing) {
            return NextResponse.json({ error: 'Không tìm thấy tài khoản' }, { status: 404 })
        }

        if (isDefault) {
            await prisma.userBankAccount.updateMany({
                where: { userId, isDefault: true, id: { not: id } },
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

        const account = await prisma.userBankAccount.update({
            where: { id },
            data,
        })

        return NextResponse.json({ success: true, account })
    } catch (error: any) {
        console.error('Update bank account error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function DELETE(request: Request) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        const userId = parseInt(session.user.id)

        const body = await request.json()
        const { id } = body

        if (!id) {
            return NextResponse.json({ error: 'ID tài khoản là bắt buộc' }, { status: 400 })
        }

        const existing = await prisma.userBankAccount.findFirst({
            where: { id, userId },
        })
        if (!existing) {
            return NextResponse.json({ error: 'Không tìm thấy tài khoản' }, { status: 404 })
        }

        await prisma.userBankAccount.delete({ where: { id } })
        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Delete bank account error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
