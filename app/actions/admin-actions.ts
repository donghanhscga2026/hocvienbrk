'use server'

import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { Role } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { unstable_cache } from "next/cache"

// Helper to check admin permission
async function checkAdmin() {
    const session = await auth()
    if (session?.user?.role !== Role.ADMIN) {
        throw new Error("Unauthorized: You must be an Admin.")
    }
}

// ==========================================
// GENEALOGY TREE - V7.2 (CACHE + LAZY LOAD)
// ==========================================

export interface GenealogyNode {
    id: number
    name: string | null
    referrerId: number | null
    totalSubCount: number
    f1aCount: number
    f1bCount: number
    f1cCount: number
    groupA: any[]
    groupB: any[]
    children: GenealogyNode[]
}

// Cache key generator
function getCacheKey(userId: number, depth: number): string {
    return `genealogy-${userId}-${depth}`
}

// Cached tree builder - tu dong cache trong 30s
// TEMP DISABLED FOR TESTING: const getCachedGenealogyTree = unstable_cache(...)
const getCachedGenealogyTree = buildGenealogyTreeInternal

// Core tree builder - chi query database
async function buildGenealogyTreeInternal(userId: number, maxDepth: number): Promise<GenealogyNode | null> {
    // Lay user va F1s song song
    const [rootUser, rootF1s] = await Promise.all([
        prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, name: true, referrerId: true }
        }),
        prisma.user.findMany({
            where: { referrerId: userId },
            select: { id: true, name: true }
        })
    ])

    if (!rootUser) return null

    if (rootF1s.length === 0) {
        return {
            id: rootUser.id, name: rootUser.name, referrerId: rootUser.referrerId,
            totalSubCount: 0, f1aCount: 0, f1bCount: 0, f1cCount: 0,
            groupA: [], groupB: [], children: []
        }
    }

    const f1Ids = rootF1s.map(f => f.id)

    // Lay tat ca closures lien quan: user, F1s, va F2s (de biet F2 co F3)
    // Lay tat ca descendants cua rootF1s de tim F2s
    const allDescendantsOfF1s = await prisma.userClosure.findMany({
        where: {
            ancestorId: { in: f1Ids },
            depth: { gte: 1, lte: 3 }
        },
        select: { descendantId: true }
    })
    const f2Ids = [...new Set(allDescendantsOfF1s.map(c => c.descendantId))]

    // Lay tat ca closures can thiet trong 1 query
    const allClosures = await prisma.userClosure.findMany({
        where: {
            OR: [
                { ancestorId: { in: [userId, ...f1Ids, ...f2Ids] } },
                { descendantId: { in: f1Ids } }
            ],
            depth: { gt: 0, lte: 4 }
        },
        include: {
            descendant: { select: { id: true, name: true } }
        }
    })

    // Build map trong memory
    const closureByAncestor = new Map<number, { depth: number; descendantId: number; name: string | null }[]>()
    for (const c of allClosures) {
        if (!closureByAncestor.has(c.ancestorId)) {
            closureByAncestor.set(c.ancestorId, [])
        }
        closureByAncestor.get(c.ancestorId)!.push({
            depth: c.depth,
            descendantId: c.descendantId,
            name: c.descendant.name
        })
    }

    // Build root node
    const rootClosures = closureByAncestor.get(userId) || []
    let groupA: any[] = [], groupB: any[] = [], groupC: any[] = []

    for (const f1 of rootF1s) {
        const f1Closures = closureByAncestor.get(f1.id) || []
        const hasF2 = f1Closures.some(c => c.depth === 1)
        const hasF3 = f1Closures.some(c => c.depth === 2)
        const f2s = f1Closures
            .filter(c => c.depth === 1)
            .map(c => ({ id: c.descendantId, name: c.name }))

        const fData = {
            id: f1.id,
            name: f1.name,
            totalSubCount: f1Closures.length + 1,
            children: f2s
        }

        if (!hasF2) groupA.push(fData)
        else if (!hasF3) groupB.push(fData)
        else groupC.push(fData)
    }

    // Build children nếu co
    const children: GenealogyNode[] = groupC.map(f1 => {
        const f1Closures = closureByAncestor.get(f1.id) || []
        const grandF1s = f1Closures.filter(c => c.depth === 1)
        let gA: any[] = [], gB: any[] = [], gC: any[] = []

        for (const gf1 of grandF1s) {
            const gf1Closures = closureByAncestor.get(gf1.descendantId) || []
            const gHasF2 = gf1Closures.some(c => c.depth === 1)
            const gHasF3 = gf1Closures.some(c => c.depth === 2)
            const gf2s = gf1Closures.filter(c => c.depth === 1).map(c => ({
                id: c.descendantId, name: c.name
            }))

            const gfData = {
                id: gf1.descendantId,
                name: gf1.name,
                totalSubCount: gf1Closures.length + 1,
                children: gf2s
            }

            if (!gHasF2) gA.push(gfData)
            else if (!gHasF3) gB.push(gfData)
            else gC.push(gfData)
        }

        return {
            id: f1.id,
            name: f1.name,
            referrerId: null,
            totalSubCount: f1Closures.length,
            f1aCount: gA.length,
            f1bCount: gB.length,
            f1cCount: gC.length,
            groupA: gA,
            groupB: gB,
            children: gC.map(cf => ({
                id: cf.id, name: cf.name, referrerId: null,
                totalSubCount: cf.totalSubCount,
                f1aCount: 0, f1bCount: 0, f1cCount: 0,
                groupA: [], groupB: [], children: []
            }))
        }
    })

    return {
        id: rootUser.id,
        name: rootUser.name,
        referrerId: rootUser.referrerId,
        totalSubCount: rootClosures.length,
        f1aCount: groupA.length,
        f1bCount: groupB.length,
        f1cCount: groupC.length,
        groupA,
        groupB,
        children
    }
}

