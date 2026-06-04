import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface TCANode {
  id: number
  type: string
  name: string
  parentFolderId?: number | string
  personalScore?: string
  totalScore?: string
  level?: string
  groupName?: string
  location?: string
  personalRate?: string
  teamRate?: string
  hasBH?: boolean
  hasTD?: boolean
}

interface MemberInfo {
  phone?: string
  email?: string
  address?: string
  joinDate?: string
  contractDate?: string
  promotionDate?: string
}

export interface PreviewRow {
  id: number
  name: string
  type: string
  match: string
  db: {
    userId: number | null
    name: string | null
    email: string | null
    phone: string | null
    referrerId: number | null
  } | null
  userId: number | null
  email: string | null
  phone: string | null
  parentTcaId: number | null
  parentUserId: number | null
  referrerId: number | null
  refSysId: number | null
  action: string
  changes: string[]
  tcaScores: { personalScore: number | null; totalScore: number | null; level: number | null } | null
  dbScores: { personalScore: number | null; totalScore: number | null; level: number | null } | null
  hasScoreChange: boolean
  dbRefSysId: number | null
  hasRefSysIdChange: boolean
  groupName?: string | null
  location?: string | null
  personalRate?: string | null
  teamRate?: string | null
  hasBH?: boolean
  hasTD?: boolean
  hasNewFieldsChange: boolean
  dbNewFields?: { groupName: string | null; location: string | null; personalRate: string | null; teamRate: string | null; hasBH: boolean; hasTD: boolean; address: string | null; joinDate: string | null; contractDate: string | null; promotionDate: string | null } | null
  tcaNewFields?: { groupName: string | null; location: string | null; personalRate: string | null; teamRate: string | null; hasBH: boolean; hasTD: boolean; address: string | null; joinDate: string | null; contractDate: string | null; promotionDate: string | null } | null
  address?: string | null
  joinDate?: string | null
  contractDate?: string | null
  promotionDate?: string | null
}

export interface PreviewResult {
  total: number
  nextAvailableUserId: number
  nextAvailableSystemId: number
  rows: PreviewRow[]
}

const normalizePhone = (phone: string | null): string | null => {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('84') && digits.length === 11) {
    return '0' + digits.substring(2);
  }
  if (digits.startsWith('0')) {
    return digits;
  }
  return phone;
}

