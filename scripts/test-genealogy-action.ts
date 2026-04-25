'use server'

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function getGenealogyTreeAction(rootId: number = 0) {
  const systemId = 1
  const isSystem = true
  
  // Exact code from admin-actions.ts getSystemGenealogy function
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
    f1Data = users.map((u: { id: number; name: string | null }) => ({ ...u, autoId: u.id, user: u }))
  }

  if (f1Data.length === 0) {
    return { id: rootUser.id, name: rootUser.name, children: [] }
  }

  const f1AutoIds = f1Data.map(f => f.autoId)

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
      include: { descendant: isSystem ? { include: { user: { select: { id: true, name: true } } } } } : { select: { id: true, name: true } } }
    }),
    (closureModel as any).count({
      where: { ...whereBase, ancestorId: rootAutoId }
    })
  ])

  const closureByAncestor = new Map<number, any[]>()
  const allUserIds = new Set<number>([rootUser.id])
  for (const c of allClosures) {
    const desc = isSystem ? c.descendant.user : c.descendant
    if (desc?.id) allUserIds.add(desc.id)
  }

  const tcaMembers = isSystem
    ? await (prisma as any).tCAMember.findMany({
        where: { 
          OR: [
            { userId: { in: [...allUserIds] } },
            { tcaId: { in: [...allUserIds] } }
          ]
        },
        select: { userId: true, tcaId: true, level: true, personalScore: true, totalScore: true }
      })
    : []

  const tcaMemberMap = new Map<number, any>()
  for (const m of tcaMembers) {
    const newPersonalScore = m.personalScore != null ? Number(m.personalScore) : null
    const newTotalScore = m.totalScore != null ? Number(m.totalScore) : null
    
    const existing = tcaMemberMap.get(m.userId)
    if (!existing || (newPersonalScore && newPersonalScore > (existing.personalScore ?? 0))) {
      tcaMemberMap.set(m.userId, {
        level: m.level ?? null,
        personalScore: newPersonalScore,
        totalScore: newTotalScore
      })
    }
    
    if (m.tcaId && m.tcaId !== m.userId) {
      const existingTcaId = tcaMemberMap.get(m.tcaId)
      if (!existingTcaId || (newPersonalScore && newPersonalScore > (existingTcaId.personalScore ?? 0))) {
        tcaMemberMap.set(m.tcaId, {
          level: m.level ?? null,
          personalScore: newPersonalScore,
          totalScore: newTotalScore
        })
      }
    }
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

  // For each F1 build children (Group C with full subtree)
  const children: any[] = []
  for (const f1 of f1Data) {
    const f1Closures = closureByAncestor.get(f1.autoId) || []
    const f2s = f1Closures.filter(c => c.depth === 1)
    
    const f2Subtrees = f2s.map(f2 => {
      const grandchildren = closureByAncestor.get(f2.autoId) || []
      const f2tca = tcaMemberMap.get(f2.userId) ?? tcaMemberMap.get(f2.autoId)
      return {
        id: f2.userId,
        name: f2.name,
        level: f2tca?.level ?? null,
        personalScore: f2tca?.personalScore ?? null,
        totalScore: f2tca?.totalScore ?? null,
        children: grandchildren.map((gc: any) => {
          const gctca = tcaMemberMap.get(gc.userId) ?? tcaMemberMap.get(gc.autoId)
          return {
            id: gc.userId,
            name: gc.name,
            level: gctca?.level ?? null
          }
        })
      }
    })

    const f1tca = tcaMemberMap.get(f1.user.id) ?? tcaMemberMap.get(f1.autoId)
    
    children.push({
      id: f1.user.id,
      name: f1.user.name,
      level: f1tca?.level ?? null,
      personalScore: f1tca?.personalScore ?? null,
      totalScore: f1tca?.totalScore ?? null,
      children: f2Subtrees
    })
  }

  return {
    id: rootUser.id,
    name: rootUser.name,
    level: 2,
    children
  }
}

async function main() {
  console.log('=== TEST getGenealogyTreeAction(861) ===\n')
  
  const result = await getGenealogyTreeAction(861)
  
  console.log('Root:', result?.id, result?.name, 'level:', result?.level)
  console.log('Children:', result?.children?.length)
  
  // Find #327, #873, #885
  const ids = [327, 873, 885]
  for (const id of ids) {
    const child = result?.children?.find((c: any) => c.id === id)
    console.log(`\n#${id}: level=${child?.level}, name=${child?.name}`)
    if (child?.children) {
      child.children.forEach((c: any) => {
        console.log(`  F2: id=${c.id}, name=${c.name}, level=${c.level}`)
      })
    }
  }

  await prisma.$disconnect()
}

main().catch(console.error)