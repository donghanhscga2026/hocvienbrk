'use server'

import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { Role, Prisma, EnrollmentMemberRole } from "@prisma/client"
import { rebuildSystem4Data } from "@/lib/brk/rebuild-service"
import { revalidatePath } from "next/cache"
import { toTitleCase } from "@/lib/utils/text-format"

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
    image?: string | null
    referrerId: number | null
    seq?: number  // 0-based join order trong hệ thống (chỉ có ở SYSTEM tree)
    sharingCount?: number // Số thành viên phát triển được theo nhân mạch chia sẻ
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
    isSearchTarget?: boolean
    // Thông tin TCA Member (chỉ có khi thuộc hệ thống TCA)
    level?: number | null
    personalScore?: number | null
    totalScore?: number | null
    // Tên TCA (nếu có = đã active, null = chưa active)
    tcaName?: string | null
    // GroupName TCA (THÁI SƠN = Active, null/rỗng = chưa active)
    groupName?: string | null
    // Chức danh đặc biệt (C5, C20, DHTT)
    chucDanh?: string | null
    // Thống kê (chỉ đính kèm tại node Root)
    stats?: { total: number, active: number, bdh: number, dhtt: number } | null
}

// Helper: Lay thong tin System cua user (tim theo onSystem dau tien)
async function getUserSystemInfo(userId: number): Promise<{ onSystem: number | null; refSysId: number; autoId: number } | null> {
    try {
        const system = await prisma.system.findFirst({ where: { userId } })
        if (!system) return null
        return { onSystem: system.onSystem, refSysId: system.refSysId, autoId: system.autoId }
    } catch { return null }
}

// Helper: Lay root cua he thong
async function getSystemRootUser(systemId: number): Promise<{ id: number; name: string | null } | null> {
    try {
        // Tìm các node có refSysId = 0
        const potentialRoots = await prisma.system.findMany({
            where: { onSystem: systemId, refSysId: 0 }
        })

        if (potentialRoots.length === 0) return null

        // Trong số các node đó, tìm node thực sự không có cha trong closure table
        for (const sys of potentialRoots) {
            const hasParent = await prisma.systemClosure.findFirst({
                where: { descendantId: sys.autoId, systemId: systemId, depth: { gt: 0 } }
            })
            if (!hasParent) {
                const user = await prisma.user.findUnique({
                    where: { id: sys.userId },
                    select: { id: true, name: true, image: true }
                })
                if (user) return user
            }
        }

        // Fallback: nếu không tìm thấy node nào thỏa mãn, lấy node đầu tiên
        const user = await prisma.user.findUnique({
            where: { id: potentialRoots[0].userId },
            select: { id: true, name: true, image: true }
        })
        return user
    } catch { return null }
}

export async function getSystemRootUserAction(systemId: number) {
    return getSystemRootUser(systemId)
}

