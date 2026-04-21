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
    // Thông tin TCA Member (chỉ có khi thuộc hệ thống TCA)
    level?: number | null
    personalScore?: number | null
    totalScore?: number | null
}

// Helper: Lay thong tin System cua user (tim theo onSystem dau tien)
async function getUserSystemInfo(userId: number): Promise<{ onSystem: number | null; refSysId: number; autoId: number } | null> {
    const system = await prisma.system.findFirst({ where: { userId } })
    if (!system) return null
    return { onSystem: system.onSystem, refSysId: system.refSysId, autoId: system.autoId }
}

// Helper: Lay root cua he thong
async function getSystemRootUser(systemId: number): Promise<{ id: number; name: string | null } | null> {
    const rootSystem = await prisma.system.findFirst({
        where: { onSystem: systemId, refSysId: 0 }
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
        const rootSys = await prisma.system.findFirst({ where: { userId: rootId, onSystem: systemId } })
        if (!rootSys) return null
        rootAutoId = rootSys.autoId
    }

    // 2. Lấy F1s trực tiếp (refSysId = userId của parent - ĐÚNG theo schema)
    let f1Data: any[] = []
    if (isSystem) {
        f1Data = await prisma.system.findMany({
            where: { 
                refSysId: rootId,  // Tìm theo userId của parent
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
        f1Data = users.map((u: { id: number; name: string | null }) => ({ ...u, autoId: u.id, user: u }))
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
    // Thu thập tất cả userId trong cây để batch fetch TCAMember một lần
    const allUserIds = new Set<number>([rootUser.id])
    for (const c of allClosures) {
        const desc = isSystem ? c.descendant.user : c.descendant
        if (desc?.id) allUserIds.add(desc.id)
    }
    // Batch fetch TCAMember scores cho toàn bộ node trong cây
    const tcaMembers = isSystem
        ? await (prisma as any).tCAMember.findMany({
            where: { userId: { in: [...allUserIds] } },
            select: { userId: true, level: true, personalScore: true, totalScore: true }
          })
        : []
    const tcaMemberMap = new Map<number, { level: number | null; personalScore: number | null; totalScore: number | null }>()
    for (const m of tcaMembers) {
        tcaMemberMap.set(m.userId, {
            level: m.level ?? null,
            personalScore: m.personalScore != null ? Number(m.personalScore) : null,
            totalScore: m.totalScore != null ? Number(m.totalScore) : null
        })
    }

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

    // 6. Build Children (Group C) - Sửa lỗi: hiển thị đầy đủ cây (bao gồm cả F3, F4...)
    // Hàm helper đệ quy để build cây con đầy đủ từ closures
    const buildFullSubtree = (ancestorAutoId: number, maxDepth: number = 10): GenealogyNode[] => {
        const ancestorClosures = closureByAncestor.get(ancestorAutoId) || []
        // Lấy children trực tiếp (depth = 1)
        const directChildren = ancestorClosures.filter(c => c.depth === 1)
        
        return directChildren.map(child => {
            // Đệ quy lấy grandchildren
            const grandchildren = child.autoId && child.autoId !== ancestorAutoId 
                ? buildFullSubtree(child.autoId, maxDepth - 1) 
                : []
            const tcaData = tcaMemberMap.get(child.userId)
            return {
                id: child.userId,
                name: child.name,
                referrerId: null,
                totalSubCount: ancestorClosures.filter(c => c.depth >= 1 && c.userId === child.userId).length || 1,
                f1aCount: 0, f1bCount: 0, f1cCount: 0,
                groupATotalSub: 0, groupBTotalSub: 0, groupCTotalSub: 0,
                groupA: [], groupB: [],
                children: grandchildren,
                level: tcaData?.level ?? null,
                personalScore: tcaData?.personalScore ?? null,
                totalScore: tcaData?.totalScore ?? null,
            }
        })
    }

    // Build children cho Group C với đầy đủ các level
    const children: GenealogyNode[] = groupC.map(f1Info => {
        const f1Record = f1Data.find(f => f.user.id === f1Info.id)
        const f1Closures = closureByAncestor.get(f1Record.autoId) || []
        
        // Lấy F2s (depth = 1) và build đầy đủ subtree
        const f2s = f1Closures.filter(c => c.depth === 1)
        const f2Subtrees = f2s.map(f2 => {
            // Build đệ quy subtree cho mỗi F2
            const grandchildren = buildFullSubtree(f2.autoId, 5)
            const f2tca = tcaMemberMap.get(f2.userId)
            return {
                id: f2.userId,
                name: f2.name,
                referrerId: null,
                totalSubCount: f1Closures.filter(c => c.depth >= 1 && c.userId === f2.userId).length || 1,
                f1aCount: 0, f1bCount: 0, f1cCount: 0,
                groupATotalSub: 0, groupBTotalSub: 0, groupCTotalSub: 0,
                groupA: [], groupB: [],
                children: grandchildren,
                level: f2tca?.level ?? null,
                personalScore: f2tca?.personalScore ?? null,
                totalScore: f2tca?.totalScore ?? null,
            }
        })

        // Group A/B/C vẫn giữ nguyên cho default mode
        const grandF1s = f1Closures.filter(c => c.depth === 1)
        let gA: any[] = [], gB: any[] = [], gC: any[] = []
        let gATotal = 0, gBTotal = 0, gCTotal = 0

        for (const gf1 of grandF1s) {
            const gf1Closures = closureByAncestor.get(gf1.autoId) || []
            const gHasF2 = gf1Closures.some(c => c.depth === 1)
            const gHasF3 = gf1Closures.some(c => c.depth === 2)
            const gf2sOld = gf1Closures.filter(c => c.depth === 1).map(c => ({ id: c.userId, name: c.name }))
            const gfData = { id: gf1.userId, name: gf1.name, totalSubCount: gf1Closures.length, children: gf2sOld }

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

        const f1tca = tcaMemberMap.get(f1Info.id)
        return {
            id: f1Info.id, name: f1Info.name, referrerId: null,
            totalSubCount: f1Closures.length, 
            f1aCount: gA.length, f1bCount: gB.length, f1cCount: gC.length,
            groupATotalSub: gATotal, groupBTotalSub: gBTotal, groupCTotalSub: gCTotal,
            groupA: gA, groupB: gB,
            // Sửa: Dùng f2Subtrees thay vì gC.map với children rỗng - để hiển thị đầy đủ cây
            children: f2Subtrees,
            level: f1tca?.level ?? null,
            personalScore: f1tca?.personalScore ?? null,
            totalScore: f1tca?.totalScore ?? null,
        }
    })

    // Gắn TCA data cho root node
    const rootTca = tcaMemberMap.get(rootUser.id)
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
        isRoot: true,
        level: rootTca?.level ?? null,
        personalScore: rootTca?.personalScore ?? null,
        totalScore: rootTca?.totalScore ?? null,
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
    const isRootAdmin = userId === 0
    try {
        let rootUserId = userId // Mặc định lấy chính mình làm gốc
        
        const systemInfo = await getUserSystemInfo(userId)
        // Nếu không thuộc hệ thống này
        if (!systemInfo || systemInfo.onSystem !== systemId) {
            if (isRootAdmin) {
                // Admin id=0 được xem tất cả
                const root = await getSystemRootUser(systemId)
                if (!root) return { success: false, error: "Không tìm thấy root" }
                rootUserId = root.id
            } else {
                // Admin id!=0 hoặc user thường không thuộc hệ thống
                return { success: false, error: "Bạn chưa tham gia hệ thống này" }
            }
        }
        // Nếu thuộc hệ thống (bao gồm cả admin id!=0), xem từ vị trí mình trở xuống
        
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

// SỬA 2026-03-30: Thêm tính năng tìm kiếm Nhân mạch theo ID (FIX: tối ưu query)
// Tìm đường đi từ root đến target node và trả về path - chỉ hiện path đơn giản
export async function searchGenealogyByIdAction(targetId: number, systemId?: number) {
    const session = await auth(); if (!session?.user?.id) throw new Error("Unauthorized")
    const isSystem = systemId !== undefined
    try {
        // 1. Kiểm tra user/system tồn tại
        let targetAutoId: number | null = null
        
        if (isSystem) {
            const system = await prisma.system.findFirst({ 
                where: { userId: targetId, onSystem: systemId } 
            })
            if (!system) return { success: false, error: `Không tìm thấy mã #${targetId} trong hệ thống này` }
            targetAutoId = system.autoId
        } else {
            const user = await prisma.user.findUnique({ where: { id: targetId } })
            if (!user) return { success: false, error: `Không tìm thấy mã #${targetId}` }
        }

        // 2. Query closure để lấy path từ root đến target - depth DESC (root → target)
        const ancestors = isSystem
            ? await prisma.systemClosure.findMany({
                where: { systemId, descendantId: targetAutoId! },
                orderBy: { depth: 'desc' },
                include: { 
                    ancestor: { 
                        include: { 
                            user: { select: { id: true, name: true } },
                        }
                    } 
                }
              })
            : await prisma.userClosure.findMany({
                where: { descendantId: targetId },
                orderBy: { depth: 'desc' },
                include: { ancestor: { select: { id: true, name: true, referrerId: true } } }
              })

        if (!ancestors || ancestors.length === 0) {
            return { success: false, error: `Không tìm thấy đường dẫn cho mã #${targetId}` }
        }

        // 3. Build path nodes đơn giản
        const pathNodes: GenealogyNode[] = []
        
        for (let i = 0; i < ancestors.length; i++) {
            const anc = ancestors[i] as any
            const nodeId = isSystem ? anc.ancestor.userId : anc.ancestorId
            const name = isSystem ? anc.ancestor.user?.name : anc.ancestor.name
            const depth = anc.depth

            // Build children - chỉ có 1 child trên path (node tiếp theo)
            const children: GenealogyNode[] = []
            if (i < ancestors.length - 1) {
                const nextAnc = ancestors[i + 1] as any
                const nextId = isSystem ? nextAnc.ancestor.userId : nextAnc.ancestorId
                const nextName = isSystem ? nextAnc.ancestor.user?.name : nextAnc.ancestor.name
                children.push({
                    id: nextId,
                    name: nextName || 'HV',
                    referrerId: null,
                    totalSubCount: 0,
                    f1aCount: 0, f1bCount: 0, f1cCount: 0,
                    groupATotalSub: 0, groupBTotalSub: 0, groupCTotalSub: 0,
                    groupA: [], groupB: [], children: []
                })
            }

            pathNodes.push({
                id: nodeId,
                name: name || 'HV',
                referrerId: null,
                totalSubCount: 1,
                f1aCount: 0,
                f1bCount: 0,
                f1cCount: 0,
                groupATotalSub: 0,
                groupBTotalSub: 0,
                groupCTotalSub: 0,
                groupA: [],
                groupB: [],
                children,
                isRoot: depth === 0
            })
        }

        return { 
            success: true, 
            path: pathNodes,
            targetNode: pathNodes[pathNodes.length - 1],
            targetId 
        }
    } catch (error: any) { 
        console.error('[Search Error]', error)
        return { success: false, error: error.message || 'Lỗi khi tìm kiếm' } 
    }
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
        rawRoleCounts.forEach((rc: any) => { roleCounts[rc.role] = rc._count.id })
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

// ==========================================
// FULL SYSTEM TREE - Hiển thị toàn bộ cây (V3.0)
// ==========================================

// Helper: Build full tree từ closure data (dùng iterative approach thay vì đệ quy)
function buildFullTreeFromClosures(
    rootSysAutoId: number,
    rootUserId: number,
    rootUserName: string | null,
    allClosures: { ancestorAutoId: number; descendantAutoId: number; depth: number; userId: number; name: string | null }[],
    sysAutoToUserId: Map<number, number>,
    userMap: Map<number, string | null>
): GenealogyNode {
    // Build parent -> children map (tất cả các depth)
    const parentToChildren = new Map<number, { autoId: number; userId: number }[]>()
    // Map để đếm descendants cho mỗi ancestor (dùng Map thay vì filter)
    const descendantCount = new Map<number, number>()
    
    for (const c of allClosures) {
        if (c.depth === 0) continue // Skip self
        
        // Add to children map
        if (!parentToChildren.has(c.ancestorAutoId)) {
            parentToChildren.set(c.ancestorAutoId, [])
        }
        parentToChildren.get(c.ancestorAutoId)!.push({
            autoId: c.descendantAutoId,
            userId: c.userId
        })
        
        // Đếm descendants
        descendantCount.set(c.ancestorAutoId, (descendantCount.get(c.ancestorAutoId) || 0) + 1)
    }
    
    // Build node không đệ quy - dùng stack để duyệt
    function buildNode(sysAutoId: number): GenealogyNode {
        const userId = sysAutoId === rootSysAutoId ? rootUserId : (sysAutoToUserId.get(sysAutoId) || sysAutoId)
        
        // Lấy direct children
        const directChildren = parentToChildren.get(sysAutoId) || []
        
        // Total sub = số descendants
        const totalSub = descendantCount.get(sysAutoId) || 0
        
        // Build children
        const children: GenealogyNode[] = directChildren.map(child => buildNode(child.autoId))
        
        // Name
        const name = sysAutoId === rootSysAutoId ? rootUserName : (userMap.get(userId) || null)
        
        // Sắp xếp children theo name
        children.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        
        return {
            id: userId,
            name: name,
            referrerId: null,
            totalSubCount: totalSub > 0 ? totalSub : 1,
            f1aCount: 0, f1bCount: 0, f1cCount: 0,
            groupATotalSub: 0, groupBTotalSub: 0, groupCTotalSub: 0,
            groupA: [], groupB: [],
            children: children
        }
    }
    
    return buildNode(rootSysAutoId)
}

// Lấy full tree cho System (TCA/KTC) - hiển thị toàn bộ cây không phân nhóm
export async function getFullSystemTreeAction(systemId: number) {
    const session = await auth(); if (!session?.user?.id) throw new Error("Unauthorized")
    const userId = parseInt(session.user.id); const isAdmin = session.user.role === Role.ADMIN
    
    try {
        let rootUserId = userId
        
        // Tìm root của system
        const rootSys = await prisma.system.findFirst({ 
            where: { onSystem: systemId, refSysId: 0 }
        })
        if (!rootSys) return { success: false, error: "Không tìm thấy root" }
        const rootUser = await prisma.user.findUnique({ where: { id: rootSys.userId } })
        
        // Nếu user không thuộc system hoặc không phải admin, kiểm tra membership
        if (!isAdmin) {
            const userSys = await prisma.system.findFirst({ where: { userId, onSystem: systemId } })
            if (!userSys) return { success: false, error: "Bạn không thuộc hệ thống này" }
        }
        
        rootUserId = rootSys.userId
        
        // Batch query: Lấy tất cả closure data
        const allClosures = await prisma.systemClosure.findMany({
            where: { systemId },
            select: { ancestorId: true, descendantId: true, depth: true }
        })
        
        // Batch query: Lấy tất cả system records one-time
        const allAutoIds = new Set<number>()
        for (const c of allClosures) {
            allAutoIds.add(c.ancestorId)
            allAutoIds.add(c.descendantId)
        }
        
        const systemRecords = await prisma.system.findMany({ 
            where: { autoId: { in: [...allAutoIds] }, onSystem: systemId }
        })
        
        // Map autoId -> userId
        const autoToUser = new Map<number, number>()
        const userIdSet = new Set<number>()
        for (const s of systemRecords) {
            autoToUser.set(s.autoId, s.userId)
            userIdSet.add(s.userId)
        }
        
        // Batch query: Lấy users one-time
        const users = await prisma.user.findMany({ where: { id: { in: [...userIdSet] } } })
        const userMap = new Map<number, string | null>(users.map((u: { id: number; name: string | null }) => [u.id, u.name]))
        
        // Transform closure data với đúng format mới
        const closureData = allClosures.map((c: any) => ({
            ancestorAutoId: c.ancestorId,
            descendantAutoId: c.descendantId,
            depth: c.depth,
            userId: autoToUser.get(c.descendantId) || 0,
            name: userMap.get(autoToUser.get(c.descendantId) || 0) || null
        })).filter((c: any) => c.userId > 0)
        
        // Build tree với rootSysAutoId và autoToUser map
        const tree = buildFullTreeFromClosures(
            rootSys.autoId, 
            rootUserId, 
            rootUser?.name || null, 
            closureData, 
            autoToUser,
            userMap
        )
        return { success: true, tree: { ...tree, isRoot: true } }
    } catch (error: any) { return { success: false, error: error.message } }
}

// Lấy full children cho một node (dùng khi expand)
export async function getFullSystemChildrenAction(parentId: number, systemId: number) {
    const session = await auth(); if (!session?.user?.id) throw new Error("Unauthorized")
    
    try {
        // Tìm userId của parent trong system
        const parentSys = await prisma.system.findFirst({ 
            where: { userId: parentId, onSystem: systemId }
        })
        if (!parentSys) return { success: false, error: "Không tìm thấy node" }
        
        // Lấy tất cả descendants của parent
        const closures = await prisma.systemClosure.findMany({
            where: { 
                systemId,
                ancestorId: parentSys.autoId,
                depth: { gt: 0 }
            },
            select: { ancestorId: true, descendantId: true, depth: true }
        })
        
        // Map autoId -> userId
        const autoToUser = new Map<number, number>()
        const allAutoIds = new Set<number>()
        for (const c of closures) {
            allAutoIds.add(c.ancestorId)
            allAutoIds.add(c.descendantId)
        }
        const sysRecords = await prisma.system.findMany({ 
            where: { autoId: { in: [...allAutoIds] }, onSystem: systemId }
        })
        for (const s of sysRecords) autoToUser.set(s.autoId, s.userId)
        
        // Lấy users
        const userIds = new Set<number>()
        for (const [, uid] of autoToUser) userIds.add(uid)
        const users = await prisma.user.findMany({ where: { id: { in: [...userIds] } } })
        const userMap = new Map(users.map(u => [u.id, u.name]))
        
        // Group by depth - lấy depth nhỏ nhất (children trực tiếp)
        const minDepth = Math.min(...closures.map(c => c.depth))
        const childIds = closures.filter(c => c.depth === minDepth).map(c => c.descendantId)
        
        const directChildren: GenealogyNode[] = []
        for (const autoId of [...new Set(childIds)]) {
            const userId = autoToUser.get(autoId) || 0
            if (userId === 0) continue
            
            // Đếm sub
            const childSys = sysRecords.find(s => s.autoId === autoId)
            let subCount = 0
            if (childSys) {
                subCount = closures.filter(c => c.ancestorId === childSys.autoId && c.depth > 0).length
            }
            
            directChildren.push({
                id: userId,
                name: userMap.get(userId) || null,
                referrerId: parentId,
                totalSubCount: subCount + 1,
                f1aCount: 0, f1bCount: 0, f1cCount: 0,
                groupATotalSub: 0, groupBTotalSub: 0, groupCTotalSub: 0,
                groupA: [], groupB: [],
                children: []
            })
        }
        
            directChildren.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        
        return { 
            success: true, 
            tree: {
                id: parentId,
                name: null,
                referrerId: null,
                totalSubCount: directChildren.reduce((sum, c) => sum + c.totalSubCount, 0),
                f1aCount: 0, f1bCount: 0, f1cCount: 0,
                groupATotalSub: 0, groupBTotalSub: 0, groupCTotalSub: 0,
                groupA: [], groupB: [],
                children: directChildren,
                isRoot: false
            }
        }
    } catch (error: any) { return { success: false, error: error.message } }
}

// ==========================================
// SYSTEM TREE - LẤY DANH SÁCH HỆ THỐNG
// ==========================================

export interface SystemTreeInfo {
    onSystem: number
    nameSystem?: string
}

export async function getAvailableSystemsAction() {
    try {
        console.log('[getAvailableSystemsAction] Fetching systems from DB...')
        const systems = await prisma.systemTree.findMany({
            orderBy: { onSystem: 'asc' },
            select: {
                onSystem: true,
                nameSystem: true
            }
        })
        console.log('[getAvailableSystemsAction] Systems found:', systems)
        return { success: true, systems }
    } catch (error: any) {
        console.error('[getAvailableSystemsAction] Error:', error)
        return { success: false, error: error.message }
    }
}

// ==========================================
// LẤY THÔNG TIN USER HIỆN TẠI
// ==========================================

export async function getCurrentUserRoleAction() {
    const session = await auth()
    console.log('[getCurrentUserRoleAction] Session:', session)
    if (!session?.user?.id) {
        return { success: false, role: null }
    }
    const role = session.user.role
    console.log('[getCurrentUserRoleAction] User role:', role, typeof role)
    const userId = parseInt(session.user.id)
    const validUserId = isNaN(userId) || userId < 0 ? null : userId
    return { 
        success: true, 
        role: role,
        userId: validUserId
    }
}

// ==========================================
// SYSTEM TREE - TẠO ROOT MỚI (CHỈ ADMIN)
// ==========================================

export async function createSystemRootAction(systemId: number, userId: number) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")
    
    // Chỉ admin mới được tạo root
    if (session.user.role !== Role.ADMIN) {
        return { success: false, error: "Chỉ admin mới được tạo hệ thống mới" }
    }
    
    try {
        // Kiểm tra đã có root chưa
        const existingRoot = await prisma.system.findFirst({
            where: { onSystem: systemId, refSysId: 0 }
        })
        
        if (existingRoot) {
            return { success: false, error: "Hệ thống đã có root" }
        }
        
        // Tạo root mới
        const newSystem = await prisma.system.create({
            data: {
                userId: userId,
                onSystem: systemId,
                refSysId: 0  // Root
            }
        })
        
        // Tạo self-closure cho root
        await prisma.systemClosure.create({
            data: {
                ancestorId: newSystem.autoId,
                descendantId: newSystem.autoId,
                depth: 0,
                systemId: systemId
            }
        })
        
        return { success: true, system: newSystem }
    } catch (error: any) {
        console.error('[createSystemRootAction] Error:', error)
        return { success: false, error: error.message }
    }
}