// Lazy load children cho 1 node cu the
async function getLazyChildrenNode(nodeId: number): Promise<GenealogyNode | null> {
    const nodeUser = await prisma.user.findUnique({
        where: { id: nodeId },
        select: { id: true, name: true, referrerId: true }
    })
    if (!nodeUser) return null

    const f1s = await prisma.user.findMany({
        where: { referrerId: nodeId },
        select: { id: true, name: true }
    })

    if (f1s.length === 0) {
        return {
            id: nodeUser.id, name: nodeUser.name, referrerId: nodeUser.referrerId,
            totalSubCount: 0, f1aCount: 0, f1bCount: 0, f1cCount: 0,
            groupA: [], groupB: [], children: []
        }
    }

    const f1Ids = f1s.map(f => f.id)

    // Lay F2s (descendants depth=1 cua F1s) de biet F2 co F3
    const allDescendantsOfF1s = await prisma.userClosure.findMany({
        where: { ancestorId: { in: f1Ids }, depth: { gte: 1, lte: 3 } },
        select: { descendantId: true }
    })
    const f2Ids = [...new Set(allDescendantsOfF1s.map(c => c.descendantId))]

    // Lay tat ca closures can thiet (depth <= 4 de biet F3)
    const closures = await prisma.userClosure.findMany({
        where: {
            OR: [
                { ancestorId: { in: [nodeId, ...f1Ids, ...f2Ids] } },
                { descendantId: { in: f1Ids } }
            ],
            depth: { gt: 0, lte: 4 }
        },
        include: { descendant: { select: { id: true, name: true } } }
    })

    const closureByAncestor = new Map<number, any[]>()
    for (const c of closures) {
        if (!closureByAncestor.has(c.ancestorId)) {
            closureByAncestor.set(c.ancestorId, [])
        }
        closureByAncestor.get(c.ancestorId)!.push({
            depth: c.depth,
            descendantId: c.descendantId,
            name: c.descendant.name
        })
    }

    let groupA: any[] = [], groupB: any[] = [], groupC: any[] = []

    for (const f1 of f1s) {
        const f1Closures = closureByAncestor.get(f1.id) || []
        const hasF2 = f1Closures.some(c => c.depth === 1)
        const hasF3 = f1Closures.some(c => c.depth === 2)
        const f2s = f1Closures.filter(c => c.depth === 1).map(c => ({
            id: c.descendantId, name: c.name
        }))

        const fData = {
            id: f1.id,
            name: f1.name,
            totalSubCount: f1Closures.length + 1,
            children: f2s
        }

        if (!hasF2) groupA.push(fData)
        else if (!hasF3) groupB.push(fData)
        else groupC.push(fData)
    }

    const nodeClosures = closureByAncestor.get(nodeId) || []

    // Build children voi day du group A/B/C
    const children: GenealogyNode[] = groupC.map(f1 => {
        const f1Closures = closureByAncestor.get(f1.id) || []
        const grandF1s = f1Closures.filter(c => c.depth === 1)
        let gA: any[] = [], gB: any[] = [], gC: any[] = []

        for (const gf1 of grandF1s) {
            const gf1Closures = closureByAncestor.get(gf1.descendantId) || []
            const gHasF2 = gf1Closures.some(c => c.depth === 1)
            const gHasF3 = gf1Closures.some(c => c.depth === 2)
            const gf2s = gf1Closures.filter(c => c.depth === 1).map(c => ({
                id: c.descendantId, name: c.name
            }))

            const gfData = {
                id: gf1.descendantId,
                name: gf1.name,
                totalSubCount: gf1Closures.length + 1,
                children: gf2s
            }

            if (!gHasF2) gA.push(gfData)
            else if (!gHasF3) gB.push(gfData)
            else gC.push(gfData)
        }

        return {
            id: f1.id,
            name: f1.name,
            referrerId: null,
            totalSubCount: f1Closures.length,
            f1aCount: gA.length,
            f1bCount: gB.length,
            f1cCount: gC.length,
            groupA: gA,
            groupB: gB,
            children: gC.map(cf => ({
                id: cf.id, name: cf.name, referrerId: null,
                totalSubCount: cf.totalSubCount,
                f1aCount: 0, f1bCount: 0, f1cCount: 0,
                groupA: [], groupB: [], children: []
            }))
        }
    })

    return {
        id: nodeUser.id,
        name: nodeUser.name,
        referrerId: nodeUser.referrerId,
        totalSubCount: nodeClosures.length,
        f1aCount: groupA.length,
        f1bCount: groupB.length,
        f1cCount: groupC.length,
        groupA,
        groupB,
        children
    }
}