// Hàm xây dựng cây chuẩn dùng chung cho cả Thành viên và Hệ thống
async function buildStandardTree(
    rootId: number,
    type: 'USER' | 'SYSTEM',
    systemId?: number,
    forceFull: boolean = false
): Promise<GenealogyNode | null> {
    try {
        const isSystem = type === 'SYSTEM'

        // Load sharing sponsor map for Course 22 to calculate descendants recursively
        const courseEnrollments = await prisma.enrollment.findMany({
            where: { courseId: 22 },
            select: { userId: true, referrerId: true }
        })
        const parentToChildrenMap = new Map<number, number[]>()
        courseEnrollments.forEach(e => {
            if (e.referrerId) {
                if (!parentToChildrenMap.has(e.referrerId)) {
                    parentToChildrenMap.set(e.referrerId, [])
                }
                parentToChildrenMap.get(e.referrerId)!.push(e.userId)
            }
        })
        const countSharingDescendants = (userId: number): number => {
            const queue = [userId]
            let count = 0
            while (queue.length > 0) {
                const current = queue.shift()!
                const children = parentToChildrenMap.get(current) || []
                count += children.length
                queue.push(...children)
            }
            return count
        }

        // 1. Lấy thông tin Root
        const rootUser = await prisma.user.findUnique({
            where: { id: rootId },
            select: { id: true, name: true, image: true, referrerId: true }
        })
        if (!rootUser) return null

        let rootAutoId = rootId
        let rootSys: any = null
        if (isSystem) {
            rootSys = await prisma.system.findFirst({ where: { userId: rootId, onSystem: systemId } })
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
                include: { user: { select: { id: true, name: true, image: true } } }
            })
        } else {
            const users = await prisma.user.findMany({
                where: {
                    referrerId: rootId,
                    id: { not: rootId }
                },
                select: { id: true, name: true, image: true }
            })
            f1Data = users.map((u: { id: number; name: string | null }) => ({ ...u, autoId: u.id, user: u }))
        }

        if (f1Data.length === 0) {
            return {
                id: rootUser.id, name: rootUser.name, referrerId: rootUser.referrerId || null,
                sharingCount: countSharingDescendants(rootUser.id),
                totalSubCount: 1, f1aCount: 0, f1bCount: 0, f1cCount: 0,
                groupATotalSub: 0, groupBTotalSub: 0, groupCTotalSub: 0,
                groupA: [], groupB: [], children: [], isRoot: true, seq: 0
            }
        }

        const f1AutoIds = f1Data.map(f => f.autoId)

        // 3. Lấy Closures (Lấy descendants của F1s để tìm F2s)
        const closureModel = isSystem ? prisma.systemClosure : prisma.userClosure
        const whereBase = isSystem ? { systemId } : {}

        let allClosures: any[] = []
        let totalCount = 0

        if (forceFull) {
            // SỬA: Phải dùng rootAutoId cho System
            const descendantIds = await (closureModel as any).findMany({
                where: { ...whereBase, ancestorId: rootAutoId },
                select: { descendantId: true }
            })
            const idList = descendantIds.map((d: any) => d.descendantId)
            totalCount = idList.length

            allClosures = await (closureModel as any).findMany({
                where: {
                    ...whereBase,
                    ancestorId: { in: [rootAutoId, ...idList] },
                    descendantId: { in: idList }
                },
                include: { descendant: isSystem ? { include: { user: { select: { id: true, name: true, image: true } } } } : { select: { id: true, name: true, image: true } } }
            })
        } else {
            // SỬA: Lấy toàn bộ descendants của F1s (depth >= 1)
            const allDescOfF1s = await (closureModel as any).findMany({
                where: { ...whereBase, ancestorId: { in: f1AutoIds }, depth: { gte: 1 } },
                select: { descendantId: true }
            })
            const otherAutoIds = [...new Set(allDescOfF1s.map((c: any) => c.descendantId))]

            const [closures, count] = await Promise.all([
                (closureModel as any).findMany({
                    where: {
                        ...whereBase,
                        OR: [
                            { ancestorId: { in: [rootAutoId, ...f1AutoIds, ...otherAutoIds] } },
                            { descendantId: { in: f1AutoIds } }
                        ],
                        depth: { gte: 0 }
                    },
                    include: { descendant: isSystem ? { include: { user: { select: { id: true, name: true, image: true } } } } : { select: { id: true, name: true, image: true } } }
                }),
                (closureModel as any).count({
                    where: { ...whereBase, ancestorId: rootAutoId }
                })
            ])
            allClosures = closures
            totalCount = count
        }

        const closureByAncestor = new Map<number, any[]>()
        const allUserIds = new Set<number>([rootUser.id])
        for (const c of allClosures) {
            const desc = isSystem ? c.descendant.user : c.descendant
            if (desc?.id) allUserIds.add(desc.id)
        }

        const tcaMemberMap = new Map<number, any>()
        let tcaMembers: any[] = []

        if (isSystem && systemId === 1) {
            tcaMembers = await prisma.tCAMember.findMany({
                where: {
                    OR: [
                        { userId: { in: [...allUserIds] } },
                        { tcaId: { in: [...allUserIds] } }
                    ]
                },
                select: { userId: true, tcaId: true, level: true, personalScore: true, totalScore: true, name: true, groupName: true, chuc_danh: true }
            })

            for (const m of tcaMembers) {
                const newPersonalScore = m.personalScore != null ? Number(m.personalScore) : null
                const newTotalScore = m.totalScore != null ? Number(m.totalScore) : null

                const existing = tcaMemberMap.get(m.userId)
                if (!existing || (newPersonalScore && newPersonalScore > (existing.personalScore ?? 0))) {
                    tcaMemberMap.set(m.userId, {
                        level: m.level ?? null,
                        personalScore: newPersonalScore,
                        totalScore: newTotalScore,
                        name: m.name ?? null,
                        groupName: m.groupName ?? null,
                        chucDanh: (m as any).chuc_danh ?? null
                    })
                }

                if (m.tcaId && m.tcaId !== m.userId) {
                    const existingTcaId = tcaMemberMap.get(m.tcaId)
                    if (!existingTcaId || (newPersonalScore && newPersonalScore > (existingTcaId.personalScore ?? 0))) {
                        tcaMemberMap.set(m.tcaId, {
                            level: m.level ?? null,
                            personalScore: newPersonalScore,
                            totalScore: newTotalScore,
                            name: m.name ?? null,
                            groupName: m.groupName ?? null,
                            chucDanh: (m as any).chuc_danh ?? null
                        })
                    }
                }
            }
        }

        const getUserFromRow = (row: any) => isSystem ? row.descendant?.user : row.descendant

        for (const c of allClosures) {
            if (!closureByAncestor.has(c.ancestorId)) closureByAncestor.set(c.ancestorId, [])
            const user = getUserFromRow(c)
            if (!user) continue

            closureByAncestor.get(c.ancestorId)!.push({
                depth: c.depth,
                userId: user.id,
                name: user.name,
                image: user.image,
                autoId: isSystem ? c.descendantId : user.id,
                level: isSystem ? c.descendant.level : null,
                totalPoints: isSystem ? Number(c.descendant.totalPoints) : null,
            })
        }

        let groupA: any[] = [], groupB: any[] = [], groupC: any[] = []
        let groupATotalSub = 0, groupBTotalSub = 0, groupCTotalSub = 0

        for (const f1 of f1Data) {
            const user = getUserFromRow(f1) || f1.user
            if (!user) continue

            const closures = closureByAncestor.get(f1.autoId) || []
            const hasF2 = closures.some(c => c.depth === 1)
            const hasF3 = closures.some(c => c.depth === 2)

            const f2s = closures.filter(c => c.depth === 1).map(c => {
                const f2tca = tcaMemberMap.get(c.userId) ?? tcaMemberMap.get(c.autoId)
                return {
                    id: c.userId, name: c.name, image: c.image,
                    level: f2tca?.level ?? c.level ?? null,
                    personalScore: f2tca?.personalScore ?? (isSystem ? 17 : null),
                    totalScore: f2tca?.totalScore ?? (c as any).totalPoints ?? null,
                    tcaName: f2tca?.name ?? null,
                    groupName: f2tca?.groupName ?? null,
                    chucDanh: f2tca?.chucDanh ?? null
                }
            })

            const f1tca = tcaMemberMap.get(user.id) ?? tcaMemberMap.get(f1.autoId)
            const fData = {
                id: user.id, name: user.name, image: user.image, totalSubCount: closures.length, children: f2s,
                level: f1tca?.level ?? (isSystem ? f1.level : null),
                personalScore: f1tca?.personalScore ?? (isSystem ? 17 : null),
                totalScore: f1tca?.totalScore ?? (isSystem ? Number(f1.totalPoints) : null),
                tcaName: f1tca?.name ?? null,
                groupName: f1tca?.groupName ?? null,
                chucDanh: f1tca?.chucDanh ?? null
            }

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

        const buildFullSubtree = (ancestorAutoId: number, maxDepth: number = 10): GenealogyNode[] => {
            const ancestorClosures = closureByAncestor.get(ancestorAutoId) || []
            const directChildren = ancestorClosures.filter(c => c.depth === 1)
            return directChildren.map(child => {
                const childClosures = closureByAncestor.get(child.autoId) || []
                const tcaData = tcaMemberMap.get(child.userId) ?? tcaMemberMap.get(child.autoId)

                let gA: any[] = [], gB: any[] = [], gC_count = 0
                for (const gc of childClosures.filter(c => c.depth === 1)) {
                    const gcClosures = closureByAncestor.get(gc.autoId) || []
                    const hasF2 = gcClosures.some(c => c.depth === 1)
                    const hasF3 = gcClosures.some(c => c.depth === 2)
                    const gcTca = tcaMemberMap.get(gc.userId) ?? tcaMemberMap.get(gc.autoId)
                    const gcData = {
                        id: gc.userId, name: gc.name, image: gc.image,
                        totalSubCount: gcClosures.length,
                        level: gcTca?.level ?? gc.level ?? null,
                        personalScore: gcTca?.personalScore ?? (isSystem ? 17 : null),
                        totalScore: gcTca?.totalScore ?? (gc as any).totalPoints ?? null,
                        groupName: gcTca?.groupName ?? null,
                        chucDanh: gcTca?.chucDanh ?? null,
                    }
                    if (!hasF2) gA.push(gcData)
                    else if (!hasF3) gB.push(gcData)
                    else gC_count++
                }

                const grandchildren = child.autoId && child.autoId !== ancestorAutoId
                    ? buildFullSubtree(child.autoId, maxDepth - 1)
                    : []

                return {
                    id: child.userId, name: child.name, image: child.image, referrerId: null,
                    sharingCount: countSharingDescendants(child.userId),
                    totalSubCount: childClosures.length,
                    f1aCount: gA.length, f1bCount: gB.length, f1cCount: gC_count,
                    groupATotalSub: gA.reduce((sum: number, n: any) => sum + n.totalSubCount, 0),
                    groupBTotalSub: gB.reduce((sum: number, n: any) => sum + n.totalSubCount, 0),
                    groupCTotalSub: grandchildren.reduce((sum: number, n: GenealogyNode) => sum + n.totalSubCount, 0),
                    groupA: gA, groupB: gB, children: grandchildren,
                    level: tcaData?.level ?? child.level ?? null,
                    personalScore: tcaData?.personalScore ?? (isSystem ? 17 : null),
                    totalScore: tcaData?.totalScore ?? (child as any).totalPoints ?? null,
                    tcaName: tcaData?.name ?? null,
                    groupName: tcaData?.groupName ?? null,
                    chucDanh: tcaData?.chucDanh ?? null,
                    seq: child.autoId - rootAutoId,
                }
            })
        }

        const children: GenealogyNode[] = groupC.map(f1Info => {
            const f1Record = f1Data.find(f => {
                const u = getUserFromRow(f) || f.user
                return u?.id === f1Info.id
            })
            if (!f1Record) return null as any
            const f1Closures = closureByAncestor.get(f1Record.autoId) || []
            const f2s = f1Closures.filter(c => c.depth === 1)
            const f2Subtrees = f2s.map(f2 => {
                const grandchildren = buildFullSubtree(f2.autoId, 5)
                const f2tca = tcaMemberMap.get(f2.userId) ?? tcaMemberMap.get(f2.autoId)
                return {
                    id: f2.userId, name: f2.name, image: f2.image, referrerId: null,
                    sharingCount: countSharingDescendants(f2.userId),
                    totalSubCount: (closureByAncestor.get(f2.autoId) || []).length,
                    f1aCount: 0, f1bCount: 0, f1cCount: 0, groupATotalSub: 0, groupBTotalSub: 0, groupCTotalSub: 0,
                    groupA: [], groupB: [], children: grandchildren,
                    level: f2tca?.level ?? f2.level ?? null,
                    personalScore: f2tca?.personalScore ?? (isSystem ? 17 : null),
                    totalScore: f2tca?.totalScore ?? (f2 as any).totalPoints ?? null,
                    groupName: f2tca?.groupName ?? null,
                    chucDanh: f2tca?.chucDanh ?? null,
                    seq: f2.autoId - rootAutoId,
                }
            })

            const grandF1s = f1Closures.filter(c => c.depth === 1)
            let gA: any[] = [], gB: any[] = [], gC: any[] = []
            let gATotal = 0, gBTotal = 0, gCTotal = 0

            for (const gf1 of grandF1s) {
                const gf1Closures = closureByAncestor.get(gf1.autoId) || []
                const gHasF2 = gf1Closures.some(c => c.depth === 1)
                const gHasF3 = gf1Closures.some(c => c.depth === 2)
                const gf1tca = tcaMemberMap.get(gf1.userId) ?? tcaMemberMap.get(gf1.autoId)
                const gfData = { id: gf1.userId, name: gf1.name, image: gf1.image, totalSubCount: gf1Closures.length, level: gf1tca?.level ?? gf1.level ?? null, personalScore: gf1tca?.personalScore ?? (isSystem ? 17 : null), groupName: gf1tca?.groupName ?? null, chucDanh: gf1tca?.chucDanh ?? null }
                if (!gHasF2) { gA.push(gfData); gATotal += gf1Closures.length }
                else if (!gHasF3) { gB.push(gfData); gBTotal += gf1Closures.length }
                else { gC.push(gfData); gCTotal += gf1Closures.length }
            }

            const f1tca = tcaMemberMap.get(f1Info.id) ?? tcaMemberMap.get(f1Record?.autoId)
            return {
                id: f1Info.id, name: f1Info.name, image: f1Info.image, referrerId: null,
                sharingCount: countSharingDescendants(f1Info.id),
                totalSubCount: f1Closures.length, f1aCount: gA.length, f1bCount: gB.length, f1cCount: gC.length,
                groupATotalSub: gATotal, groupBTotalSub: gBTotal, groupCTotalSub: gCTotal,
                groupA: gA, groupB: gB, children: f2Subtrees,
                level: f1tca?.level ?? (isSystem ? f1Record?.level : null) ?? null, personalScore: f1tca?.personalScore ?? (isSystem ? 17 : null), totalScore: f1tca?.totalScore ?? (isSystem ? Number(f1Record?.totalPoints) : null) ?? null, chucDanh: f1tca?.chucDanh ?? null,
                seq: (f1Record?.autoId || 0) - rootAutoId,
            }
        })

        const rootTca = tcaMemberMap.get(rootUser.id)
        const statsData = (isSystem && systemId === 1) ? {
            total: totalCount,
            active: tcaMembers.filter((m: any) => {
                const score = m.personalScore != null ? Number(m.personalScore) : 0
                return score > 0
            }).length,
            bdh: tcaMembers.filter((m: any) => m.chuc_danh === 'C5' || m.chuc_danh === 'C20').length,
            dhtt: tcaMembers.filter((m: any) => m.chuc_danh === 'DHTT').length
        } : (isSystem ? { total: totalCount, active: 0, bdh: 0, dhtt: 0 } : null)

        return {
            id: rootUser.id, name: rootUser.name, image: rootUser.image, referrerId: rootUser.referrerId || null,
            sharingCount: countSharingDescendants(rootUser.id),
            totalSubCount: totalCount, f1aCount: groupA.length, f1bCount: groupB.length, f1cCount: groupC.length,
            groupATotalSub, groupBTotalSub, groupCTotalSub,
            children: forceFull ? buildFullSubtree(rootAutoId) : children,
            groupA: forceFull ? [] : groupA, groupB: forceFull ? [] : groupB,
            isRoot: true, seq: 0,
            level: rootTca?.level ?? (isSystem ? rootSys?.level : null) ?? null, personalScore: rootTca?.personalScore ?? (isSystem ? 17 : null), totalScore: rootTca?.totalScore ?? (isSystem ? Number(rootSys?.totalPoints) : null) ?? null,
            tcaName: rootTca?.name ?? null, groupName: rootTca?.groupName ?? null, chucDanh: rootTca?.chucDanh ?? null,
            stats: statsData
        }
    } catch (e) {
        console.error("[DB ERROR] buildStandardTree:", e)
        return null
    }
}

// --- Public Actions ---

export async function getGenealogyTreeAction(rootId: number = 0) {
    try {
        const session = await auth(); if (!session?.user?.id) throw new Error("Unauthorized")
        const userId = parseInt(session.user.id); const isAdmin = session.user.role === Role.ADMIN
        let actualRootId = rootId
        if (rootId === 0) {
            if (isAdmin) {
                actualRootId = 0
            } else actualRootId = userId
        }
        const tree = await buildStandardTree(actualRootId, 'USER')
        return { success: true, tree }
    } catch (error: any) { return { success: false, error: error.message } }
}

export async function getGenealogyChildrenAction(parentId: number) {
    try {
        const session = await auth(); if (!session?.user?.id) throw new Error("Unauthorized")
        const tree = await buildStandardTree(parentId, 'USER')
        return { success: true, tree: tree ? { ...tree, isRoot: false } : null }
    } catch (error: any) { return { success: false, error: error.message } }
}

export async function getSystemTreeAction(systemId: number, forceFull: boolean = true) {
    try {
        const session = await auth(); if (!session?.user?.id) throw new Error("Unauthorized")
        const userId = parseInt(session.user.id); const isAdmin = session.user.role === Role.ADMIN
        const isRootAdmin = userId === 0 || isAdmin
        let rootUserId = userId

        const userTca = await prisma.tCAMember.findFirst({
            where: { userId },
            select: { chuc_danh: true }
        })
        const isC5 = userTca?.chuc_danh === 'C5'
        const isYtbAdmin = systemId === 3 && (userId === 327 || userId === 330)

        const systemInfo = await getUserSystemInfo(userId)
        if (!systemInfo || systemInfo.onSystem !== systemId || isC5 || isRootAdmin || isYtbAdmin) {
            if (isRootAdmin || isC5 || isYtbAdmin) {
                const root = await getSystemRootUser(systemId)
                if (root) rootUserId = root.id
                else if (!isRootAdmin) return { success: false, error: "Hệ thống chưa có dữ liệu" }
            } else {
                return { success: false, error: "Bạn chưa tham gia hệ thống này" }
            }
        }

        const tree = await buildStandardTree(rootUserId, 'SYSTEM', systemId, forceFull)
        return { success: true, tree }
    } catch (error: any) { return { success: false, error: error.message } }
}