export async function generatePreview(allNodes: TCANode[], memberInfo: Record<number, MemberInfo>): Promise<PreviewResult> {
  // Batch load all data once
  const allUsers = await prisma.user.findMany()
  const phoneToUserMap = new Map<string, any>()
  const emailToUserMap = new Map<string, any>()
  for (const user of allUsers) {
    if (user.phone) {
      const normalized = normalizePhone(user.phone)
      if (normalized) phoneToUserMap.set(normalized, user)
    }
    if (user.email) {
      emailToUserMap.set(user.email.toLowerCase(), user)
    }
  }

  // Collect all TCA IDs (nodes + parents not in current batch)
  const allNodeIds = allNodes.map(n => n.id)
  const allParentIds: number[] = []
  for (const node of allNodes) {
    const pid = node.parentFolderId
    if (pid && pid !== 'root' && pid !== '0') {
      const numPid = Number(pid)
      if (!allNodeIds.includes(numPid)) allParentIds.push(numPid)
    }
  }
  const uniqueAllIds = [...new Set([...allNodeIds, ...allParentIds])]

  const allTCAMembers = await (prisma as any).tCAMember.findMany({
    where: { tcaId: { in: uniqueAllIds } }
  })
  const tcaIdToTCAMemberMap = new Map<number, any>()
  for (const tca of allTCAMembers) {
    tcaIdToTCAMemberMap.set(tca.tcaId, tca)
  }

  const allSystems = await prisma.system.findMany({ where: { onSystem: 1 } })
  const userIdToSystemMap = new Map<number, any>()
  for (const sys of allSystems) {
    userIdToSystemMap.set(sys.userId, sys)
  }

  // Next available IDs
  const { getNextAvailableId } = await import('@/lib/id-helper');
  const reserved = await prisma.reservedId.findMany({ select: { id: true } });
  const reservedIdSet = new Set(reserved.map((r: any) => r.id));

  let currentUserIdBase = await getNextAvailableId();
  const assignedUserIds = new Set<number>();

  function getNextUserIdInBatch() {
    while (reservedIdSet.has(currentUserIdBase) || assignedUserIds.has(currentUserIdBase)) {
      currentUserIdBase++;
    }
    const id = currentUserIdBase;
    assignedUserIds.add(id);
    currentUserIdBase++;
    return id;
  }

  let nextAvailableSystemId = 1;
  const maxSystem = await prisma.system.findFirst({
    orderBy: { autoId: 'desc' },
    select: { autoId: true }
  });
  if (maxSystem) {
    nextAvailableSystemId = maxSystem.autoId + 1;
  }

  const TCA_ROOT_USER_ID = 861;
  const rows: PreviewRow[] = []

  for (const node of allNodes) {
    const info = memberInfo?.[node.id] || {}
    const email = info.email || null
    const phone = info.phone || null
    const normalizedPhone = normalizePhone(phone)

    // User matching via Map (O(1))
    const phoneUser = normalizedPhone ? phoneToUserMap.get(normalizedPhone) : null
    const emailUser = email ? emailToUserMap.get(email.toLowerCase()) : null

    let existingUser: any = null
    let matchType: string | null = null

    if (phoneUser && emailUser && phoneUser.id === emailUser.id) {
      existingUser = phoneUser
      matchType = 'PE'
    } else if (phoneUser) {
      existingUser = phoneUser
      matchType = 'Pe'
    } else if (emailUser) {
      existingUser = emailUser
      matchType = 'pE'
    } else {
      matchType = 'N'
    }

    // System + TCAMember checks via Map
    let existingSystem: any = null
    let existingTCAMember: any = null

    if (existingUser) {
      existingSystem = userIdToSystemMap.get(existingUser.id) || null
      if (existingSystem) {
        matchType = matchType + ' S'
        existingTCAMember = tcaIdToTCAMemberMap.get(node.id) || null
        if (existingTCAMember) {
          matchType = matchType + ' TCA'
        }
      }
    }

    // Score comparison
    const parseScore = (raw?: string): number => {
      if (!raw || raw === '-') return 0
      return parseFloat(raw.replace(',', '.')) || 0
    }
    const tcaPersonalScore = parseScore(node.personalScore)
    const tcaTotalScore = parseScore(node.totalScore)
    const tcaLevel = node.level ? parseInt(node.level) : null

    const dbPersonalScore = existingTCAMember?.personalScore ? Number(existingTCAMember.personalScore) : null
    const dbTotalScore = existingTCAMember?.totalScore ? Number(existingTCAMember.totalScore) : null
    const dbLevel = existingTCAMember?.level || null

    const hasScoreChange = existingTCAMember && (
      tcaPersonalScore !== dbPersonalScore ||
      tcaTotalScore !== dbTotalScore ||
      tcaLevel !== dbLevel
    )

    // New fields comparison (tree data + member info)
    const tcaGroupName = node.groupName || null
    const tcaLocation = node.location || null
    const tcaPersonalRate = node.personalRate || null
    const tcaTeamRate = node.teamRate || null
    const tcaHasBH = node.hasBH || false
    const tcaHasTD = node.hasTD || false
    const tcaAddress = info.address || null
    const tcaJoinDate = info.joinDate || null
    const tcaContractDate = info.contractDate || null
    const tcaPromotionDate = info.promotionDate || null

    const dbGroupName = existingTCAMember?.groupName || null
    const dbLocation = existingTCAMember?.location || null
    const dbPersonalRate = existingTCAMember?.personalRate || null
    const dbTeamRate = existingTCAMember?.teamRate || null
    const dbHasBH = existingTCAMember?.hasBH || false
    const dbHasTD = existingTCAMember?.hasTD || false
    const dbAddress = existingTCAMember?.address || null
    const dbJoinDate = existingTCAMember?.joinDate || null
    const dbContractDate = existingTCAMember?.contractDate || null
    const dbPromotionDate = existingTCAMember?.promotionDate || null

    const groupNameChanged = existingTCAMember && tcaGroupName !== dbGroupName
    const locationChanged = existingTCAMember && tcaLocation !== dbLocation
    const personalRateChanged = existingTCAMember && tcaPersonalRate !== dbPersonalRate
    const teamRateChanged = existingTCAMember && tcaTeamRate !== dbTeamRate
    const hasBHChanged = existingTCAMember && tcaHasBH !== dbHasBH
    const hasTDChanged = existingTCAMember && tcaHasTD !== dbHasTD
    const addressChanged = existingTCAMember && tcaAddress !== dbAddress
    const joinDateChanged = existingTCAMember && tcaJoinDate !== dbJoinDate
    const contractDateChanged = existingTCAMember && tcaContractDate !== dbContractDate
    const promotionDateChanged = existingTCAMember && tcaPromotionDate !== dbPromotionDate

    const hasNewFieldsChange = existingTCAMember && (
      groupNameChanged || locationChanged || personalRateChanged ||
      teamRateChanged || hasBHChanged || hasTDChanged ||
      addressChanged || joinDateChanged || contractDateChanged || promotionDateChanged
    )

    const newFieldsChanges: string[] = []
    if (groupNameChanged) newFieldsChanges.push(`Group: "${dbGroupName || '-'}" -> "${tcaGroupName || '-'}"`)
    if (locationChanged) newFieldsChanges.push(`Location: "${dbLocation || '-'}" -> "${tcaLocation || '-'}"`)
    if (personalRateChanged) newFieldsChanges.push(`%CN: "${dbPersonalRate || '-'}" -> "${tcaPersonalRate || '-'}"`)
    if (teamRateChanged) newFieldsChanges.push(`%Đội: "${dbTeamRate || '-'}" -> "${tcaTeamRate || '-'}"`)
    if (hasBHChanged) newFieldsChanges.push(`BH: ${dbHasBH ? 'Có' : 'Không'} -> ${tcaHasBH ? 'Có' : 'Không'}`)
    if (hasTDChanged) newFieldsChanges.push(`TD: ${dbHasTD ? 'Có' : 'Không'} -> ${tcaHasTD ? 'Có' : 'Không'}`)
    if (addressChanged) newFieldsChanges.push(`Địa chỉ: "${dbAddress || '-'}" -> "${tcaAddress || '-'}"`)
    if (joinDateChanged) newFieldsChanges.push(`Ngày gia nhập: "${dbJoinDate || '-'}" -> "${tcaJoinDate || '-'}"`)
    if (contractDateChanged) newFieldsChanges.push(`Hợp đồng: "${dbContractDate || '-'}" -> "${tcaContractDate || '-'}"`)
    if (promotionDateChanged) newFieldsChanges.push(`Thăng hạng: "${dbPromotionDate || '-'}" -> "${tcaPromotionDate || '-'}"`)

    // Action determination
    let action = ''
    const changes: string[] = []
    let expectedUserId: number | null = null
    let expectedSystemId: number | null = null

    if (matchType === 'N') {
      action = 'PE S TCA'
      expectedUserId = getNextUserIdInBatch()
      expectedSystemId = nextAvailableSystemId++
    } else if (matchType === 'PE') {
      action = 'S TCA'
    } else if (matchType === 'Pe') {
      action = 'E S TCA'
      expectedSystemId = nextAvailableSystemId++
      if (email && existingUser?.email && existingUser.email !== email) {
        changes.push(`Email: "${existingUser.email}" -> "${email}"`)
      }
    } else if (matchType === 'pE') {
      action = 'P S TCA'
      expectedSystemId = nextAvailableSystemId++
      if (phone && existingUser?.phone && existingUser.phone !== phone) {
        changes.push(`Phone: "${existingUser.phone}" -> "${phone}"`)
      }
    } else if (matchType === 'PE S') {
      action = 'TCA'
    } else if (matchType === 'Pe S') {
      action = 'E TCA'
      if (email && existingUser?.email && existingUser.email !== email) {
        changes.push(`Email: "${existingUser.email}" -> "${email}"`)
      }
    } else if (matchType === 'pE S') {
      action = 'P TCA'
      if (phone && existingUser?.phone && existingUser.phone !== phone) {
        changes.push(`Phone: "${existingUser.phone}" -> "${phone}"`)
      }
    } else if (matchType === 'PE TCA') {
      action = 'S'
      expectedSystemId = nextAvailableSystemId++
    } else if (matchType === 'Pe TCA') {
      action = 'E S'
      expectedSystemId = nextAvailableSystemId++
      if (email && existingUser?.email && existingUser.email !== email) {
        changes.push(`Email: "${existingUser.email}" -> "${email}"`)
      }
    } else if (matchType === 'pE TCA') {
      action = 'P S'
      expectedSystemId = nextAvailableSystemId++
      if (phone && existingUser?.phone && existingUser.phone !== phone) {
        changes.push(`Phone: "${existingUser.phone}" -> "${phone}"`)
      }
    } else if (matchType === 'PE S TCA' || matchType === 'S TCA PE' || matchType === 'PE TCA S') {
      if (hasScoreChange || hasNewFieldsChange) {
        action = hasNewFieldsChange && !hasScoreChange ? 'TCA+' : 'TCA'
        if (dbPersonalScore !== tcaPersonalScore) changes.push(`Điểm CN: ${dbPersonalScore || 0} -> ${tcaPersonalScore}`)
        if (dbTotalScore !== tcaTotalScore) changes.push(`Điểm ĐỘI: ${dbTotalScore || 0} -> ${tcaTotalScore}`)
        if (dbLevel !== tcaLevel) changes.push(`Cấp: ${dbLevel || '-'} -> ${tcaLevel}`)
        changes.push(...newFieldsChanges)
      } else {
        action = 'SKIP'
        changes.push('Không có thay đổi')
      }
    } else if (matchType === 'Pe S TCA' || matchType === 'Pe TCA S' || matchType === 'S TCA Pe') {
      if (hasScoreChange || hasNewFieldsChange) {
        action = hasNewFieldsChange && !hasScoreChange ? 'E TCA+' : (hasScoreChange ? 'E TCA' : 'E')
        if (email && existingUser?.email && existingUser.email !== email) changes.push(`Email: "${existingUser.email}" -> "${email}"`)
        if (hasScoreChange) {
          if (dbPersonalScore !== tcaPersonalScore) changes.push(`Điểm CN: ${dbPersonalScore || 0} -> ${tcaPersonalScore}`)
          if (dbTotalScore !== tcaTotalScore) changes.push(`Điểm ĐỘI: ${dbTotalScore || 0} -> ${tcaTotalScore}`)
        }
        changes.push(...newFieldsChanges)
      } else {
        action = 'E'
      }
    } else if (matchType === 'pE S TCA' || matchType === 'pE TCA S' || matchType === 'S TCA pE') {
      if (hasScoreChange || hasNewFieldsChange) {
        action = hasNewFieldsChange && !hasScoreChange ? 'P TCA+' : (hasScoreChange ? 'P TCA' : 'P')
        if (phone && existingUser?.phone && existingUser.phone !== phone) changes.push(`Phone: "${existingUser.phone}" -> "${phone}"`)
        if (hasScoreChange) {
          if (dbPersonalScore !== tcaPersonalScore) changes.push(`Điểm CN: ${dbPersonalScore || 0} -> ${tcaPersonalScore}`)
          if (dbTotalScore !== tcaTotalScore) changes.push(`Điểm ĐỘI: ${dbTotalScore || 0} -> ${tcaTotalScore}`)
        }
        changes.push(...newFieldsChanges)
      } else {
        action = 'P'
      }
    } else if (matchType === 'S TCA') {
      if (hasScoreChange || hasNewFieldsChange) {
        action = hasNewFieldsChange && !hasScoreChange ? 'TCA+' : 'TCA'
        if (dbPersonalScore !== tcaPersonalScore) changes.push(`Điểm CN: ${dbPersonalScore || 0} -> ${tcaPersonalScore}`)
        if (dbTotalScore !== tcaTotalScore) changes.push(`Điểm ĐỘI: ${dbTotalScore || 0} -> ${tcaTotalScore}`)
        if (dbLevel !== tcaLevel) changes.push(`Cấp: ${dbLevel || '-'} -> ${tcaLevel}`)
      } else {
        action = 'SKIP'
        changes.push('Không có thay đổi')
      }
    } else {
      action = 'PE S TCA'
      expectedUserId = getNextUserIdInBatch()
      expectedSystemId = nextAvailableSystemId++
    }

    // Parent resolution
    const parentId = node.parentFolderId;
    const parentTcaId = (!parentId || parentId === 'root' || parentId === '0') ? null : Number(parentId);

    let parentUserId: number | null = null;
    let parentSystemId: number | null = null;

    if (parentTcaId) {
      const batchNode = allNodes.find(n => n.id === parentTcaId);
      if (batchNode) {
        const parentInfo = rows.find(r => r.id === parentTcaId);
        if (parentInfo) {
          parentUserId = parentInfo.db?.userId || parentInfo.userId;
          parentSystemId = parentUserId;
        }
      } else {
        const parentTCAMember = tcaIdToTCAMemberMap.get(parentTcaId);
        if (parentTCAMember?.userId) {
          parentUserId = parentTCAMember.userId;
          parentSystemId = parentUserId;
        } else {
          const parentFolderInfo = memberInfo?.[parentTcaId];
          if (parentFolderInfo) {
            const parentFolderPhone = normalizePhone(parentFolderInfo.phone || null);
            const parentFolderEmail = parentFolderInfo.email || null;
            if (parentFolderPhone) {
              const folderUser = phoneToUserMap.get(parentFolderPhone);
              if (folderUser) { parentUserId = folderUser.id; parentSystemId = folderUser.id; }
            }
            if (!parentUserId && parentFolderEmail) {
              const folderUser = emailToUserMap.get(parentFolderEmail.toLowerCase());
              if (folderUser) { parentUserId = folderUser.id; parentSystemId = folderUser.id; }
            }
          }
        }
      }
    } else {
      parentUserId = TCA_ROOT_USER_ID;
      parentSystemId = TCA_ROOT_USER_ID;
    }

    // refSysId comparison
    let hasRefSysIdChange = false;
    let dbRefSysId: number | null = null;
    if (existingSystem && parentSystemId !== null) {
      dbRefSysId = existingSystem.refSysId || null;
      if (dbRefSysId !== parentSystemId) {
        hasRefSysIdChange = true;
        changes.push(`refSysId: ${dbRefSysId || 0} -> ${parentSystemId}`);
      }
    }

    if (matchType && matchType.includes('S') && hasRefSysIdChange) {
      if (action === 'SKIP' || action === '') {
        action = 'S';
      } else if (!action.includes('S')) {
        action = action + ' S';
      }
    }

    const finalUserId = existingUser?.id || expectedUserId

    rows.push({
      id: node.id,
      name: node.name,
      type: node.type,
      match: matchType || 'N',
      db: existingUser ? {
        userId: existingUser.id,
        name: existingUser.name,
        email: existingUser.email,
        phone: existingUser.phone,
        referrerId: existingUser.referrerId
      } : null,
      dbRefSysId,
      hasRefSysIdChange,
      userId: finalUserId,
      email,
      phone,
      parentTcaId,
      parentUserId,
      referrerId: parentUserId,
      refSysId: parentUserId,
      action,
      changes,
      tcaScores: { personalScore: tcaPersonalScore, totalScore: tcaTotalScore, level: tcaLevel },
      dbScores: { personalScore: dbPersonalScore, totalScore: dbTotalScore, level: dbLevel },
      hasScoreChange: !!hasScoreChange,
      groupName: node.groupName || null,
      location: node.location || null,
      personalRate: node.personalRate || null,
      teamRate: node.teamRate || null,
      hasBH: node.hasBH || false,
      hasTD: node.hasTD || false,
      hasNewFieldsChange: !!hasNewFieldsChange,
      dbNewFields: existingTCAMember ? { groupName: dbGroupName, location: dbLocation, personalRate: dbPersonalRate, teamRate: dbTeamRate, hasBH: dbHasBH, hasTD: dbHasTD, address: dbAddress, joinDate: dbJoinDate, contractDate: dbContractDate, promotionDate: dbPromotionDate } : null,
      tcaNewFields: { groupName: tcaGroupName, location: tcaLocation, personalRate: tcaPersonalRate, teamRate: tcaTeamRate, hasBH: tcaHasBH, hasTD: tcaHasTD, address: tcaAddress, joinDate: tcaJoinDate, contractDate: tcaContractDate, promotionDate: tcaPromotionDate },
      address: info.address || null,
      joinDate: info.joinDate || null,
      contractDate: info.contractDate || null,
      promotionDate: info.promotionDate || null
    })
  }

  return {
    total: allNodes.length,
    nextAvailableUserId: currentUserIdBase,
    nextAvailableSystemId,
    rows
  }
}