export async function getGenealogyTreeAction(rootId: number = 0, depth: number = 1) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")
    const userId = parseInt(session.user.id)
    const isAdmin = session.user.role === Role.ADMIN
    try {
        let actualRootId = rootId
        if (rootId === 0) {
            if (isAdmin) {
                const firstUser = await prisma.user.findFirst({ orderBy: { id: 'asc' }, select: { id: true } })
                actualRootId = firstUser?.id || userId
            } else actualRootId = userId
        }
        // Su dung cached version - cache 30s
        const tree = await getCachedGenealogyTree(actualRootId, depth)
        return { success: true, tree }
    } catch (error: any) { return { success: false, error: error.message } }
}

export async function getGenealogyChildrenAction(parentId: number, depth: number = 3) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")
    try {
        // Lazy load children - khong dung cache vi la tuong tac moi
        const tree = await getLazyChildrenNode(parentId)
        return { success: true, tree }
    } catch (error: any) { return { success: false, error: error.message } }
}

// ... các hàm quản trị học viên giữ nguyên (getStudentsAction, roleCounts, etc.)
export async function getStudentsAction(query?: string, role?: Role | 'ALL' | 'COURSE_86_DAYS', page: number = 0, limit: number = 20, sortBy: 'createdAt' | 'id' = 'createdAt', sortOrder: 'asc' | 'desc' = 'desc') {
    await checkAdmin()
    try {
        let where: any = {};
        if (role === 'COURSE_86_DAYS') where.enrollments = { some: { courseId: 1 } };
        else if (role && role !== 'ALL') where.role = role;
        if (query) {
            const trimmedQuery = query.trim();
            if (trimmedQuery.startsWith('#')) {
                const id = parseInt(trimmedQuery.substring(1));
                if (!isNaN(id)) where.id = id;
            } else if (/^\d+$/.test(trimmedQuery)) {
                const id = parseInt(trimmedQuery);
                where.OR = [{ id }, { name: { contains: trimmedQuery, mode: 'insensitive' } }, { email: { contains: trimmedQuery, mode: 'insensitive' } }];
            } else {
                where.OR = [{ name: { contains: trimmedQuery, mode: 'insensitive' } }, { email: { contains: trimmedQuery, mode: 'insensitive' } }, { phone: { contains: trimmedQuery, mode: 'insensitive' } }];
            }
        }
        const skip = page * limit;
        const [students, total, rawRoleCounts] = await Promise.all([
            prisma.user.findMany({ where, include: { enrollments: { include: { course: { select: { name_lop: true } }, _count: { select: { lessonProgress: { where: { status: 'COMPLETED' } } } } } } }, orderBy: { [sortBy]: sortOrder }, take: limit, skip }),
            prisma.user.count({ where }),
            prisma.user.groupBy({ by: ['role'], _count: { id: true } })
        ])
        const roleCounts: Record<string, number> = {}
        rawRoleCounts.forEach(rc => { roleCounts[rc.role] = rc._count.id })
        roleCounts['ALL'] = await prisma.user.count()
        roleCounts['COURSE_86_DAYS'] = await prisma.enrollment.count({ where: { courseId: 1 } })
        const totalPages = Math.ceil(total / limit)
        return { success: true, students, total, page, totalPages, roleCounts }
    } catch (error: any) { return { success: false, error: error.message } }
}