export async function getSystemChildrenAction(parentId: number, systemId: number) {
    try {
        const session = await auth(); if (!session?.user?.id) throw new Error("Unauthorized")
        const tree = await buildStandardTree(parentId, 'SYSTEM', systemId)
        return { success: true, tree: tree ? { ...tree, isRoot: false } : null }
    } catch (error: any) { return { success: false, error: error.message } }
}

export async function searchGenealogyByIdAction(targetId: number, systemId?: number, limitAncestors: number | null = null) {
    try {
        const session = await auth(); if (!session?.user?.id) throw new Error("Unauthorized")
        const isSystem = systemId !== undefined
        let targetAutoId: number | null = null

        if (isSystem) {
            const system = await prisma.system.findFirst({ where: { userId: targetId, onSystem: systemId } })
            if (!system) return { success: false, error: `Không tìm thấy mã #${targetId} trong hệ thống này` }
            targetAutoId = system.autoId
        } else {
            const user = await prisma.user.findUnique({ where: { id: targetId } })
            if (!user) return { success: false, error: `Không tìm thấy mã #${targetId}` }
            targetAutoId = targetId
        }

        const ancestors = isSystem
            ? await prisma.systemClosure.findMany({
                where: { systemId, descendantId: targetAutoId! },
                orderBy: { depth: 'desc' },
                include: { ancestor: { include: { user: { select: { id: true, name: true, image: true } } } } }
            })
            : await prisma.userClosure.findMany({
                where: { descendantId: targetId },
                orderBy: { depth: 'desc' },
                include: { ancestor: { select: { id: true, name: true, image: true, referrerId: true } } }
            })

        if (!ancestors || ancestors.length === 0) return { success: false, error: `Không tìm thấy đường dẫn cho mã #${targetId}` }

        const targetSubtree = await buildStandardTree(targetId, isSystem ? 'SYSTEM' : 'USER', systemId, true)
        if (!targetSubtree) return { success: false, error: "Lỗi khi khởi tạo cây con" }
        targetSubtree.isSearchTarget = true

        let mergedTree: GenealogyNode = { ...targetSubtree, isRoot: ancestors.length === 1 }
        const pathNodes: any[] = ancestors.map((anc: any) => ({
            id: isSystem ? anc.ancestor.userId : (anc.ancestorId || anc.ancestor.id),
            name: isSystem ? anc.ancestor.user?.name : anc.ancestor.name,
            image: isSystem ? anc.ancestor.user?.image : anc.ancestor.image
        }))

        const startIdx = ancestors.length - 2;
        const endIdx = limitAncestors !== null ? Math.max(0, ancestors.length - 1 - limitAncestors) : 0;

        for (let i = startIdx; i >= endIdx; i--) {
            const nodeId = pathNodes[i].id
            const ancTree = await buildStandardTree(nodeId, isSystem ? 'SYSTEM' : 'USER', systemId, false)
            if (ancTree) {
                mergedTree = { ...ancTree, isRoot: i === endIdx, children: [mergedTree], groupA: [], groupB: [] }
            }
        }

        return { success: true, mergedTree, path: pathNodes, targetId }
    } catch (error: any) { return { success: false, error: error.message || 'Lỗi khi tìm kiếm' } }
}

export async function getUserSystemsAction() {
    try {
        const session = await auth(); if (!session?.user?.id) throw new Error("Unauthorized")
        const userId = parseInt(session.user.id)
        const systems = await prisma.system.findMany({ where: { userId }, select: { onSystem: true } })
        return { success: true, systems: systems.map((s: any) => s.onSystem) }
    } catch { return { success: false, error: "Lỗi DB" } }
}

export async function getStudentsAction(query?: string, role?: Role | 'ALL' | 'COURSE_86_DAYS' | 'UNVERIFIED', page: number = 0, limit: number = 20, sortBy: 'createdAt' | 'id' = 'createdAt', sortOrder: 'asc' | 'desc' = 'desc', courseId?: number) {
    try {
        const session = await auth()
        if (!session?.user?.id) throw new Error("Unauthorized")

        const userId = parseInt(session.user.id)
        const isAdmin = session.user.role === Role.ADMIN
        const isTeacher = session.user.role === Role.TEACHER

        if (!isAdmin && !isTeacher) throw new Error("Unauthorized")

        let where: any = {}
        let scopeWhere: any = {}

        if (isTeacher) {
            const enrollFilter: any = { course: { teacherId: userId } }
            // Cùng lý do như nhánh admin bên dưới: chỉ tính thành viên ACTIVE
            // khi xem theo 1 khóa học cụ thể, không tính cả PENDING.
            if (courseId) { enrollFilter.courseId = courseId; enrollFilter.status = 'ACTIVE' }
            where.enrollments = { some: enrollFilter }

            scopeWhere.enrollments = { some: { course: { teacherId: userId } } }
        }

        if (isAdmin) {
            if (courseId) {
                // Chỉ tính thành viên đã ACTIVE (đã được phê duyệt/kích hoạt) —
                // trước đây thiếu filter status nên đếm cả PENDING (chưa thanh
                // toán/chưa duyệt), khiến số liệu hiện trong modal "Xem thành
                // viên" lệch cao hơn badge "X TV" ở danh sách khoá học (nơi đã
                // lọc đúng, xem getAdminCoursesAction).
                where.enrollments = { some: { courseId, status: 'ACTIVE' } }
            } else if (role === 'COURSE_86_DAYS') {
                where.enrollments = { some: { courseId: 1, status: 'ACTIVE' } }
            } else if (role === 'UNVERIFIED') {
                where.emailVerified = null
            } else if (role && role !== 'ALL') {
                where.role = role
            }
        }

        if (query) {
            const trimmedQuery = query.trim()
            if (trimmedQuery.startsWith('#')) {
                const id = parseInt(trimmedQuery.substring(1))
                if (!isNaN(id)) where.id = id
            } else if (/^\d+$/.test(trimmedQuery)) {
                const id = parseInt(trimmedQuery)
                where.OR = [
                    { id },
                    { name: { contains: trimmedQuery, mode: 'insensitive' } },
                    { email: { contains: trimmedQuery, mode: 'insensitive' } }
                ]
            } else {
                where.OR = [
                    { name: { contains: trimmedQuery, mode: 'insensitive' } },
                    { email: { contains: trimmedQuery, mode: 'insensitive' } },
                    { phone: { contains: trimmedQuery, mode: 'insensitive' } }
                ]
            }
        }

        const skip = page * limit

        const [students, total, rawRoleCounts] = await Promise.all([
            prisma.user.findMany({
                where,
                include: {
                    enrollments: {
                        include: {
                            course: { select: { name_lop: true } },
                            _count: { select: { lessonProgress: { where: { status: 'COMPLETED' } } } }
                        }
                    }
                },
                orderBy: { [sortBy]: sortOrder },
                take: limit,
                skip
            }),
            prisma.user.count({ where }),
            isAdmin
                ? prisma.user.groupBy({ by: ['role'], _count: { id: true } })
                : prisma.user.groupBy({ by: ['role'], _count: { id: true }, where: scopeWhere })
        ])

        const roleCounts: Record<string, number> = {}
        rawRoleCounts.forEach((rc: any) => { roleCounts[rc.role] = rc._count.id })

        if (isAdmin) {
            roleCounts['ALL'] = await prisma.user.count()
            roleCounts['COURSE_86_DAYS'] = await prisma.enrollment.count({ where: { courseId: 1, status: 'ACTIVE' } })
            roleCounts['UNVERIFIED'] = await prisma.user.count({ where: { emailVerified: null } })
        } else {
            roleCounts['ALL'] = await prisma.user.count({ where: scopeWhere })
            roleCounts['UNVERIFIED'] = await prisma.user.count({ where: { ...scopeWhere, emailVerified: null } })
        }

        const totalPages = Math.ceil(total / limit)
        return { success: true, students, total, page, totalPages, roleCounts }
    } catch (error: any) { return { success: false, error: error.message } }
}

// Helper dùng chung: kiểm tra quyền xem/sửa thành viên 1 khóa học (admin hoặc GV chủ nhiệm)
async function checkCourseMemberAccess(courseId: number) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" as const }
    const isAdmin = session.user.role === Role.ADMIN
    const isTeacher = session.user.role === Role.TEACHER
    if (!isAdmin && !isTeacher) return { error: "Unauthorized" as const }

    const userId = parseInt(session.user.id)
    const course = await prisma.course.findUnique({ where: { id: courseId }, select: { teacherId: true } })
    if (!course) return { error: "Không tìm thấy khóa học" as const }
    if (isTeacher && course.teacherId !== userId) return { error: "Không có quyền truy cập khóa học này" as const }

    return { error: null }
}

const TEAM_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
type CourseMemberLabels = { teams?: Record<string, string>; groups?: Record<string, string> }

function teamLabel(team: number, labels?: CourseMemberLabels) {
    const custom = labels?.teams?.[String(team)]
    if (custom) return custom
    return team >= 1 && team <= 26 ? `Team ${TEAM_LETTERS[team - 1]}` : `Team ${team}`
}

function groupLabel(team: number, group: number, labels?: CourseMemberLabels) {
    const custom = labels?.groups?.[`${team}:${group}`]
    return custom || `Group ${group}`
}

type DayStatus = 'missing' | 'late' | 'onTime'

/**
 * Quyền xem "bảng nộp bài" của 1 khóa học:
 * - ADMIN hoặc TEACHER sở hữu khóa: xem đầy đủ, kể cả SĐT.
 * - Học viên đang ACTIVE trong khóa: xem được nhưng KHÔNG thấy SĐT.
 */
async function checkCourseRosterAccess(courseId: number) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" as const }

    const userId = parseInt(session.user.id)
    const isAdmin = session.user.role === Role.ADMIN
    const isTeacher = session.user.role === Role.TEACHER

    const course = await prisma.course.findUnique({ where: { id: courseId }, select: { teacherId: true } })
    if (!course) return { error: "Không tìm thấy khóa học" as const }

    if (isAdmin || (isTeacher && course.teacherId === userId)) {
        return { error: null, canViewPhone: true }
    }

    const enrollment = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId } },
        select: { status: true }
    })
    if (enrollment?.status === 'ACTIVE') {
        return { error: null, canViewPhone: false }
    }

    return { error: "Bạn không có quyền xem danh sách thành viên khóa học này" as const }
}

/**
 * Truy vấn dữ liệu roster dùng chung: danh sách bài học (theo `order` = ngày),
 * thành viên ACTIVE + trạng thái nộp bài từng ngày (missing/late/onTime).
 */
