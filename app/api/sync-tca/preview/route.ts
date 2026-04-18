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
      nextAvailableUserId,
      nextAvailableSystemId,
      rows: [] as {
        // Column 1: TCA info
        id: number              // tcaId - TCA ID
        name: string           // Ten thanh vien
        type: string           // Type
        
        // Column 4: Match type from DB
        match: 'PHONE_EMAIL' | 'PHONE_ONLY' | 'EMAIL_ONLY' | 'NEW'
        
        // Column 5: Existing DB data
        db: {
          userId: number | null
          name: string | null
          email: string | null
          phone: string | null
          referrerId: number | null
        } | null
        
        // Column 6: UserID (existing or expected)
        userId: number | null
        
        // Column 7-8: TCA info
        email: string | null
        phone: string | null
        
        // Column 9-10: Parent info
        parentTcaId: number | null
        parentUserId: number | null
        
        // Column 11-12: Referrer info (UserID of parent F1)
        referrerId: number | null
        refSysId: number | null   // = ParentUserId (UserID, not System.autoId)
        
        // Column 13-14: Action
        action: 'CREATE_ALL' | 'CREATE_SYSTEM' | 'UPDATE' | 'SKIP'
        changes: string[]
      }[]
    }

    for (const node of allNodes) {
      const info = memberInfo?.[node.id] || {}
      const email = info.email || null
      const phone = info.phone || null
      const normalizedPhone = normalizePhone(phone)

      // ====== LOGIC XÁC ĐỊNH USER TỒN TẠI ======
      // QUY TẮC: Cùng 1 User phải match CẢ phone VÀ email mới là P+E
      // Ưu tiên: Phone → Email
      let existingUser: any = null
      let matchType: 'PHONE_EMAIL' | 'PHONE_ONLY' | 'EMAIL_ONLY' | null = null
      let emailMismatch = false
      let needEmailUpdate = false
      let matchDetails = ''

      // Bước 1: Tìm TẤT CẢ users có phone trùng
      const phoneMatches: any[] = []
      if (normalizedPhone) {
        const allUsers = await prisma.user.findMany({
          where: { phone: { not: null } }
        })
        for (const user of allUsers) {
          if (user.phone && normalizePhone(user.phone) === normalizedPhone) {
            phoneMatches.push(user)
          }
        }
      }

      // Bước 2: Tìm user có email trùng
      const emailMatches: any[] = []
      if (email) {
        const emailUsers = await prisma.user.findMany({
          where: {}
        })
        for (const user of emailUsers) {
          if (user.email && user.email.toLowerCase() === email.toLowerCase()) {
            emailMatches.push(user)
          }
        }
      }

      // Bước 3: Xác định match type theo quy tắc
      // Ưu tiên 1: Tìm user vừa trùng phone VỪA trùng email (cùng 1 user)
      const phoneAndEmailMatch = phoneMatches.find((pu: any) => 
        emailMatches.some((eu: any) => eu.id === pu.id)
      )
      
      if (phoneAndEmailMatch) {
        existingUser = phoneAndEmailMatch
        matchType = 'PHONE_EMAIL'
        matchDetails = `User ${existingUser.id} match P+E`
      } else if (phoneMatches.length > 0) {
        existingUser = phoneMatches[0]
        matchType = 'PHONE_ONLY'
        
        if (email && existingUser.email && existingUser.email.toLowerCase() !== email.toLowerCase()) {
          emailMismatch = true
          needEmailUpdate = true
          matchDetails = `User ${existingUser.id} match P, email khac (${existingUser.email} vs ${email})`
        } else if (!email) {
          matchDetails = `User ${existingUser.id} match P (TCA khong co email)`
        } else if (!existingUser.email) {
          matchDetails = `User ${existingUser.id} match P (DB khong co email)`
        } else {
          matchDetails = `User ${existingUser.id} match P`
        }
      } else if (emailMatches.length > 0) {
        existingUser = emailMatches[0]
        matchType = 'EMAIL_ONLY'
        matchDetails = `User ${existingUser.id} match E (khong co P)`
      }

      // Debug log
      if (node.id === 61928 || matchType !== null) {
        console.log(`[Preview] TCA ${node.id}: phone=${normalizedPhone}, email=${email}, matchType=${matchType}, userId=${existingUser?.id} - ${matchDetails}`)
        if (phoneMatches.length > 1) {
          console.log(`[Preview]   WARNING: ${phoneMatches.length} users cung phone! Users:`, phoneMatches.map((u: any) => u.id))
        }
        if (emailMatches.length > 1) {
          console.log(`[Preview]   WARNING: ${emailMatches.length} users cung email! Users:`, emailMatches.map((u: any) => u.id))
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
      const changes: string[] = []
      let expectedUserId: number | null = null
      let expectedSystemId: number | null = null
      let matchInfo = ''

      if (!existingUser) {
        action = 'CREATE_ALL'
        expectedUserId = nextAvailableUserId++
        expectedSystemId = nextAvailableSystemId++
        matchInfo = 'USER_MOI'
      } else if (matchType === 'PHONE_ONLY' && needEmailUpdate) {
        action = 'CREATE_SYSTEM'
        expectedSystemId = nextAvailableSystemId++
        matchInfo = 'PHONE_TRUNG_EMAIL_KHONG'
      } else if (matchType === 'EMAIL_ONLY') {
        action = 'CREATE_SYSTEM'
        expectedSystemId = nextAvailableSystemId++
        matchInfo = 'EMAIL_TRUNG_PHONE_KHONG'
      } else if (!existingSystem) {
        action = 'CREATE_SYSTEM'
        expectedSystemId = nextAvailableSystemId++
        matchInfo = 'PHONE_EMAIL_TRUNG'
      } else {
        action = 'UPDATE'
        matchInfo = matchType === 'PHONE_EMAIL' ? 'USER_TON_TAI' : 'PHONE_EMAIL_TRUNG'

        // Tìm existing TCAMember để check changes
        const existingTCAMember = await (prisma as any).tCAMember.findUnique({
          where: { tcaId: node.id }
        })

        if (existingTCAMember) {
          if (existingTCAMember.name !== node.name) {
            changes.push(`Ten: "${existingTCAMember.name}" -> "${node.name}"`)
          }
          if (existingTCAMember.email !== email) {
            changes.push(`Email: "${existingTCAMember.email}" -> "${email}"`)
          }
          if (existingTCAMember.phone !== phone) {
            changes.push(`Phone: "${existingTCAMember.phone}" -> "${phone}"`)
          }
        }

        if (changes.length === 0) {
          action = 'SKIP'
        }
      }

      // Resolve parent info
      const parentId = node.parentFolderId;
      const parentTcaId = (!parentId || parentId === 'root' || parentId === '0') ? null : Number(parentId);
      const TCA_ROOT_USER_ID = 861;
      const TCA_ROOT_SYSTEM_ID = 13807;
      
      let parentUserId: number | null = null;
      let parentSource: 'DB' | 'BATCH' | 'FOLDER' | 'ROOT' | null = null;
      let parentSystemId: number | null = null;
      
      if (parentTcaId) {
        // Non-root TCA - tìm parent cụ thể
        const batchNode = allNodes.find(n => n.id === parentTcaId);
        if (batchNode) {
          // Parent có trong batch - tìm userId của parent trong batch
          const parentInfo = preview.rows.find(r => r.id === parentTcaId);
          if (parentInfo) {
            parentUserId = parentInfo.db?.userId || parentInfo.userId;
            if (parentUserId) parentSource = 'BATCH';
          }
        } else {
          // Parent không có trong batch - resolve từ DB
          const parentTCAMember = await (prisma as any).tCAMember?.findUnique({
            where: { tcaId: parentTcaId }
          });
          
          if (parentTCAMember?.userId) {
            // Parent có TCAMember trong DB
            parentUserId = parentTCAMember.userId;
            parentSource = 'DB';
            
            if (parentUserId != null) {
              const parentSystem = await prisma.system.findFirst({
                where: { userId: parentUserId, onSystem: 1 }
              });
              if (parentSystem) {
                parentSystemId = parentSystem.autoId;
              }
            }
          } else {
            // Parent là FOLDER - tìm memberInfo của folder parent
            const parentFolderInfo = memberInfo?.[parentTcaId];
            if (parentFolderInfo) {
              const parentFolderPhone = parentFolderInfo.phone?.replace(/\D/g, '') || null;
              const parentFolderEmail = parentFolderInfo.email || null;
              
              // Tìm user qua phone trước
              if (parentFolderPhone) {
                const allUsers = await prisma.user.findMany({
                  where: { phone: { not: null } }
                });
                for (const user of allUsers) {
                  if (user.phone && normalizePhone(user.phone) === parentFolderPhone) {
                    parentUserId = user.id;
                    parentSource = 'FOLDER';
                    
                    const parentSystem = await prisma.system.findFirst({
                      where: { userId: parentUserId, onSystem: 1 }
                    });
                    if (parentSystem) {
                      parentSystemId = parentSystem.autoId;
                    }
                    break;
                  }
                }
              }
              
              // Nếu không tìm được qua phone, thử qua email
              if (!parentUserId && parentFolderEmail) {
                const userByEmail = await prisma.user.findFirst({
                  where: { email: { equals: parentFolderEmail, mode: 'insensitive' } }
                });
                if (userByEmail) {
                  parentUserId = userByEmail.id;
                  parentSource = 'FOLDER';
                  
                  const parentSystem = await prisma.system.findFirst({
                    where: { userId: parentUserId, onSystem: 1 }
                  });
                  if (parentSystem) {
                    parentSystemId = parentSystem.autoId;
                  }
                }
              }
            }
            
            // Debug
            if (node.id === 61928) {
              console.log(`[Preview] TCA 61928 parent: folderInfo=${JSON.stringify(memberInfo?.[parentTcaId])}, parentUserId=${parentUserId}`);
            }
          }
        }
      } else {
        // Root TCA - referrerId = 861, systemId = 13807
        parentUserId = TCA_ROOT_USER_ID;
        parentSystemId = TCA_ROOT_SYSTEM_ID;
        parentSource = 'ROOT';
      }

      // Convert matchType to new format
      const newMatchType: 'PHONE_EMAIL' | 'PHONE_ONLY' | 'EMAIL_ONLY' | 'NEW' = 
        matchType || (existingUser ? (matchType as any) : 'NEW')

      // UserID = existing OR expected
      const finalUserId = existingUser?.id || expectedUserId

      // refSysId = ParentUserId (UserID of F1, NOT System.autoId)
      const finalRefSysId = parentUserId

      preview.rows.push({
        // Column 1: TCA info
        id: node.id,
        name: node.name,
        type: node.type,
        
        // Column 4: Match
        match: newMatchType || 'NEW',
        
        // Column 5: DB data
        db: existingUser ? {
          userId: existingUser.id,
          name: existingUser.name,
          email: existingUser.email,
          phone: existingUser.phone,
          referrerId: existingUser.referrerId
        } : null,
        
        // Column 6: UserID
        userId: finalUserId,
        
        // Column 7-8: TCA info
        email,
        phone,
        
        // Column 9-10: Parent
        parentTcaId,
        parentUserId,
        
        // Column 11-12: Referrer (UserID)
        referrerId: parentUserId,
        refSysId: finalRefSysId,
        
        // Column 13-14: Action
        action,
        changes
      })
    }

    console.log('[API/sync-tca/preview] Preview:', {
      total: preview.total,
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
    version: '3.0.0',
    description: 'Bảng tổng hợp TCA - 1 bảng duy nhất với tất cả thông tin',
    usage: {
      method: 'POST',
      body: {
        allNodes: 'Array of TCA nodes with id, type, name, parentFolderId',
        memberInfo: 'Object of member details by TCA ID'
      }
    },
    columns: [
      'id: TCA ID',
      'name: Tên thành viên',
      'type: Loại (member/folder)',
      'match: PHONE_EMAIL | PHONE_ONLY | EMAIL_ONLY | NEW',
      'db: Dữ liệu hiện có trong DB (nếu có)',
      'userId: User ID (hiện có hoặc sẽ tạo)',
      'email: Email từ TCA',
      'phone: Phone từ TCA',
      'parentTcaId: Parent TCA ID',
      'parentUserId: UserID của parent',
      'referrerId: Referrer (F1) - UserID',
      'refSysId: refSysId trong System - UserID của parent',
      'action: CREATE_ALL | CREATE_SYSTEM | UPDATE | SKIP',
      'changes: Các thay đổi (nếu UPDATE)'
    ],
    nextAvailableUserId: 'User ID tiếp theo sẽ được tạo',
    nextAvailableSystemId: 'System autoId tiếp theo sẽ được tạo'
  }, { headers: CORS_HEADERS })
}
