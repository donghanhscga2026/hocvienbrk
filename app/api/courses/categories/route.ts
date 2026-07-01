import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { auth } from '@/auth'

export async function GET() {
    try {
        const categories = await prisma.courseCategory.findMany({
            orderBy: [{ order: 'asc' }, { name: 'asc' }],
            include: { _count: { select: { courses: true } } },
        })
        return NextResponse.json({ categories })
    } catch (error: any) {
        console.error('Get categories error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch categories' },
            { status: 500 }
        )
    }
}

export async function POST(request: Request) {
    try {
        const session = await auth()
        if (session?.user?.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { name, color, icon } = body

        if (!name?.trim()) {
            return NextResponse.json({ error: 'Tên danh mục là bắt buộc' }, { status: 400 })
        }

        const slug = name
            .toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')

        const existing = await prisma.courseCategory.findFirst({
            where: { OR: [{ name }, { slug }] }
        })
        if (existing) {
            return NextResponse.json({ error: 'Danh mục này đã tồn tại' }, { status: 409 })
        }

        const maxOrder = await prisma.courseCategory.aggregate({ _max: { order: true } })
        const category = await prisma.courseCategory.create({
            data: {
                name: name.trim(),
                slug,
                color: color || '#6366f1',
                icon: icon || null,
                order: (maxOrder._max.order ?? 0) + 1,
            },
        })

        return NextResponse.json({ success: true, category })
    } catch (error: any) {
        console.error('Create category error:', error)
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
        const { id, name, slug, color, icon, order } = body

        if (!id) {
            return NextResponse.json({ error: 'ID danh mục là bắt buộc' }, { status: 400 })
        }

        const data: any = {}
        if (name?.trim()) data.name = name.trim()
        if (slug?.trim()) data.slug = slug
        if (color) data.color = color
        if (icon !== undefined) data.icon = icon
        if (order !== undefined) data.order = order

        const category = await prisma.courseCategory.update({
            where: { id },
            data,
        })

        return NextResponse.json({ success: true, category })
    } catch (error: any) {
        console.error('Update category error:', error)
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
            return NextResponse.json({ error: 'ID danh mục là bắt buộc' }, { status: 400 })
        }

        const courseCount = await prisma.course.count({ where: { categoryId: id } })
        if (courseCount > 0) {
            return NextResponse.json({
                error: `Không thể xóa danh mục này vì còn ${courseCount} khóa học đang sử dụng`
            }, { status: 409 })
        }

        await prisma.courseCategory.delete({ where: { id } })
        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Delete category error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
