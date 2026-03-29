'use server'

import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { Role } from "@prisma/client"
import { revalidatePath } from "next/cache"

// Helper to check admin permission
async function checkAdmin() {
    const session = await auth()
    if (session?.user?.role !== Role.ADMIN) {
        throw new Error("Unauthorized: You must be an Admin.")
    }
}

// ==========================================
// GENEALOGY TREE - UNIFIED VERSION (V8.0)
// ==========================================

export interface GenealogyNode {
    id: number
    name: string | null
    referrerId: number | null
    totalSubCount: number
    f1aCount: number
    f1bCount: number
    f1cCount: number
    groupATotalSub: number
    groupBTotalSub: number
    groupCTotalSub: number
    groupA: any[]
    groupB: any[]
    children: GenealogyNode[]
    isRoot?: boolean
}

// Helper: Lay thong tin System cua user
async function getUserSystemInfo(userId: number): Promise<{ onSystem: number | null; refSysId: number; autoId: number } | null> {
    const system = await prisma.system.findUnique({ where: { userId } })
    if (!system) return null
    return { onSystem: system.onSystem, refSysId: system.refSysId, autoId: system.autoId }
}

// Helper: Lay root cua he thong
async function getSystemRootUser(systemId: number): Promise<{ id: number; name: string | null } | null> {
    const rootSystem = await prisma.system.findFirst({
        where: { onSystem: systemId, refSysId: 0 },
        orderBy: { userId: 'asc' }
    })
    if (!rootSystem) return null
    const user = await prisma.user.findUnique({
        where: { id: rootSystem.userId },
        select: { id: true, name: true }
    })
    return user
}

// Hàm xây dựng cây chuẩn dùng chung cho cả Học viên và Hệ thống
async function buildStandardTree(
    rootId: number, 
    type: 'USER' | 'SYSTEM',
    systemId?: number
): Promise<GenealogyNode | null> {
    const isSystem = type === 'SYSTEM'
    
    // 1. Lấy thông tin Root
    const rootUser = await prisma.user.findUnique({
        where: { id: rootId },
        select: { id: true, name: true, referrerId: true }
    })
    if (!rootUser) return null

    let rootAutoId = rootId
    if (isSystem) {
        const rootSys = await prisma.system.findUnique({ where: { userId: rootId, onSystem: systemId } })
        if (!rootSys) return null
        rootAutoId = rootSys.autoId
    }

    // 2. Lấy F1s trực tiếp
    let f1Data: any[] = []
    if (isSystem) {
        f1Data = await prisma.system.findMany({
            where: { 
                refSysId: rootId, 
                onSystem: systemId,
                userId: { not: rootId }
            },
            include: { user: { select: { id: true, name: true } } }
        })
    } else {
        const users = await prisma.user.findMany({
            where: { 
                referrerId: rootId,
                id: { not: rootId }
            },
            select: { id: true, name: true }
        })
        f1Data = users.map(u => ({ ...u, autoId: u.id, user: u }))
    }

    if (f1Data.length === 0) {
        return {
            id: rootUser.id, name: rootUser.name, referrerId: rootUser.referrerId || null,
            totalSubCount: 1, f1aCount: 0, f1bCount: 0, f1cCount: 0,
            groupATotalSub: 0, groupBTotalSub: 0, groupCTotalSub: 0,
            groupA: [], groupB: [], children: [], isRoot: true
        }
    }

    const f1AutoIds = f1Data.map(f => f.autoId)

    // 3. Lấy Closures (Lấy descendants của F1s để tìm F2s)
    const closureModel = isSystem ? prisma.systemClosure : prisma.userClosure
    const whereBase = isSystem ? { systemId } : {}

    const allDescOfF1s = await (closureModel as any).findMany({
        where: { ...whereBase, ancestorId: { in: f1AutoIds }, depth: { gte: 1 } },
        select: { descendantId: true }
    })
    const f2AutoIds = [...new Set(allDescOfF1s.map((c: any) => c.descendantId))]

    const [allClosures, totalCount] = await Promise.all([
        (closureModel as any).findMany({
            where: {
                ...whereBase,
                OR: [
                    { ancestorId: { in: [rootAutoId, ...f1AutoIds, ...f2AutoIds] } },
                    { descendantId: { in: f1AutoIds } }
                ],
                depth: { gte: 0 }
            },
            include: { descendant: isSystem ? { include: { user: { select: { id: true, name: true } } } } : { select: { id: true, name: true } } }
        }),
        (closureModel as any).count({
            where: { ...whereBase, ancestorId: rootAutoId }
        })
    ])

    // 4. Build map
    const closureByAncestor = new Map<number, any[]>()
    for (const c of allClosures) {
        if (!closureByAncestor.has(c.ancestorId)) closureByAncestor.set(c.ancestorId, [])
        const desc = isSystem ? c.descendant.user : c.descendant
        closureByAncestor.get(c.ancestorId)!.push({
            depth: c.depth,
            userId: desc.id,
            name: desc.name,
            autoId: isSystem ? c.descendantId : desc.id
        })
    }

    // 5. Phân nhóm F1
    let groupA: any[] = [], groupB: any[] = [], groupC: any[] = []
    let groupATotalSub = 0, groupBTotalSub = 0, groupCTotalSub = 0

    for (const f1 of f1Data) {
        const closures = closureByAncestor.get(f1.autoId) || []
        const hasF2 = closures.some(c => c.depth === 1)
        const hasF3 = closures.some(c => c.depth === 2)
        const f2s = closures.filter(c => c.depth === 1).map(c => ({ id: c.userId, name: c.name }))
        const fData = { id: f1.user.id, name: f1.user.name, totalSubCount: closures.length, children: f2s }

        if (!hasF2) {
            groupA.push(fData)
            groupATotalSub += closures.length
        } else if (!hasF3) {
            groupB.push(fData)
            groupBTotalSub += closures.length
        } else {
            groupC.push(fData)
            groupCTotalSub += closures.length
        }
    }

    // 6. Build Children (Group C)
    const children: GenealogyNode[] = groupC.map(f1Info => {
        const f1Record = f1Data.find(f => f.user.id === f1Info.id)
        const f1Closures = closureByAncestor.get(f1Record.autoId) || []
        const grandF1s = f1Closures.filter(c => c.depth === 1)
        let gA: any[] = [], gB: any[] = [], gC: any[] = []
        let gATotal = 0, gBTotal = 0, gCTotal = 0

        for (const gf1 of grandF1s) {
            const gf1Closures = closureByAncestor.get(gf1.autoId) || []
            const gHasF2 = gf1Closures.some(c => c.depth === 1)
            const gHasF3 = gf1Closures.some(c => c.depth === 2)
            const gf2s = gf1Closures.filter(c => c.depth === 1).map(c => ({ id: c.userId, name: c.name }))
            const gfData = { id: gf1.userId, name: gf1.name, totalSubCount: gf1Closures.length, children: gf2s }

            if (!gHasF2) {
                gA.push(gfData)
                gATotal += gf1Closures.length
            } else if (!gHasF3) {
                gB.push(gfData)
                gBTotal += gf1Closures.length
            } else {
                gC.push(gfData)
                gCTotal += gf1Closures.length
            }
        }

        return {
            id: f1Info.id, name: f1Info.name, referrerId: null,
            totalSubCount: f1Closures.length, 
            f1aCount: gA.length, f1bCount: gB.length, f1cCount: gC.length,
            groupATotalSub: gATotal, groupBTotalSub: gBTotal, groupCTotalSub: gCTotal,
            groupA: gA, groupB: gB,
            children: gC.map(cf => ({
                id: cf.id, name: cf.name, referrerId: null, totalSubCount: cf.totalSubCount,
                f1aCount: 0, f1bCount: 0, f1cCount: 0, 
                groupATotalSub: 0, groupBTotalSub: 0, groupCTotalSub: 0,
                groupA: [], groupB: [], children: []
            }))
        }
    })

    return {
        id: rootUser.id, name: rootUser.name, referrerId: rootUser.referrerId || null,
        totalSubCount: totalCount,
        f1aCount: groupA.length,
        f1bCount: groupB.length,
        f1cCount: groupC.length,
        groupATotalSub,
        groupBTotalSub,
        groupCTotalSub,
        groupA,
        groupB,
        children,
        isRoot: true
    }
    }


