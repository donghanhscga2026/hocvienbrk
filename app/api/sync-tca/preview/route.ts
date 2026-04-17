import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS })
}

interface TCANode {
  id: number
  type: string
  name: string
  parentFolderId?: number | string
  personalScore?: string
  totalScore?: string
  level?: string
}

interface MemberInfo {
  phone?: string
  email?: string
  address?: string
  joinDate?: string
  contractDate?: string
  promotionDate?: string
}

interface PrecheckPayload {
  allNodes: TCANode[]
  memberInfo: Record<number, MemberInfo>
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

function calculateClosures(node: TCANode, parentMap: Map<number, TCANode>): number {
  const parentId = node.parentFolderId;
  if (!parentId || parentId === 'root' || parentId === '0') {
    return 1;
  }
  const parent = parentMap.get(Number(parentId));
  if (!parent) {
    return 1;
  }
  return 1 + calculateClosures(parent, parentMap);
}

export async function POST(request: Request) {
  try {
    const body: PrecheckPayload = await request.json()
    const { allNodes, memberInfo } = body

    console.log('[API/sync-tca/preview] Sync preview request')
    console.log('Total nodes:', allNodes?.length || 0)

    if (!allNodes || !Array.isArray(allNodes)) {
      return NextResponse.json(
        { error: 'Invalid payload: allNodes required' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    // Build parent map for closure calculation
    const parentMap = new Map<number, TCANode>();
    allNodes.forEach(n => {
      const pid = n.parentFolderId;
      if (pid && pid !== 'root' && pid !== '0') {
        parentMap.set(n.id, n);
      }
    });

    // Import getNextAvailableId
    const { getNextAvailableId } = await import('@/lib/id-helper');

    let nextAvailableUserId = await getNextAvailableId();
    let nextAvailableSystemId = 1;

    // Get current max system autoId
    const maxSystem = await prisma.system.findFirst({
      orderBy: { autoId: 'desc' },
      select: { autoId: true }
    });
    if (maxSystem) {
      nextAvailableSystemId = maxSystem.autoId + 1;
    }

    const preview = {
      total: allNodes.length,
      willCreate: { users: 0, systems: 0, tcaMembers: 0, closures: 0 },
      willUpdate: { users: 0, systems: 0, tcaMembers: 0 },
      willSkip: 0,
      nextAvailableUserId,
      nextAvailableSystemId,
      rows: [] as {
        tcaId: number
        name: string
        type: string
        email: string | null
        phone: string | null
        action: 'CREATE_ALL' | 'CREATE_SYSTEM' | 'UPDATE' | 'SKIP'
        actionLabel: string
        actionColor: string
        currentData: {
          userId: number | null
          systemId: number | null
          name: string | null
          email: string | null
          phone: string | null
          referrerId: number | null
          refSysId: number | null
        } | null
        newData: {
          name: string
          email: string | null
          phone: string | null
          hasChanges: boolean
        }
        changes: string[]
        expectedUserId: number | null
        expectedSystemId: number | null
        parentTcaId: number | null
        parentUserId: number | null  // Resolved từ DB hoặc batch
        parentSource: 'DB' | 'BATCH' | 'ROOT' | null
        expectedReferrerId: number | null
        expectedRefSysId: number | null
        closuresToCreate: number
      }[]
    }

    for (const node of allNodes) {
      const info = memberInfo?.[node.id] || {}
      const email = info.email || null
      const phone = info.phone || null
      const normalizedPhone = normalizePhone(phone)

      let existingUser = null
      if (normalizedPhone || email) {
        existingUser = await prisma.user.findFirst({
          where: {
            OR: [
              normalizedPhone ? { phone: normalizedPhone } : undefined,
              email ? { email: email } : undefined
            ].filter(Boolean) as { phone: string }[] | { email: string }[]
          }
        })

        if (!existingUser && normalizedPhone) {
          const allUsers = await prisma.user.findMany({
            where: { phone: { not: null } }
          })
          for (const user of allUsers) {
            if (user.phone && normalizePhone(user.phone) === normalizedPhone) {
              existingUser = user
              break
            }
          }
        }
      }

      let existingSystem = null
      let existingTCAMember = null

      if (existingUser) {
        existingSystem = await prisma.system.findFirst({
          where: { userId: existingUser.id, onSystem: 1 }
        })

        if (existingSystem) {
          existingTCAMember = await (prisma as any).tCAMember.findUnique({
            where: { tcaId: node.id }
          })
        }
      }

      let action: 'CREATE_ALL' | 'CREATE_SYSTEM' | 'UPDATE' | 'SKIP'
      let actionLabel: string
      let actionColor: string
      const changes: string[] = []
      let expectedUserId: number | null = null
      let expectedSystemId: number | null = null
      let closuresToCreate = 0

      if (!existingUser) {
        action = 'CREATE_ALL'
        actionLabel = 'Tao User + System + TCA'
        actionColor = '#2e7d32'
        expectedUserId = nextAvailableUserId++
        expectedSystemId = nextAvailableSystemId++
        closuresToCreate = calculateClosures(node, parentMap)
        preview.willCreate.users++
        preview.willCreate.systems++
        preview.willCreate.tcaMembers++
        preview.willCreate.closures += closuresToCreate
      } else if (!existingSystem) {
        action = 'CREATE_SYSTEM'
        actionLabel = 'Tao System + TCA'
        actionColor = '#1565c0'
        expectedSystemId = nextAvailableSystemId++
        closuresToCreate = calculateClosures(node, parentMap)
        preview.willCreate.systems++
        preview.willCreate.tcaMembers++
        preview.willCreate.closures += closuresToCreate
      } else {
        action = 'UPDATE'
        actionLabel = 'Cap nhat TCA'
        actionColor = '#e65100'

        if (existingTCAMember) {
          const newPersonalScore = node.personalScore ? parseFloat(node.personalScore) : null
          const newTotalScore = node.totalScore ? parseFloat(node.totalScore) : null
          const newLevel = node.level ? parseInt(node.level) : null

          if (existingTCAMember.name !== node.name) {
            changes.push(`Ten: "${existingTCAMember.name}" -> "${node.name}"`)
          }
          if (existingTCAMember.email !== email) {
            changes.push(`Email: "${existingTCAMember.email}" -> "${email}"`)
          }
          if (existingTCAMember.phone !== phone) {
            changes.push(`Phone: "${existingTCAMember.phone}" -> "${phone}"`)
          }
          if (newPersonalScore !== null && existingTCAMember.personalScore?.toString() !== newPersonalScore.toString()) {
            changes.push(`Diem CN: ${existingTCAMember.personalScore} -> ${newPersonalScore}`)
          }
          if (newTotalScore !== null && existingTCAMember.totalScore?.toString() !== newTotalScore.toString()) {
            changes.push(`Diem Tong: ${existingTCAMember.totalScore} -> ${newTotalScore}`)
          }
          if (newLevel !== null && existingTCAMember.level !== newLevel) {
            changes.push(`Cap: ${existingTCAMember.level} -> ${newLevel}`)
          }
        }

        if (changes.length === 0) {
          action = 'SKIP'
          actionLabel = 'Khong doi'
          actionColor = '#999'
          preview.willSkip++
        } else {
          preview.willUpdate.tcaMembers++
        }
      }

      // Resolve parent info
      const parentId = node.parentFolderId;
      const parentTcaId = (!parentId || parentId === 'root' || parentId === '0') ? null : Number(parentId);
      const TCA_ROOT_USER_ID = 861;
      const TCA_ROOT_SYSTEM_ID = 13807;
      
      let parentUserId: number | null = null;
      let parentSource: 'DB' | 'BATCH' | 'ROOT' | null = null;
      let parentSystemId: number | null = null;
      
      if (parentTcaId) {
        // Non-root TCA - tìm parent cụ thể
        const batchNode = allNodes.find(n => n.id === parentTcaId);
        if (batchNode) {
          // Parent có trong batch - tìm userId của parent trong batch
          const parentInfo = preview.rows.find(r => r.tcaId === parentTcaId);
          if (parentInfo) {
            parentUserId = parentInfo.currentData?.userId || parentInfo.expectedUserId;
            parentSystemId = parentInfo.currentData?.systemId || parentInfo.expectedSystemId;
            if (parentUserId) parentSource = 'BATCH';
          }
        } else {
          // Parent không có trong batch - resolve từ DB
          const parentTCAMember = await (prisma as any).tCAMember?.findUnique({
            where: { tcaId: parentTcaId },
            include: { user: { select: { id: true } } }
          });
          if (parentTCAMember) {
            parentUserId = parentTCAMember.userId;
            parentSource = 'DB';
            
            // Lấy parent system
            if (parentUserId) {
              const parentSystem = await prisma.system.findFirst({
                where: { userId: parentUserId, onSystem: 1 }
              });
              if (parentSystem) {
                parentSystemId = parentSystem.autoId;
              }
            }
          }
        }
      } else {
        // Root TCA - referrerId = 861, systemId = 13807
        parentUserId = TCA_ROOT_USER_ID;
        parentSystemId = TCA_ROOT_SYSTEM_ID;
        parentSource = 'ROOT';
      }

      preview.rows.push({
        tcaId: node.id,
        name: node.name,
        type: node.type,
        email,
        phone,
        action,
        actionLabel,
        actionColor,
        currentData: existingUser ? {
          userId: existingUser.id,
          systemId: existingSystem?.autoId || null,
          name: existingUser.name,
          email: existingUser.email,
          phone: existingUser.phone,
          referrerId: existingUser.referrerId,
          refSysId: existingSystem?.refSysId || null
        } : null,
        newData: {
          name: node.name,
          email,
          phone,
          hasChanges: changes.length > 0
        },
        changes,
        expectedUserId,
        expectedSystemId,
        parentTcaId,
        parentUserId,
        parentSource,
        expectedReferrerId: parentUserId,  // referrerId = parentUserId
        expectedRefSysId: parentSystemId,
        closuresToCreate
      })
    }

    console.log('[API/sync-tca/preview] Preview:', {
      total: preview.total,
      willCreate: preview.willCreate,
      willUpdate: preview.willUpdate,
      willSkip: preview.willSkip,
      nextAvailableUserId: preview.nextAvailableUserId,
      nextAvailableSystemId: preview.nextAvailableSystemId
    })

    return NextResponse.json({
      success: true,
      ...preview
    }, { headers: CORS_HEADERS })

  } catch (error) {
    console.error('[API/sync-tca/preview] Error:', error)
    return NextResponse.json({
      success: false,
      error: String(error)
    }, { status: 500, headers: CORS_HEADERS })
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'TCA Sync Preview API',
    version: '2.0.0',
    description: 'Preview sync plan with detailed actions per member',
    usage: {
      method: 'POST',
      body: {
        allNodes: 'Array of TCA nodes with id, type, name, parentFolderId',
        memberInfo: 'Object of member details by TCA ID'
      }
    },
    response: {
      total: 'Tong so thanh vien',
      willCreate: 'So user/system/tcamember/closures se tao moi',
      willUpdate: 'So user/system/tcamember se cap nhat',
      willSkip: 'So dong khong thay doi',
      nextAvailableUserId: 'User ID tiep theo se duoc gan',
      nextAvailableSystemId: 'System autoId tiep theo se duoc gan',
      rows: 'Array chi tiet tung dong voi expectedUserId, expectedSystemId, closuresToCreate'
    }
  }, { headers: CORS_HEADERS })
}