export async function addReservedIdAction(prevState: any, formData: FormData) {
    await checkAdmin()
    const id = parseInt(formData.get("id") as string)
    const note = formData.get("note") as string || "Admin Added"
    if (isNaN(id)) return { message: "Error: ID phải là số." }
    try {
        const existing = await prisma.reservedId.findUnique({ where: { id } })
        if (existing) return { message: `Error: ID ${id} đã có trong danh sách.` }
        await prisma.reservedId.create({ data: { id, note } })
        revalidatePath("/admin/reserved-ids")
        return { message: `Success: Đã thêm ID ${id} vào danh sách dự trữ.` }
    } catch (_e) { return { message: "Error: Lỗi Server." } }
}

export async function deleteReservedIdAction(id: number) {
    await checkAdmin()
    try {
        await prisma.reservedId.delete({ where: { id } })
        revalidatePath("/admin/reserved-ids")
        return { message: `Success: Đã xóa ID ${id}.` }
    } catch (_e) { return { message: "Error: Lỗi khi xóa ID." } }
}

export async function changeUserIdAction(prevState: any, formData: FormData) {
    await checkAdmin()
    const currentId = parseInt(formData.get("currentId") as string)
    const newId = parseInt(formData.get("newId") as string)
    if (isNaN(currentId) || isNaN(newId)) return { message: "Error: ID sai định dạng." }
    try {
        await prisma.$executeRawUnsafe(`UPDATE "User" SET id = ${newId} WHERE id = ${currentId}`)
        await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"User"', 'id'), max(id), true) FROM "User"`)
        revalidatePath("/admin/reserved-ids")
        return { message: `Success: Đổi ID thành công.` }
    } catch (e) { return { message: "Error: Lỗi hệ thống." } }
}

export async function getReservedIds() {
    await checkAdmin()
    return await prisma.reservedId.findMany({ orderBy: { id: 'asc' } })
}

export async function getStudentDetailsAction(userId: number) {
    await checkAdmin()
    try {
        const student = await prisma.user.findUnique({ where: { id: userId }, include: { enrollments: { include: { course: { include: { lessons: { orderBy: { order: 'asc' } } } }, lessonProgress: { include: { lesson: { select: { title: true, order: true } } } } }, orderBy: { createdAt: 'desc' } } } })
        if (!student) return { success: false, error: "Không tìm thấy." }
        return { success: true, student }
    } catch (error: any) { return { success: false, error: error.message } }
}

export async function getAdminCoursesAction() {
    await checkAdmin()
    try {
        const courses = await prisma.course.findMany({ include: { _count: { select: { lessons: true, enrollments: true } } }, orderBy: { id: 'asc' } })
        return { success: true, courses }
    } catch (error: any) { return { success: false, error: error.message } }
}

export async function updateCourseAction(courseId: number, data: any) {
    await checkAdmin()
    try {
        const updatedCourse = await prisma.course.update({ where: { id: courseId }, data })
        revalidatePath('/admin/courses'); revalidatePath('/')
        return { success: true, course: updatedCourse }
    } catch (error: any) { return { success: false, error: error.message } }
}

export async function updateLessonAction(lessonId: string, data: any) {
    await checkAdmin()
    try {
        const updatedLesson = await prisma.lesson.update({ where: { id: lessonId }, data })
        const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { course: { select: { id_khoa: true } } } })
        if (lesson?.course?.id_khoa) revalidatePath(`/courses/${lesson.course.id_khoa}/learn`)
        return { success: true, lesson: updatedLesson }
    } catch (error: any) { return { success: false, error: error.message } }
}