async function buildCourseRoster(courseId: number) {
    const [course, lessons, enrollments] = await Promise.all([
        prisma.course.findUnique({ where: { id: courseId }, select: { id: true, name_lop: true, id_khoa: true, memberLabels: true } }),
        prisma.lesson.findMany({ where: { courseId }, orderBy: { order: 'asc' }, select: { id: true, order: true, title: true } }),
        prisma.enrollment.findMany({
            where: { courseId, status: 'ACTIVE' },
            select: {
                id: true,
                memberRole: true,
                team: true,
                group: true,
                startedAt: true,
                activatedAt: true,
                createdAt: true,
                user: { select: { id: true, name: true, phone: true } },
                lessonProgress: { select: { lessonId: true, submittedAt: true, scores: true } }
            },
            orderBy: [{ activatedAt: 'asc' }, { createdAt: 'asc' }]
        })
    ])

    const todayMid = new Date()
    todayMid.setHours(0, 0, 0, 0)

    const members = enrollments.map(e => {
        const progressByLesson = new Map(e.lessonProgress.map(p => [p.lessonId, p]))
        const days = lessons.map(l => {
            const p = progressByLesson.get(l.id)
            let status: DayStatus = 'missing'
            if (p?.submittedAt) {
                const timing = (p.scores as any)?.timing
                status = timing === -1 ? 'late' : 'onTime'
            }
            return { order: l.order, status }
        })

        // % nộp ĐÚNG HẠN tính đến hết ngày hôm qua (không tính nộp muộn), theo mốc
        // bắt đầu học riêng của từng thành viên (giống cách tính hạn nộp trong
        // submitAssignmentAction). Nộp muộn vẫn hiện màu tím ở lưới ngày, chỉ
        // không được cộng vào % này.
        const base = e.startedAt || e.activatedAt || e.createdAt
        const baseMid = new Date(base)
        baseMid.setHours(0, 0, 0, 0)
        const dayIndexToday = Math.floor((todayMid.getTime() - baseMid.getTime()) / 86400000) + 1
        const elapsedDays = Math.max(0, Math.min(lessons.length, dayIndexToday - 1))
        const onTimeElapsed = days.filter(d => d.order <= elapsedDays && d.status === 'onTime').length
        const completionPercent = elapsedDays > 0 ? Math.round((onTimeElapsed / elapsedDays) * 100) : null

        return {
            id: e.id,
            memberRole: e.memberRole,
            team: e.team,
            group: e.group,
            user: e.user,
            days,
            completionPercent,
        }
    })

    // Team asc -> PS trước TV -> Group asc -> id asc
    members.sort((a, b) => {
        if (a.team !== b.team) return a.team - b.team
        if (a.memberRole !== b.memberRole) return a.memberRole === 'PS' ? -1 : 1
        if (a.group !== b.group) return a.group - b.group
        return a.id - b.id
    })

    return { course, lessons, members }
}

/**
 * Bảng nộp bài + thành viên của 1 khóa học, dùng cho cả trang quản trị lẫn
 * trang khóa học công khai (icon "học viên"). Học viên ACTIVE của khóa được
 * xem nhưng không thấy SĐT; chỉ ADMIN/giáo viên sở hữu khóa mới thấy SĐT.
 */
export async function getCourseMemberRosterAction(courseId: number) {
    try {
        const access = await checkCourseRosterAccess(courseId)
        if (access.error) return { success: false, error: access.error }

        const { course, lessons, members } = await buildCourseRoster(courseId)
        if (!course) return { success: false, error: "Không tìm thấy khóa học" }

        const sanitizedMembers = members.map(m => ({
            ...m,
            user: access.canViewPhone ? m.user : { id: m.user.id, name: m.user.name, phone: null }
        }))

        return {
            success: true,
            canViewPhone: !!access.canViewPhone,
            course: { id: course.id, name_lop: course.name_lop, id_khoa: course.id_khoa },
            lessons,
            labels: (course.memberLabels as CourseMemberLabels) || {},
            members: sanitizedMembers,
        }
    } catch (error: any) { return { success: false, error: error.message } }
}

/**
 * Lấy danh sách thành viên ACTIVE của 1 khóa học kèm vai trò (PS/TV) + Team/Group,
 * cùng tên Team/Group tùy chỉnh đã lưu — dùng cho modal "Xem thành viên".
 */
export async function getCourseMembersAction(courseId: number) {
    try {
        const access = await checkCourseMemberAccess(courseId)
        if (access.error) return { success: false, error: access.error }

        const [members, course] = await Promise.all([
            prisma.enrollment.findMany({
                where: { courseId, status: 'ACTIVE' },
                select: {
                    id: true,
                    memberRole: true,
                    team: true,
                    group: true,
                    activatedAt: true,
                    createdAt: true,
                    user: { select: { id: true, name: true } }
                },
                orderBy: [{ activatedAt: 'asc' }, { createdAt: 'asc' }]
            }),
            prisma.course.findUnique({ where: { id: courseId }, select: { memberLabels: true } })
        ])

        return { success: true, members, labels: (course?.memberLabels as CourseMemberLabels) || {} }
    } catch (error: any) { return { success: false, error: error.message } }
}

/**
 * Đổi tên hiển thị tùy chỉnh cho 1 Team hoặc 1 Group của khóa học (lưu vào
 * Course.memberLabels, áp dụng cho các lần xem/xuất sau).
 */
export async function updateCourseMemberLabelAction(
    courseId: number,
    kind: 'team' | 'group',
    team: number,
    group: number | null,
    name: string
) {
    try {
        const access = await checkCourseMemberAccess(courseId)
        if (access.error) return { success: false, error: access.error }

        const trimmed = name.trim().slice(0, 60)
        if (!trimmed) return { success: false, error: "Tên không được để trống" }

        const course = await prisma.course.findUnique({ where: { id: courseId }, select: { memberLabels: true } })
        const current = ((course?.memberLabels as CourseMemberLabels) || {})
        const next: CourseMemberLabels = { teams: { ...current.teams }, groups: { ...current.groups } }

        if (kind === 'team') {
            next.teams![String(team)] = trimmed
        } else {
            if (group === null) return { success: false, error: "Thiếu số Group" }
            next.groups![`${team}:${group}`] = trimmed
        }

        await prisma.course.update({ where: { id: courseId }, data: { memberLabels: next as Prisma.InputJsonValue } })

        return { success: true, labels: next }
    } catch (error: any) { return { success: false, error: error.message } }
}

/**
 * Cập nhật hàng loạt vai trò (PS/TV) + Team/Group cho các thành viên của 1 khóa học.
 */
export async function updateCourseMemberAssignmentsAction(
    courseId: number,
    updates: { enrollmentId: number; memberRole: EnrollmentMemberRole; team: number; group: number }[]
) {
    try {
        const access = await checkCourseMemberAccess(courseId)
        if (access.error) return { success: false, error: access.error }

        if (!updates || updates.length === 0) return { success: false, error: "Không có thay đổi để lưu" }

        const ops = updates.map(u => prisma.enrollment.updateMany({
            where: { id: u.enrollmentId, courseId },
            data: {
                memberRole: u.memberRole === 'PS' ? 'PS' : 'TV',
                team: Math.max(1, Math.round(u.team) || 1),
                group: Math.max(1, Math.round(u.group) || 1),
            }
        }))

        await prisma.$transaction(ops)

        return { success: true }
    } catch (error: any) { return { success: false, error: error.message } }
}

/**
 * Xuất danh sách thành viên ACTIVE của 1 khóa học ra Google Sheet (ID, họ tên,
 * vai trò, Team, Group) — dùng cho modal "Xem thành viên" ở trang quản lý khóa học.
 */