// --- Public Actions ---

export async function getGenealogyTreeAction(rootId: number = 0) {
    const session = await auth(); if (!session?.user?.id) throw new Error("Unauthorized")
    const userId = parseInt(session.user.id); const isAdmin = session.user.role === Role.ADMIN
    try {
        let actualRootId = rootId
        if (rootId === 0) {
            if (isAdmin) {
                const firstUser = await prisma.user.findFirst({ orderBy: { id: 'asc' }, select: { id: true } })
                actualRootId = firstUser?.id || userId
            } else actualRootId = userId
        }
        const tree = await buildStandardTree(actualRootId, 'USER')
        return { success: true, tree }
    } catch (error: any) { return { success: false, error: error.message } }
}

export async function getGenealogyChildrenAction(parentId: number) {
    const session = await auth(); if (!session?.user?.id) throw new Error("Unauthorized")
    try {
        const tree = await buildStandardTree(parentId, 'USER')
        return { success: true, tree: tree ? { ...tree, isRoot: false } : null }
    } catch (error: any) { return { success: false, error: error.message } }
}

export async function getSystemTreeAction(systemId: number) {
    const session = await auth(); if (!session?.user?.id) throw new Error("Unauthorized")
    const userId = parseInt(session.user.id); const isAdmin = session.user.role === Role.ADMIN
    try {
        let rootUserId = userId // Mặc định lấy chính mình làm gốc
        
        const systemInfo = await getUserSystemInfo(userId)
        // Nếu không thuộc hệ thống này
        if (!systemInfo || systemInfo.onSystem !== systemId) {
            if (isAdmin) {
                // Nếu là Admin, cho phép xem từ Gốc cao nhất của hệ thống
                const root = await getSystemRootUser(systemId)
                if (!root) return { success: false, error: "Không tìm thấy root" }
                rootUserId = root.id
            } else {
                return { success: false, error: "Bạn không thuộc hệ thống này" }
            }
        }
        
        const tree = await buildStandardTree(rootUserId, 'SYSTEM', systemId)
        return { success: true, tree }
    } catch (error: any) { return { success: false, error: error.message } }
}

export async function getSystemChildrenAction(parentId: number, systemId: number) {
    const session = await auth(); if (!session?.user?.id) throw new Error("Unauthorized")
    try {
        const tree = await buildStandardTree(parentId, 'SYSTEM', systemId)
        return { success: true, tree: tree ? { ...tree, isRoot: false } : null }
    } catch (error: any) { return { success: false, error: error.message } }
}

export async function getUserSystemsAction() {
    const session = await auth(); if (!session?.user?.id) throw new Error("Unauthorized")
    const userId = parseInt(session.user.id)
    const systems = await prisma.system.findMany({ where: { userId }, select: { onSystem: true } })
    return { success: true, systems: systems.map((s: { onSystem: number }) => s.onSystem) }
}

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
