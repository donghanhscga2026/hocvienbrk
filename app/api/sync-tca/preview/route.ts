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
        match: string
        
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
        
        // Column 11-12: Referrer info
        referrerId: number | null
        refSysId: number | null
        
        // Column 13-14: Action
        action: string
        changes: string[]
        
        // Điểm số TCA (từ Portal)
        tcaScores: {
          personalScore: number | null
          totalScore: number | null
          level: number | null
        } | null
        
        // Điểm số hiện tại trong DB
        dbScores: {
          personalScore: number | null
          totalScore: number | null
          level: number | null
        } | null
        
        // Cờ: có thay đổi điểm số cần update không
        hasScoreChange: boolean
        
        // refSysId comparison (NEW)
        dbRefSysId: number | null
        hasRefSysIdChange: boolean
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
      // Có thể là chuỗi ghép như "PE S", "Pe TCA", hoặc đơn "N"
      let matchType: string | null = null
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
      
      // ====== BƯỚC 2: Xác định match type trong User ======
      let foundInUser = false
      
      if (phoneAndEmailMatch) {
        // Trùng cả phone và email (cùng 1 user)
        existingUser = phoneAndEmailMatch
        matchType = 'PE'
        matchDetails = `User ${existingUser.id} match P+E`
        foundInUser = true
      } else if (phoneMatches.length > 0) {
        // Trùng phone, khác email
        existingUser = phoneMatches[0]
        matchType = 'Pe'
        
        if (email && existingUser.email && existingUser.email.toLowerCase() !== email.toLowerCase()) {
          emailMismatch = true
          needEmailUpdate = true
          matchDetails = `User ${existingUser.id} match Pe, email khac (${existingUser.email} vs ${email})`
        } else if (!email) {
          matchDetails = `User ${existingUser.id} match Pe (TCA khong co email)`
        } else if (!existingUser.email) {
          matchDetails = `User ${existingUser.id} match Pe (DB khong co email)`
        } else {
          matchDetails = `User ${existingUser.id} match Pe`
        }
        foundInUser = true
      } else if (emailMatches.length > 0) {
        // Khác phone, trùng email
        existingUser = emailMatches[0]
        matchType = 'pE'
        matchDetails = `User ${existingUser.id} match pE (khong co P)`
        foundInUser = true
      }

      // ====== BƯỚC 3: CHECK SYSTEM NẾU CÓ TRONG USER ======
      let existingSystem: any = null
      
      // Chỉ khi nào tìm thấy User (foundInUser = true) mới vào đây
      if (foundInUser) {
        // Check System cho User đã tìm thấy (chỉ lấy TCA system = onSystem: 1, order by createdAt desc)
        existingSystem = await prisma.system.findFirst({
          where: { userId: existingUser.id, onSystem: 1 },
          orderBy: { createdAt: 'desc' }
        })
        
        if (existingSystem) {
          // Có System → thêm S vào sau PE/Pe/pE
          if (matchType) {
            matchType = matchType + ' S'
          }
          matchDetails = `User ${existingUser.id} co User va System (da sync)`
        } else {
          matchDetails = `User ${existingUser.id} co User, chua co System`
        }
        
        // ====== BƯỚC 4: CHECK TCA NẾU CÓ SYSTEM ======
        if (existingSystem) {
          const existingTCAMember = await (prisma as any).tCAMember.findUnique({
            where: { tcaId: node.id }
          })
          
          if (existingTCAMember) {
            // Có TCA → thêm TCA vào cuối
            matchType = matchType + ' TCA'
            matchDetails = `TCA ${node.id} da sync day du`
          }
        }
      } else {
        // ====== BƯỚC 5: KHÔNG CÓ TRONG USER ======
        // Không thể có TCA đơn độc vì vào TCA phải qua System → User
        // Nên chỉ có thể là N (mới hoàn toàn)
        matchType = 'N'
        matchDetails = `TCA ${node.id} chua ton tai`
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

      // existingSystem đã được khai báo ở trên
      // Lấy existingTCAMember để check changes nếu có UPDATE
      let existingTCAMember: any = null
      if (existingSystem) {
        existingTCAMember = await (prisma as any).tCAMember.findUnique({
          where: { tcaId: node.id }
        })
      }

      // So sánh điểm số TCA với DB
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
      
      // Kiểm tra có thay đổi điểm số không
      const hasScoreChange = existingTCAMember && (
        tcaPersonalScore !== dbPersonalScore ||
        tcaTotalScore !== dbTotalScore ||
        tcaLevel !== dbLevel
      )

      // Xác định action dựa trên matchType theo quy tắc mới
      // Match chỉ ra thiếu gì, Action chỉ ra cần tạo/cập nhật đó
      let action = ''
      const changes: string[] = []
      let expectedUserId: number | null = null
      let expectedSystemId: number | null = null

      // Action = chuỗi ký tự cần tạo/cập nhật
      if (matchType === 'N') {
        // N: Mới hoàn toàn - tạo User + referrer closure, System + system closure, TCA Member
        action = 'PE S TCA'  // Tạo tất cả
        expectedUserId = nextAvailableUserId++
        expectedSystemId = nextAvailableSystemId++
      } else if (matchType === 'PE') {
        // PE: Có User (P+E), thiếu S và TCA
        action = 'S TCA'
      } else if (matchType === 'Pe') {
        // Pe: Trùng P, khác E - cập nhật Email + tạo S + TCA
        action = 'E S TCA'
        expectedSystemId = nextAvailableSystemId++
        if (email && existingUser?.email && existingUser.email !== email) {
          changes.push(`Email: "${existingUser.email}" -> "${email}"`)
        }
      } else if (matchType === 'pE') {
        // pE: Trùng E, khác P - cập nhật Phone + tạo S + TCA
        action = 'P S TCA'
        expectedSystemId = nextAvailableSystemId++
        if (phone && existingUser?.phone && existingUser.phone !== phone) {
          changes.push(`Phone: "${existingUser.phone}" -> "${phone}"`)
        }
      } else if (matchType === 'PE S') {
        // PE S: Có User + System, thiếu TCA → tạo TCAMember
        action = 'TCA'
      } else if (matchType === 'Pe S') {
        // Pe S: Có User + System, cập nhật Email + tạo TCA
        action = 'E TCA'
        if (email && existingUser?.email && existingUser.email !== email) {
          changes.push(`Email: "${existingUser.email}" -> "${email}"`)
        }
      } else if (matchType === 'pE S') {
        // pE S: Có User + System, cập nhật Phone + tạo TCA
        action = 'P TCA'
        if (phone && existingUser?.phone && existingUser.phone !== phone) {
          changes.push(`Phone: "${existingUser.phone}" -> "${phone}"`)
        }
      } else if (matchType === 'PE TCA') {
        // PE TCA: Có User + TCA, thiếu S
        action = 'S'
        expectedSystemId = nextAvailableSystemId++
      } else if (matchType === 'Pe TCA') {
        // Pe TCA: Có User + TCA, cập nhật Email + tạo S
        action = 'E S'
        expectedSystemId = nextAvailableSystemId++
        if (email && existingUser?.email && existingUser.email !== email) {
          changes.push(`Email: "${existingUser.email}" -> "${email}"`)
        }
      } else if (matchType === 'pE TCA') {
        // pE TCA: Có User + TCA, cập nhật Phone + tạo S
        action = 'P S'
        expectedSystemId = nextAvailableSystemId++
        if (phone && existingUser?.phone && existingUser.phone !== phone) {
          changes.push(`Phone: "${existingUser.phone}" -> "${phone}"`)
        }
      } else if (matchType === 'PE S TCA' || matchType === 'S TCA PE' || matchType === 'PE TCA S') {
        // PE S TCA: Đầy đủ User+System+TCA
        // Chỉ cập nhật TCA nếu có thay đổi điểm số
        if (hasScoreChange) {
          action = 'TCA'
          if (dbPersonalScore !== tcaPersonalScore) {
            changes.push(`Điểm CN: ${dbPersonalScore || 0} -> ${tcaPersonalScore}`)
          }
          if (dbTotalScore !== tcaTotalScore) {
            changes.push(`Điểm ĐỘI: ${dbTotalScore || 0} -> ${tcaTotalScore}`)
          }
          if (dbLevel !== tcaLevel) {
            changes.push(`Cấp: ${dbLevel || '-'} -> ${tcaLevel}`)
          }
        } else {
          action = 'SKIP'
          changes.push('Không có thay đổi')
        }
      } else if (matchType === 'Pe S TCA' || matchType === 'Pe TCA S' || matchType === 'S TCA Pe') {
        // Pe S TCA: Đủ hết, nhưng email khác → cập nhật email + cập nhật TCAMember điểm
        action = hasScoreChange ? 'E TCA' : 'E'
        if (email && existingUser?.email && existingUser.email !== email) {
          changes.push(`Email: "${existingUser.email}" -> "${email}"`)
        }
        if (hasScoreChange) {
          if (dbPersonalScore !== tcaPersonalScore) {
            changes.push(`Điểm CN: ${dbPersonalScore || 0} -> ${tcaPersonalScore}`)
          }
          if (dbTotalScore !== tcaTotalScore) {
            changes.push(`Điểm ĐỘI: ${dbTotalScore || 0} -> ${tcaTotalScore}`)
          }
        }
      } else if (matchType === 'pE S TCA' || matchType === 'pE TCA S' || matchType === 'S TCA pE') {
        // pE S TCA: Đủ hết, nhưng phone khác → cập nhật phone + cập nhật TCAMember điểm
        action = hasScoreChange ? 'P TCA' : 'P'
        if (phone && existingUser?.phone && existingUser.phone !== phone) {
          changes.push(`Phone: "${existingUser.phone}" -> "${phone}"`)
        }
        if (hasScoreChange) {
          if (dbPersonalScore !== tcaPersonalScore) {
            changes.push(`Điểm CN: ${dbPersonalScore || 0} -> ${tcaPersonalScore}`)
          }
          if (dbTotalScore !== tcaTotalScore) {
            changes.push(`Điểm ĐỘI: ${dbTotalScore || 0} -> ${tcaTotalScore}`)
          }
        }
      } else if (matchType === 'S TCA') {
        // S TCA: Có System + TCA nhưng không tìm thấy User qua phone/email
        // → Chỉ cập nhật điểm số TCAMember nếu có thay đổi
        if (hasScoreChange) {
          action = 'TCA'
          if (dbPersonalScore !== tcaPersonalScore) {
            changes.push(`Điểm CN: ${dbPersonalScore || 0} -> ${tcaPersonalScore}`)
          }
          if (dbTotalScore !== tcaTotalScore) {
            changes.push(`Điểm ĐỘI: ${dbTotalScore || 0} -> ${tcaTotalScore}`)
          }
          if (dbLevel !== tcaLevel) {
            changes.push(`Cấp: ${dbLevel || '-'} -> ${tcaLevel}`)
          }
        } else {
          action = 'SKIP'
          changes.push('Không có thay đổi')
        }
      } else {
        // Fallback - tạo mới tất cả (chỉ khi không khớp bất kỳ case nào)
        action = 'PE S TCA'
        expectedUserId = nextAvailableUserId++
        expectedSystemId = nextAvailableSystemId++
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
            // parentSystemId = parentInfo.db?.userId (User ID = System refSysId)
            parentSystemId = parentUserId;
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
            // parentSystemId = parentTCAMember.userId (UserID = refSysId trong System)
            parentSystemId = parentUserId;
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
                    parentSystemId = user.id; // UserID = refSysId
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
                  parentSystemId = userByEmail.id; // UserID = refSysId
                }
              }
            }
          }
        }
      } else {
        // Root TCA - referrerId = 861, systemId = 13807
        parentUserId = TCA_ROOT_USER_ID;
        parentSystemId = TCA_ROOT_USER_ID; // refSysId = root user id
        parentSource = 'ROOT';
      }

      // ====== NEW: KIỂM TRA refSysId SO VỚI HIỆN TẠI TRONG DB ======
      let hasRefSysIdChange = false;
      let dbRefSysId: number | null = null;
      
      if (existingSystem && parentSystemId !== null) {
        // Lấy refSysId hiện tại từ System
        dbRefSysId = existingSystem.refSysId || null;
        
        // So sánh với parentSystemId (refSysId mong đợi từ TCA)
        if (dbRefSysId !== parentSystemId) {
          hasRefSysIdChange = true;
          // Thêm vào changes
          changes.push(`refSysId: ${dbRefSysId || 0} -> ${parentSystemId}`);
        }
      }
      
      // Nếu refSysId thay đổi và matchType có S (đã có System)
      if (matchType && matchType.includes('S') && hasRefSysIdChange) {
        // Thêm action để cập nhật System + closure
        if (action === 'SKIP' || action === '') {
          action = 'S';
        } else if (!action.includes('S')) {
          action = action + ' S';
        }
      }

      // matchType đã được xác định ở trên (N/PE/Pe/pE/TCA/S)
      // UserID = existing OR expected
      const finalUserId = existingUser?.id || expectedUserId

      // refSysId = ParentUserId (UserID of F1, NOT System.autoId)
      const finalRefSysId = parentUserId

      preview.rows.push({
        // Column 1: TCA info
        id: node.id,
        name: node.name,
        type: node.type,
        
        // Column 4: Match (matchType đã là N/PE/Pe/pE/TCA/S)
        match: matchType || 'N',
        
        // Column 5: DB data
        db: existingUser ? {
          userId: existingUser.id,
          name: existingUser.name,
          email: existingUser.email,
          phone: existingUser.phone,
          referrerId: existingUser.referrerId
        } : null,
        
        // Column 5b: DB refSysId để compare (trong System.refSysId)
        dbRefSysId: dbRefSysId,
        
        // Column 5c: refSysId thay đổi
        hasRefSysIdChange: hasRefSysIdChange,
        
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
        changes,
        
        // Điểm số TCA (từ Portal)
        tcaScores: {
          personalScore: tcaPersonalScore,
          totalScore: tcaTotalScore,
          level: tcaLevel
        },
        
        // Điểm số hiện tại trong DB
        dbScores: {
          personalScore: dbPersonalScore,
          totalScore: dbTotalScore,
          level: dbLevel
        },
        
        // Cờ: có thay đổi điểm số cần update không
        hasScoreChange: !!hasScoreChange
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
      'match: N|PE|Pe|pE|S|TCA hoac chuoi ket hop (vd: PE S, Pe TCA)',
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