export async function exportCourseMembersAction(courseId: number, courseName: string) {
    try {
        const access = await checkCourseMemberAccess(courseId)
        if (access.error) return { success: false, error: access.error }

        const [enrollments, course] = await Promise.all([
            prisma.enrollment.findMany({
                where: { courseId, status: 'ACTIVE' },
                select: { memberRole: true, team: true, group: true, user: { select: { id: true, name: true } } },
                orderBy: [{ team: 'asc' }, { memberRole: 'asc' }, { group: 'asc' }, { activatedAt: 'asc' }]
            }),
            prisma.course.findUnique({ where: { id: courseId }, select: { memberLabels: true } })
        ])

        if (enrollments.length === 0) return { success: false, error: "Chưa có thành viên nào" }

        const labels = (course?.memberLabels as CourseMemberLabels) || {}
        const headers = ["STT", "ID", "Họ tên", "Vai trò", "Team", "Group"]
        const rows = enrollments.map((e, index) => [
            (index + 1).toString(),
            e.user.id.toString(),
            e.user.name || "Chưa có tên",
            e.memberRole === 'PS' ? "Phụng sự (PS)" : "Thành viên (TV)",
            teamLabel(e.team, labels),
            e.memberRole === 'PS' ? "" : groupLabel(e.team, e.group, labels),
        ])

        const safeTitle = courseName.replace(/[<>:"/\\|?*]/g, "").substring(0, 90)
        const dateStr = new Date().toLocaleDateString("vi-VN").replace(/\//g, "-")
        const fileName = `ThanhVien_${safeTitle}_${dateStr}`

        const csvHeader = headers.join(",")
        const csvRows = rows.map(r => r.map(v => (v.includes(",") || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v)).join(","))
        const csvContent = [csvHeader, ...csvRows].join("\n")

        const { tryCreateSheet } = await import("@/lib/email-campaign-export")
        const fullSheetTitle = `[Thành viên] ${safeTitle} - ${new Date().toLocaleDateString("vi-VN")}`
        const { sheetUrl, error } = await tryCreateSheet(rows, headers, fullSheetTitle)

        return { success: true, sheetUrl, csvContent, fileName, totalRows: rows.length, sheetError: error }
    } catch (error: any) { return { success: false, error: error.message } }
}

export async function changeUserIdAction(prevState: any, formData: FormData) {
    try {
        await checkAdmin()
        const currentId = parseInt(formData.get("currentId") as string)
        const newId = parseInt(formData.get("newId") as string)
        if (isNaN(currentId) || isNaN(newId)) return { message: "Error: ID sai định dạng." }
        await prisma.$executeRawUnsafe(`UPDATE "User" SET id = ${newId} WHERE id = ${currentId}`)
        await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"User"', 'id'), max(id), true) FROM "User"`)
        revalidatePath("/admin/reserved-ids")
        return { message: `Success: Đổi ID thành công.` }
    } catch (e) { return { message: "Error: Lỗi hệ thống." } }
}

export async function getAdminCoursesAction() {
    try {
        const session = await auth(); if (!session?.user?.id) return { success: false, error: "Unauthorized" }
        const isAdmin = session.user.role === Role.ADMIN; const userId = parseInt(session.user.id)
        const where = isAdmin ? {} : { teacherId: userId }
        const courses = await prisma.course.findMany({ where, include: { _count: { select: { lessons: true, enrollments: { where: { status: 'ACTIVE' } } } }, teacher: true, courseCategory: true }, orderBy: { id: 'desc' } })
        return { success: true, courses, isAdmin, userId }
    } catch (error: any) { return { success: false, error: error.message } }
}

export async function bulkToggleCourseStatusAction(courseIds: number[], newStatus: boolean) {
    try {
        const session = await auth(); if (!session?.user?.id) return { success: false, error: "Unauthorized" }
        const isAdmin = session.user.role === Role.ADMIN; const userId = parseInt(session.user.id)
        if (!isAdmin) return { success: false, error: "Only admin can perform bulk actions" }

        await prisma.course.updateMany({
            where: { id: { in: courseIds } },
            data: { status: newStatus }
        })

        return { success: true }
    } catch (error: any) { return { success: false, error: error.message } }
}

export async function bulkUpdateCoursesOptionsAction(
    courseIds: number[],
    options: {
        status?: boolean
        categoryId?: number | null
        type?: string
        feeType?: string
        requiresReferralActivation?: boolean
        acceptedVoucherIds?: number[]
        useTemplate?: boolean
    }
) {
    try {
        const session = await auth()
        if (!session?.user?.id) return { success: false, error: "Unauthorized" }
        if (session.user.role !== Role.ADMIN) return { success: false, error: "Only admin can perform bulk actions" }

        // 1. Build scalar update data for Course model
        const courseData: Record<string, any> = {}
        if (options.status !== undefined) courseData.status = options.status
        if (options.type !== undefined) courseData.type = options.type
        if (options.feeType !== undefined) courseData.feeType = options.feeType
        if (options.requiresReferralActivation !== undefined) courseData.requiresReferralActivation = options.requiresReferralActivation
        if (options.categoryId !== undefined) {
            courseData.categoryId = options.categoryId
            if (options.categoryId) {
                const cat = await prisma.courseCategory.findUnique({ where: { id: options.categoryId } })
                if (cat) courseData.category = cat.name
            } else {
                courseData.category = 'Khác'
            }
        }

        if (Object.keys(courseData).length > 0) {
            await prisma.course.updateMany({
                where: { id: { in: courseIds } },
                data: courseData
            })
        }

        // 2. Handle acceptedVouchers relation (junction table)
        if (options.acceptedVoucherIds !== undefined) {
            for (const courseId of courseIds) {
                await prisma.courseAcceptedVoucher.deleteMany({ where: { courseId } })
                if (options.acceptedVoucherIds.length > 0) {
                    await prisma.courseAcceptedVoucher.createMany({
                        data: options.acceptedVoucherIds.map(voucherId => ({ courseId, voucherId })),
                        skipDuplicates: true
                    })
                }
            }
        }

        // 3. Handle useTemplate on CoursePage model
        if (options.useTemplate !== undefined) {
            const courses = await prisma.course.findMany({
                where: { id: { in: courseIds } },
                select: { id_khoa: true }
            })
            for (const course of courses) {
                const existingPage = await prisma.coursePage.findUnique({ where: { slug: course.id_khoa } })
                if (existingPage) {
                    await prisma.coursePage.update({
                        where: { id: existingPage.id },
                        data: { useTemplate: options.useTemplate }
                    })
                } else if (options.useTemplate) {
                    await prisma.coursePage.create({
                        data: { slug: course.id_khoa, name: course.id_khoa, useTemplate: true }
                    })
                }
            }
        }

        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function getAvailableSystemsAction() {
    try {
        const systems = await prisma.systemTree.findMany({ orderBy: { onSystem: 'asc' }, select: { onSystem: true, nameSystem: true } })
        return { success: true, systems }
    } catch (error: any) { return { success: false, error: error.message } }
}

export async function getSystemMemberListAction(systemId: number) {
    try {
        const session = await auth()
        if (!session?.user?.id) throw new Error("Unauthorized")

        const userId = parseInt(session.user.id)
        const isAdmin = session.user.role === Role.ADMIN
        const isRootAdmin = userId === 0 || isAdmin

        if (!isRootAdmin) {
            const membership = await prisma.system.findFirst({
                where: { userId, onSystem: systemId },
                select: { autoId: true }
            })
            if (!membership) throw new Error("Bạn chưa tham gia hệ thống này")
        }

        const systems = await prisma.system.findMany({
            where: { onSystem: systemId },
            select: {
                autoId: true,
                userId: true,
                level: true,
                officialTeamSize: true,
                totalMbdtVolume: true,
                totalCashVolume: true,
                status: true,
                activatedAt: true,
                expiresAt: true,
                inDongChia: true,
                user: { select: { name: true, image: true } }
            },
            orderBy: { autoId: 'asc' }
        })

        const memberIds = systems.map(s => s.userId)
        const [enrollments, wallets] = await Promise.all([
            prisma.enrollment.findMany({
                where: { courseId: 22 },
                select: { userId: true, referrerId: true }
            }),
            prisma.brkWallet.findMany({
                where: { userId: { in: memberIds } },
                select: { userId: true, totalEarned: true }
            })
        ])

        const parentToChildren = new Map<number, number[]>()
        enrollments.forEach(entry => {
            if (entry.referrerId) {
                if (!parentToChildren.has(entry.referrerId)) parentToChildren.set(entry.referrerId, [])
                parentToChildren.get(entry.referrerId)!.push(entry.userId)
            }
        })

        const countCache = new Map<number, number>()
        const countDescendants = (userId: number): number => {
            if (countCache.has(userId)) return countCache.get(userId)!
            const children = parentToChildren.get(userId) || []
            let total = children.length
            children.forEach(child => { total += countDescendants(child) })
            countCache.set(userId, total)
            return total
        }

        const walletMap = new Map(wallets.map(wallet => [wallet.userId, Number(wallet.totalEarned)]))
        const rootAutoId = systems.length > 0 ? Math.min(...systems.map(system => system.autoId)) : 0

        const members = systems.map(system => ({
            id: system.userId,
            name: system.user.name || `HV #${system.userId}`,
            image: system.user.image,
            joinOrder: system.autoId - rootAutoId,
            referralCount: countDescendants(system.userId),
            sales: Number(system.totalMbdtVolume),
            income: walletMap.get(system.userId) || 0,
            level: system.level,
            status: system.status,
            activatedAt: system.activatedAt,
            expiresAt: system.expiresAt,
            inDongChia: system.inDongChia
        }))

        return { success: true, members }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function getCurrentUserRoleAction(systemId?: number) {
    try {
        const session = await auth()
        if (!session?.user?.id) return { success: false, role: null }

        const userId = parseInt(session.user.id)
        const role = session.user.role
        const isSuperAdmin = userId === 0
        const isAdminRole = role === Role.ADMIN

        let isActualSystemRoot = false
        let isC5 = false

        if (systemId) {
            // Check if is the real root of this system (refSysId = 0)
            const root = await getSystemRootUser(systemId)
            if (root && root.id === userId) isActualSystemRoot = true

            // Check if is C5 in TCA
            if (systemId === 1) {
                const tca = await prisma.tCAMember.findFirst({
                    where: { userId },
                    select: { chuc_danh: true }
                })
                if (tca?.chuc_danh === 'C5') isC5 = true
            }

            // Check if is YTB admin (users 327, 330 — full access to YTB system)
            if (systemId === 3 && (userId === 327 || userId === 330)) {
                isActualSystemRoot = true
            }
        }

        return {
            success: true,
            role: isSuperAdmin ? Role.ADMIN : role,
            userId,
            // CHỈ ẨN CHECKBOX NẾU LÀ ADMIN TỐI CAO HOẶC ROOT THỰC SỰ CỦA HỆ THỐNG ĐÓ
            isRoot: isSuperAdmin || isActualSystemRoot,
            isC5,
            canViewFull: isSuperAdmin || isAdminRole || isC5
        }
    } catch { return { success: false, role: null } }
}

export async function getMemberDetailsAction(userId: number, systemId?: number) {
    try {
        const session = await auth(); if (!session?.user?.id) throw new Error("Unauthorized")

        // Parallel queries phase 1: User & Enrollment info
        const [user, enrollment] = await Promise.all([
            prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    createdAt: true,
                    image: true,
                    referrerId: true,
                    referrer: { select: { id: true, name: true } }
                }
            }),
            prisma.enrollment.findFirst({
                where: { userId, courseId: 22 },
                select: {
                    updatedAt: true,
                    referrerId: true,
                    referrer: { select: { id: true, name: true } }
                }
            })
        ])

        // TCA system — keep existing logic
        if (!systemId || systemId === 1) {
            const tcaRaw = await prisma.tCAMember.findFirst({ where: { userId }, select: { level: true, personalScore: true, totalScore: true, groupName: true, chuc_danh: true, name: true, tcaId: true } })
            const tca = tcaRaw ? { ...tcaRaw, personalScore: tcaRaw.personalScore != null ? Number(tcaRaw.personalScore) : 0, totalScore: tcaRaw.totalScore != null ? Number(tcaRaw.totalScore) : 0 } : null
            return { success: true, user, tca, systemData: null, enrollment }
        }

        // Non-TCA system (BRK / KTC / YTB)
        // Parallel queries phase 2: System record, wallet, root, systemTree and timelines
        const [sysRec, wallet, rootSys, systemTree, activationTimeline, latestLegacyTimeline, latestLevelUpTimeline] = await Promise.all([
            prisma.system.findUnique({
                where: { userId_onSystem: { userId, onSystem: systemId } },
                include: { planApplication: { select: { applicationCode: true, businessPlan: { select: { code: true } } } } }
            }),
            prisma.brkWallet.findUnique({
                where: { userId },
                select: { balance: true, brkd: true, voucherBalance: true, mbvBalance: true, totalEarned: true, totalWithdrawn: true }
            }),
            prisma.system.findFirst({ where: { onSystem: systemId, refSysId: 0 }, select: { autoId: true } }),
            prisma.systemTree.findUnique({ where: { onSystem: systemId }, select: { nameSystem: true, fee: true } }),
            prisma.brkTimelineRecord.findFirst({
                where: { userId, onSystem: systemId, type: 'ACTIVATION' }
            }),
            prisma.brkTimelineRecord.findFirst({
                where: { userId, onSystem: systemId, applicationId: null },
                orderBy: { id: 'desc' }
            }),
            prisma.brkTimelineRecord.findFirst({
                where: { userId, onSystem: systemId, type: 'LEVEL_UP' },
                orderBy: { id: 'desc' }
            })
        ])

        const seq = rootSys && sysRec ? sysRec.autoId - rootSys.autoId : null
        const teamTotalBrkd = sysRec?.applicationId != null
            ? Number(sysRec.totalMbdtVolume)
            : Number(latestLegacyTimeline?.accumulatedBrkdVolume || 0)
        const teamTotalVnd = sysRec?.applicationId != null
            ? Number(sysRec.totalCashVolume)
            : Number(latestLegacyTimeline?.accumulatedCashVolume || 0)

        // Upline queries bypassed since they are not rendered in the UI anymore
        const upline1 = null
        const upline2 = null

        return {
            success: true,
            user,
            tca: null,
            enrollment,
            systemData: {
                systemName: systemTree?.nameSystem || `Hệ thống ${systemId}`,
                applicationId: sysRec?.applicationId ?? null,
                applicationCode: sysRec?.planApplication?.applicationCode ?? null,
                businessPlanCode: sysRec?.planApplication?.businessPlan.code ?? null,
                level: sysRec?.level ?? null,
                totalPoints: sysRec?.totalPoints != null ? Number(sysRec.totalPoints) : null,
                personalScore: 17,
                seq,
                status: sysRec?.status ?? null,
                joinedAt: activationTimeline?.time ?? sysRec?.activatedAt ?? null,
                levelUpdatedAt: latestLevelUpTimeline?.time ?? null,
                teamTotalBrkd,
                teamTotalVnd,
                teamSize: sysRec?.applicationId != null
                    ? sysRec.officialTeamSize
                    : latestLegacyTimeline?.accumulatedTeamSize ?? 1,
                upline1,
                upline2,
                wallet: wallet ? {
                    balance: Number(wallet.balance),
                    brkd: Number(wallet.brkd),
                    voucherBalance: Number(wallet.voucherBalance),
                    mbvBalance: Number(wallet.mbvBalance),
                    totalEarned: Number(wallet.totalEarned),
                    totalWithdrawn: Number(wallet.totalWithdrawn),
                } : null
            }
        }
    } catch (e: any) { return { success: false, error: e.message } }
}

// ==========================================
// RESERVED ID & USER ID MANAGEMENT
// ==========================================

export async function getReservedIds() {
    await checkAdmin()
    return await prisma.reservedId.findMany({
        orderBy: { id: 'desc' }
    })
}

export async function addReservedIdAction(prevState: any, formData: FormData) {
    await checkAdmin()
    const id = parseInt(formData.get("id") as string)
    const note = formData.get("note") as string || "Admin Added"
    if (isNaN(id)) return { message: "Error: ID phải là số." }
    try {
        const existing = await prisma.reservedId.findUnique({ where: { id } })
        if (existing) return { message: `Error: ID ${id} đã có trong danh sách.` }
        await prisma.reservedId.create({
            data: { id, note }
        })
        revalidatePath("/admin/reserved-ids")
        return { message: `Success: Đã thêm ID ${id} vào danh sách dự trữ.` }
    } catch (_e) {
        console.error(_e)
        return { message: "Error: Lỗi Server khi thêm ID." }
    }
}

export async function deleteReservedIdAction(id: number) {
    await checkAdmin()
    try {
        await prisma.reservedId.delete({ where: { id } })
        revalidatePath("/admin/reserved-ids")
        return { message: `Success: Đã xóa ID ${id}.` }
    } catch (_e) {
        return { message: "Error: Lỗi khi xóa ID." }
    }
}

// ==========================================
// SYSTEM MANAGEMENT ACTIONS
// ==========================================

export interface SystemTreeInfo {
    onSystem: number
    nameSystem: string
}

export async function createSystemRootAction(systemId: number, userId: number) {
    try {
        await checkAdmin()
        // Check if root already exists for this system
        const existingRoot = await prisma.system.findFirst({
            where: { onSystem: systemId, refSysId: 0 }
        })
        if (existingRoot) return { success: false, error: "Hệ thống đã có Root" }

        // Create new root record in system table
        const newSystemRoot = await prisma.system.create({
            data: { onSystem: systemId, userId, refSysId: 0 }
        })

        // Add root node to system_closure (self-relation at depth 0)
        await prisma.systemClosure.create({
            data: {
                systemId,
                ancestorId: newSystemRoot.autoId,
                descendantId: newSystemRoot.autoId,
                depth: 0
            }
        })

        revalidatePath("/tools/genealogy")
        return { success: true }
    } catch (e: any) {
        console.error("[createSystemRootAction] Error:", e)
        return { success: false, error: e.message || 'Lỗi khi tạo root' }
    }
}

// ==========================================
// COURSE MANAGEMENT ACTIONS
// ==========================================

export async function updateCourseAction(courseId: number, data: {
    name_lop?: string,
    name_khoa?: string | null,
    phi_coc?: number,
    id_khoa?: string,
    noidung_email?: string | null,
    categoryId?: number | null,
    category?: string,
    type?: any,
    status?: boolean,
    pin?: number,
    date_join?: string | null,
    mo_ta_ngan?: string | null,
    mo_ta_dai?: string | null,
    link_anh_bia?: string | null,
    noidung_stk?: string | null,
    link_zalo?: string | null,
    file_email?: string | null,
    teacherId?: number | null,
    teacherBankAccountId?: number | null,
    acceptedVoucherIds?: number[],
    awardVoucherIds?: number[],
    feeType?: string,
    voucherConfig?: string,
    allowMbvDeduction?: boolean,
    requiresReferralActivation?: boolean,
    referralActivationThreshold?: number
}) {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: "Unauthorized" }

    const isAdmin = session.user.role === Role.ADMIN
    const userId = parseInt(session.user.id)

    try {
        // ✅ Check course tồn tại + quyền sửa (TEACHER chỉ sửa course của mình)
        const course = await prisma.course.findUnique({
            where: { id: courseId },
            select: { teacherId: true, pin: true }
        })

        if (!course) return { success: false, error: "Không tìm thấy khóa học" }

        // ✅ Quyền sửa: ADMIN hoặc chính TEACHER sở hữu khóa học
        const isTeacherOwner = session.user.role === Role.TEACHER && course.teacherId === userId
        if (!isAdmin && !isTeacherOwner) {
            return { success: false, error: "Bạn không có quyền sửa khóa học này" }
        }

        // ✅ Auto-resolve category name from categoryId
        if (data.categoryId !== undefined) {
            if (data.categoryId) {
                const cat = await prisma.courseCategory.findUnique({ where: { id: data.categoryId } })
                if (cat) data.category = cat.name
            } else {
                data.category = 'Khác'
            }
        }

        // ✅ Only allow a maximum of 3 pinned courses across the catalog
        const isCurrentlyPinned = course.pin != null && course.pin > 0
        if (data.pin !== undefined && data.pin > 0 && !isCurrentlyPinned) {
            const pinnedCount = await prisma.course.count({
                where: {
                    pin: { gt: 0 },
                    id: { not: courseId }
                }
            })
            if (pinnedCount >= 3) {
                return {
                    success: false,
                    error: 'Chỉ được ghim tối đa 3 khóa học. Vui lòng bỏ ghim một khóa trước khi ghim khóa khác.'
                }
            }
        }

        // Build Prisma-safe data: only scalar columns, no FK fields
        const courseData: Record<string, any> = {
            id_khoa: data.id_khoa,
            name_lop: data.name_lop ? toTitleCase(data.name_lop) : data.name_lop,
            name_khoa: data.name_khoa ? toTitleCase(data.name_khoa) : null,
            date_join: data.date_join ?? null,
            status: data.status,
            mo_ta_ngan: data.mo_ta_ngan ?? null,
            mo_ta_dai: data.mo_ta_dai ?? null,
            link_anh_bia: data.link_anh_bia ?? null,
            link_zalo: data.link_zalo ?? null,
            phi_coc: data.phi_coc,
            feeType: data.feeType,
            voucherConfig: data.voucherConfig,
            allowMbvDeduction: data.allowMbvDeduction,
            requiresReferralActivation: data.requiresReferralActivation,
            referralActivationThreshold: data.referralActivationThreshold,
            noidung_stk: data.noidung_stk ?? null,
            file_email: data.file_email ?? null,
            noidung_email: data.noidung_email ?? null,
            type: data.type,
            pin: data.pin,
            category: data.category ?? 'Khác',
        }

        // FK fields → relation syntax (Prisma update() rejects scalar FKs)
        const categoryId = data.categoryId ?? null
        const teacherIdVal = data.teacherId ?? null
        const bankAccountId = data.teacherBankAccountId ?? null

        courseData.courseCategory = categoryId
            ? { connect: { id: categoryId } }
            : { disconnect: true }
        courseData.teacher = teacherIdVal
            ? { connect: { id: teacherIdVal } }
            : { disconnect: true }
        courseData.teacherBankAccount = bankAccountId
            ? { connect: { id: bankAccountId } }
            : { disconnect: true }

        const updatedCourse = await prisma.course.update({
            where: { id: courseId },
            data: courseData
        })

        // Update accepted vouchers
        if (data.acceptedVoucherIds !== undefined) {
            await prisma.courseAcceptedVoucher.deleteMany({ where: { courseId } })
            if (data.acceptedVoucherIds.length > 0) {
                await prisma.courseAcceptedVoucher.createMany({
                    data: data.acceptedVoucherIds.map(voucherId => ({ courseId, voucherId }))
                })
            }
        }

        // Update award vouchers
        if (data.awardVoucherIds !== undefined) {
            await prisma.courseVoucherAward.deleteMany({ where: { courseId } })
            if (data.awardVoucherIds.length > 0) {
                await prisma.courseVoucherAward.createMany({
                    data: data.awardVoucherIds.map(voucherId => ({ courseId, voucherId }))
                })
            }
        }

        revalidatePath('/tools/courses')
        revalidatePath('/') // Revalidate trang chủ nếu có đổi tên/giá
        return { success: true, course: updatedCourse }
    } catch (error: any) {
        console.error("Update Course Error:", error)
        return { success: false, error: error.message }
    }
}

export async function updateLessonAction(lessonId: string, data: {
    title?: string,
    content?: string | null,
    videoUrl?: string | null,
    order?: number,
    type?: any,
    isDailyChallenge?: boolean
}) {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: "Unauthorized" }

    const isAdmin = session.user.role === Role.ADMIN
    const userId = parseInt(session.user.id)

    try {
        const lesson = await prisma.lesson.findUnique({
            where: { id: lessonId },
            include: { course: { select: { teacherId: true, id_khoa: true } } }
        })

        if (!lesson) return { success: false, error: "Không tìm thấy bài học" }

        // ✅ TEACHER chỉ được sửa bài học của khóa học mình dạy
        if (!isAdmin && lesson.course.teacherId !== userId) {
            return { success: false, error: "Bạn không có quyền sửa bài học này" }
        }

        const updatedLesson = await prisma.lesson.update({
            where: { id: lessonId },
            data
        })

        await prisma.course.update({
            where: { id: lesson.courseId },
            data: { updatedAt: new Date() }
        })

        if (lesson.course.id_khoa) {
            revalidatePath(`/courses/${lesson.course.id_khoa}/learn`)
        }
        revalidatePath('/')
        return { success: true, lesson: updatedLesson }
    } catch (error: any) {
        console.error("Update Lesson Error:", error)
        return { success: false, error: error.message }
    }
}

export async function deleteLessonAction(lessonId: string) {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: "Unauthorized" }

    const isAdmin = session.user.role === Role.ADMIN
    const userId = parseInt(session.user.id)

    try {
        const lesson = await prisma.lesson.findUnique({
            where: { id: lessonId },
            include: { course: { select: { teacherId: true, id_khoa: true } } }
        })

        if (!lesson) return { success: false, error: "Không tìm thấy bài học" }

        // ✅ TEACHER chỉ được xóa bài học của khóa học mình dạy
        if (!isAdmin && lesson.course.teacherId !== userId) {
            return { success: false, error: "Bạn không có quyền xóa bài học này" }
        }

        await prisma.lesson.delete({
            where: { id: lessonId }
        })

        await prisma.course.update({
            where: { id: lesson.courseId },
            data: { updatedAt: new Date() }
        })

        if (lesson.course.id_khoa) {
            revalidatePath(`/courses/${lesson.course.id_khoa}/learn`)
        }
        revalidatePath('/')
        return { success: true }
    } catch (error: any) {
        console.error("Delete Lesson Error:", error)
        return { success: false, error: error.message }
    }
}

export async function getStudentDetailAction(studentId: number) {
    try {
        const session = await auth()
        if (!session?.user?.id) throw new Error("Unauthorized")

        const userId = parseInt(session.user.id)
        const isAdmin = session.user.role === Role.ADMIN
        const isTeacher = session.user.role === Role.TEACHER
        if (!isAdmin && !isTeacher) throw new Error("Unauthorized")

        const user = await prisma.user.findUnique({
            where: { id: studentId },
            select: {
                id: true, name: true, email: true, phone: true,
                image: true, role: true, createdAt: true,
                emailVerified: true,
                enrollments: {
                    include: {
                        course: { select: { name_lop: true, teacherId: true } },
                        _count: { select: { lessonProgress: { where: { status: 'COMPLETED' } } } }
                    }
                }
            }
        })
        if (!user) return { success: false, error: "Không tìm thấy thành viên" }

        if (isTeacher) {
            const hasAccess = user.enrollments.some(e => e.course.teacherId === userId)
            if (!hasAccess) throw new Error("Forbidden")
        }

        return { success: true, user }
    } catch (error: any) { return { success: false, error: error.message } }
}

export async function getStudentEmailLogsAction(studentId: number) {
    try {
        const session = await auth()
        if (!session?.user?.id) throw new Error("Unauthorized")
        const isAdmin = session.user.role === Role.ADMIN
        const isTeacher = session.user.role === Role.TEACHER
        if (!isAdmin && !isTeacher) throw new Error("Unauthorized")

        const logs = await prisma.emailLog.findMany({
            where: { userId: studentId },
            orderBy: { createdAt: 'desc' },
            take: 50,
        })

        return { success: true, logs }
    } catch (error: any) { return { success: false, error: error.message } }
}

export async function resendVerificationAction(studentId: number) {
    try {
        const session = await auth()
        if (!session?.user?.id) return { success: false, error: "Chưa đăng nhập" }
        if (session.user.role !== Role.ADMIN && session.user.role !== Role.TEACHER) {
            return { success: false, error: "Không có quyền" }
        }

        const user = await prisma.user.findUnique({
            where: { id: studentId },
            select: { id: true, name: true, email: true, emailVerified: true },
        })
        if (!user) return { success: false, error: "Không tìm thấy thành viên" }
        if (!user.email) return { success: false, error: "Thành viên không có email" }
        if (user.emailVerified) return { success: false, error: "Email đã được xác minh" }

        // Xóa token cũ
        await prisma.verificationToken.deleteMany({
            where: { identifier: user.email },
        })

        // Tạo OTP mới (24h)
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString()
        await prisma.verificationToken.create({
            data: {
                identifier: user.email,
                token: otpCode,
                expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
            },
        })

        // Gửi email
        const { sendVerificationEmail } = await import('@/lib/notifications')
        const result = await sendVerificationEmail(user.email, user.name || 'Thành viên', otpCode, studentId)

        if (!result.success) {
            return { success: false, error: `Gửi email thất bại: ${result.message}` }
        }

        return {
            success: true,
            message: `Đã gửi mã OTP mới đến ${user.email}`,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleString('vi-VN'),
        }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function resendAllVerificationAction() {
    try {
        const session = await auth()
        if (session?.user?.role !== Role.ADMIN) {
            return { success: false, error: "Chỉ Admin mới có quyền này" }
        }

        const unverifiedUsers = await prisma.user.findMany({
            where: { emailVerified: null },
            select: { id: true, name: true, email: true },
        })

        if (unverifiedUsers.length === 0) {
            return { success: false, error: "Không có thành viên nào chưa xác minh email" }
        }

        let sent = 0
        let failed = 0
        const errors: string[] = []

        for (const user of unverifiedUsers) {
            try {
                await prisma.verificationToken.deleteMany({
                    where: { identifier: user.email! },
                })

                const otpCode = Math.floor(100000 + Math.random() * 900000).toString()
                await prisma.verificationToken.create({
                    data: {
                        identifier: user.email!,
                        token: otpCode,
                        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
                    },
                })

                const { sendVerificationEmail } = await import('@/lib/notifications')
                const result = await sendVerificationEmail(user.email!, user.name || 'Thành viên', otpCode, user.id)

                if (result.success) {
                    sent++
                } else {
                    failed++
                    errors.push(`${user.email}: ${result.message}`)
                }
            } catch (err: any) {
                failed++
                errors.push(`${user.email}: ${err.message}`)
            }
        }

        return {
            success: true,
            total: unverifiedUsers.length,
            sent,
            failed,
            errors: errors.slice(0, 10),
        }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

// ==========================================
// BULK USER DELETION (MOVED FROM TCA-SYNC)
// ==========================================

export type UserDeleteCondition = {
    type: 'gte' | 'between' | 'in'
    value?: number
    valueA?: number
    valueB?: number
    values?: number[]
}

async function buildUserDeleteWhere(condition: UserDeleteCondition): Promise<Prisma.UserWhereInput> {
    const where: Prisma.UserWhereInput = {}
    if (condition.type === 'gte') {
        where.id = { gte: condition.value || 0 }
    } else if (condition.type === 'between') {
        where.id = { gte: condition.valueA || 0, lte: condition.valueB || 999999 }
    } else if (condition.type === 'in') {
        where.id = { in: condition.values || [] }
    }
    return where
}

export async function previewDeleteUsersAction(condition: UserDeleteCondition) {
    try {
        await checkAdmin()
        const userWhere = await buildUserDeleteWhere(condition)

        const users = await prisma.user.findMany({ where: userWhere, select: { id: true, name: true, email: true, phone: true } })
        if (users.length === 0) return { success: false, error: "Không tìm thấy user nào thỏa mãn điều kiện" }

        const ids = users.map(u => u.id)

        // Count related records
        const [
            userClosures,
            systems,
            tcaMembers,
            registrationPoints,
            brkWalletCount,
            brkTransactionCount,
            affiliateWalletCount,
            affiliateTransactionCount,
            affiliateCommissionCount,
            affiliatePayoutCount,
            affiliateLinkCount,
            affiliateRefCount,
            enrollmentCount,
            paymentCount,
            lessonProgressCount,
            lessonCommentCount,
            userRoadmapCount,
            siteProfileMemberCount,
            siteProfileCount,
            userBankAccountCount,
            accountCount,
            sessionCount,
            emailLogCount
        ] = await Promise.all([
            prisma.userClosure.count({ where: { descendantId: { in: ids } } }),
            prisma.system.findMany({ where: { userId: { in: ids } }, select: { autoId: true } }),
            prisma.tCAMember.count({ where: { OR: [{ userId: { in: ids } }, { tcaId: { in: ids } }] } }),
            prisma.registrationPoint.count({ where: { refereeId: { in: ids } } }),
            prisma.brkWallet.count({ where: { userId: { in: ids } } }),
            prisma.brkTransaction.count({ where: { wallet: { userId: { in: ids } } } }),
            prisma.affiliateWallet.count({ where: { userId: { in: ids } } }),
            prisma.affiliateTransaction.count({ where: { wallet: { userId: { in: ids } } } }),
            prisma.affiliateCommission.count({ where: { affiliateId: { in: ids } } }),
            prisma.affiliatePayout.count({ where: { userId: { in: ids } } }),
            prisma.affiliateLink.count({ where: { userId: { in: ids } } }),
            prisma.affiliateRef.count({ where: { userId: { in: ids } } }),
            prisma.enrollment.count({ where: { OR: [{ userId: { in: ids } }, { referrerId: { in: ids } }] } }),
            prisma.payment.count({ where: { enrollment: { OR: [{ userId: { in: ids } }, { referrerId: { in: ids } }] } } }),
            prisma.lessonProgress.count({ where: { enrollment: { OR: [{ userId: { in: ids } }, { referrerId: { in: ids } }] } } }),
            prisma.lessonComment.count({ where: { userId: { in: ids } } }),
            prisma.userRoadmap.count({ where: { userId: { in: ids } } }),
            prisma.siteProfileMember.count({ where: { userId: { in: ids } } }),
            prisma.siteProfile.count({ where: { userId: { in: ids } } }),
            prisma.userBankAccount.count({ where: { userId: { in: ids } } }),
            prisma.account.count({ where: { userId: { in: ids } } }),
            prisma.session.count({ where: { userId: { in: ids } } }),
            prisma.emailLog.count({ where: { userId: { in: ids } } }),
        ])

        const systemIds = systems.map(s => s.autoId)
        const systemClosures = await prisma.systemClosure.count({
            where: { OR: [{ descendantId: { in: systemIds } }, { ancestorId: { in: systemIds } }] }
        })

        const stats = {
            users: users.length,
            userClosures,
            systems: systems.length,
            systemClosures,
            tcaMembers,
            registrationPoints,
            total: users.length + userClosures + systems.length + systemClosures + tcaMembers + registrationPoints
        }

        return { success: true, stats, usersPreview: users.slice(0, 50), hasMore: users.length > 50 }
    } catch (error: any) { return { success: false, error: error.message } }
}

export async function bulkDeleteUsersAction(condition: UserDeleteCondition) {
    try {
        await checkAdmin()
        const userWhere = await buildUserDeleteWhere(condition)

        const users = await prisma.user.findMany({ where: userWhere, select: { id: true } })
        if (users.length === 0) return { success: false, error: "Không tìm thấy user" }

        const ids = users.map(u => u.id)
        const systems = await prisma.system.findMany({ where: { userId: { in: ids } }, select: { autoId: true } })
        const systemIds = systems.map(s => s.autoId)

        const result = { users: 0, systems: 0, tcaMembers: 0, registrationPoints: 0, systemClosures: 0, userClosures: 0 }

        await prisma.$transaction(async (tx) => {
            // A. Dọn dẹp ví BRK & các giao dịch ví BRK
            const brkWallets = await tx.brkWallet.findMany({
                where: { userId: { in: ids } },
                select: { id: true }
            })
            const brkWalletIds = brkWallets.map(w => w.id)
            if (brkWalletIds.length > 0) {
                await tx.brkTransaction.deleteMany({ where: { walletId: { in: brkWalletIds } } })
            }
            await tx.brkWallet.deleteMany({ where: { userId: { in: ids } } })

            // B. Dọn dẹp ví Affiliate & các giao dịch ví Affiliate
            const affWallets = await tx.affiliateWallet.findMany({
                where: { userId: { in: ids } },
                select: { id: true }
            })
            const affWalletIds = affWallets.map(w => w.id)
            if (affWalletIds.length > 0) {
                await tx.affiliateTransaction.deleteMany({ where: { walletId: { in: affWalletIds } } })
            }
            await tx.affiliateWallet.deleteMany({ where: { userId: { in: ids } } })

            // C. Dọn dẹp hoa hồng, thanh toán, link, ref của Affiliate
            await tx.affiliateCommission.deleteMany({ where: { affiliateId: { in: ids } } })
            await tx.affiliatePayout.deleteMany({ where: { userId: { in: ids } } })
            await tx.affiliateLink.deleteMany({ where: { userId: { in: ids } } })
            await tx.affiliateRef.deleteMany({ where: { userId: { in: ids } } })

            // D. Dọn dẹp đăng ký học khóa học (tự động cascade xóa Payments & LessonProgress)
            await tx.enrollment.deleteMany({ where: { OR: [{ userId: { in: ids } }, { referrerId: { in: ids } }] } })

            // E. Dọn dẹp các mối quan hệ bổ sung
            await tx.lessonComment.deleteMany({ where: { userId: { in: ids } } })
            await tx.userRoadmap.deleteMany({ where: { userId: { in: ids } } })
            await tx.siteProfileMember.deleteMany({ where: { userId: { in: ids } } })
            await tx.siteProfile.deleteMany({ where: { userId: { in: ids } } })
            await tx.userBankAccount.deleteMany({ where: { userId: { in: ids } } })
            await tx.account.deleteMany({ where: { userId: { in: ids } } })
            await tx.session.deleteMany({ where: { userId: { in: ids } } })
            await tx.emailLog.deleteMany({ where: { userId: { in: ids } } })

            // 1. User Closures
            const uc = await tx.userClosure.deleteMany({ where: { descendantId: { in: ids } } })
            result.userClosures = uc.count

            // 2. System Closures
            const sc = await tx.systemClosure.deleteMany({
                where: { OR: [{ descendantId: { in: systemIds } }, { ancestorId: { in: systemIds } }] }
            })
            result.systemClosures = sc.count

            // 3. TCA Members
            const tc = await tx.tCAMember.deleteMany({
                where: { OR: [{ userId: { in: ids } }, { tcaId: { in: ids } }] }
            })
            result.tcaMembers = tc.count

            // 4. Systems
            const sy = await tx.system.deleteMany({ where: { userId: { in: ids } } })
            result.systems = sy.count

            // 5. Registration Points
            const rp = await tx.registrationPoint.deleteMany({ where: { refereeId: { in: ids } } })
            result.registrationPoints = rp.count

            // 6. Users (Safety check: do not delete system accounts < 100)
            const safeIds = ids.filter(id => id > 100)
            if (safeIds.length > 0) {
                const u = await tx.user.deleteMany({ where: { id: { in: safeIds } } })
                result.users = u.count
            }
        })

        revalidatePath('/tools/students')
        return { success: true, result, message: `Đã xóa: ${result.users} users, ${result.systems} systems, ${result.tcaMembers} TCA, ${result.userClosures} closures.` }
    } catch (error: any) { return { success: false, error: error.message } }
}

export async function getSystemPromotionLogicAction(systemId: number) {
    try {
        if (systemId !== 4) return { success: true, logic: 'A' }
        const config = await prisma.systemConfig.findUnique({ where: { key: 'brk_promotion_logic' } })
        return { success: true, logic: config?.value || 'A' }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function switchSystemPromotionLogicAction(systemId: number, method: 'A' | 'B') {
    try {
        await checkAdmin()
        if (systemId !== 4) {
            throw new Error("Hệ thống này hiện không hỗ trợ thay đổi phương án thăng tiến.")
        }
        await rebuildSystem4Data(method)
        revalidatePath('/tools/genealogy')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

async function getPathFromAncestorToDescendant(ancestorId: number, descendantId: number, systemId: number) {
    const path: { userId: number; name: string }[] = [];
    let currentId = descendantId;
    let depth = 0;

    while (currentId !== ancestorId && depth < 20) {
        const node = await prisma.system.findUnique({
            where: { userId_onSystem: { userId: currentId, onSystem: systemId } },
            select: { refSysId: true }
        });
        if (!node || node.refSysId === 0 || node.refSysId === ancestorId) break;

        const parentUser = await prisma.user.findUnique({
            where: { id: node.refSysId },
            select: { name: true }
        });

        path.push({
            userId: node.refSysId,
            name: parentUser?.name || 'Unknown'
        });
        currentId = node.refSysId;
        depth++;
    }
    return path.reverse();
}

export async function getMemberPromotionHistoryAction(userId: number, systemId: number) {
    try {
        const session = await auth(); if (!session?.user?.id) throw new Error("Unauthorized")
        // Parallel queries: Load timeline records & level configs concurrently
        const [records, levelConfigsRaw] = await Promise.all([
            prisma.brkTimelineRecord.findMany({
                where: { userId, onSystem: systemId },
                orderBy: { time: 'asc' },
                take: 100
            }),
            prisma.brkLevelConfig.findMany({
                where: { systemId },
                orderBy: { level: 'asc' },
                select: { level: true, personalFeePct: true, giftValue: true }
            })
        ])

        const events = records.map(r => ({
            id: r.id,
            type: r.type,
            time: r.time,
            title: r.title,
            description: r.description,
            accumulatedCash: Number(r.accumulatedCash),
            accumulatedBrkd: Number(r.accumulatedBrkd),
            accumulatedBrkp: Number(r.accumulatedBrkp),
            accumulatedTeamSize: r.accumulatedTeamSize,
            accumulatedBrkdVolume: Number(r.accumulatedBrkdVolume),
            accumulatedCashVolume: Number(r.accumulatedCashVolume),
            details: {
                amountCash: Number(r.amountCash),
                amountBrkd: Number(r.amountBrkd),
                amountVoucher: Number(r.amountVoucher),
                txType: r.txType,
                targetMemberId: r.targetMemberId,
                targetMemberName: r.targetMemberName,
                pathStr: r.pathStr,
                fromLevel: r.fromLevel,
                toLevel: r.toLevel,
                applicationId: r.applicationId,
                eventStatus: r.eventStatus,
                eventMbp: Number(r.eventMbp),
                eventMbdtVolume: Number(r.eventMbdtVolume),
                eventCashVolume: Number(r.eventCashVolume)
            }
        }))

        const levelConfigs = levelConfigsRaw.map(c => ({
            level: c.level,
            pct: `${Number(c.personalFeePct)}%`,
            gift: c.giftValue
        }))

        return { success: true, history: events, levelConfigs }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTIVITY LOG — Root admin only
// ═══════════════════════════════════════════════════════════════════════════════

export async function getStudentActivityLogAction(
    studentId: number,
    options?: { limit?: number; offset?: number; actions?: string[] }
) {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: "Chưa đăng nhập", logs: [], total: 0 }

    const userId = parseInt(session.user.id)
    if (userId !== 0) return { success: false, error: "Chỉ root admin mới có quyền xem", logs: [], total: 0 }

    const limit = options?.limit || 50
    const offset = options?.offset || 0

    const where: any = { userId: studentId }
    if (options?.actions && options.actions.length > 0) {
        where.action = { in: options.actions }
    }

    const [logs, total] = await Promise.all([
        prisma.activityLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
        }),
        prisma.activityLog.count({ where })
    ])

    return { success: true, logs, total }
}

export async function getSystemConnectionPathAction(ancestorId: number, descendantId: number, systemId: number) {
    try {
        const path: { userId: number; name: string; level: number }[] = []
        let currentUserId = descendantId
        let limit = 30
        
        while (currentUserId && limit > 0) {
            const sysRec = await prisma.system.findUnique({
                where: { userId_onSystem: { userId: currentUserId, onSystem: systemId } },
                include: { user: { select: { name: true } } }
            })
            if (!sysRec) break

            path.unshift({
                userId: currentUserId,
                name: sysRec.user?.name || 'N/A',
                level: sysRec.level
            })

            if (currentUserId === ancestorId) {
                break
            }

            // Nếu đến gốc refSysId = 0 hoặc refSysId = chính nó thì dừng
            if (sysRec.refSysId === 0 || sysRec.refSysId === currentUserId) {
                break
            }

            currentUserId = sysRec.refSysId
            limit--
        }

        return { success: true, path }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function getSharingSponsorTreeAction(userId: number) {
    try {
        const session = await auth(); if (!session?.user?.id) throw new Error("Unauthorized")
        
        // Lấy tất cả enrollment của khóa học #22 để dựng cây chia sẻ
        const enrollments = await prisma.enrollment.findMany({
            where: { courseId: 22 },
            include: {
                user: {
                    select: { id: true, name: true, image: true }
                }
            }
        })

        // Ánh xạ userId -> Tên & hình ảnh
        const userMap = new Map<number, { name: string; image: string | null }>()
        enrollments.forEach(e => {
            userMap.set(e.userId, { name: e.user.name || 'N/A', image: e.user.image })
        })

        // Dựng bản đồ quan hệ: referrerId -> danh sách userId được giới thiệu
        const parentToChildren = new Map<number, number[]>()
        enrollments.forEach(e => {
            if (e.referrerId) {
                if (!parentToChildren.has(e.referrerId)) {
                    parentToChildren.set(e.referrerId, [])
                }
                parentToChildren.get(e.referrerId)!.push(e.userId)
            }
        })

        // Dựng danh sách phẳng có thụt lề (flat tree with indent) để hiển thị trong panel
        interface FlatSharingNode {
            userId: number
            name: string
            image: string | null
            depth: number
        }

        const flatTree: FlatSharingNode[] = []

        function traverse(uId: number, depth: number) {
            const kids = parentToChildren.get(uId) || []
            kids.forEach(kidId => {
                const info = userMap.get(kidId) || { name: `Thành viên #${kidId}`, image: null }
                flatTree.push({
                    userId: kidId,
                    name: info.name,
                    image: info.image,
                    depth
                })
                traverse(kidId, depth + 1)
            })
        }

        traverse(userId, 1)

        return {
            success: true,
            totalDescendants: flatTree.length,
            flatTree
        }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

