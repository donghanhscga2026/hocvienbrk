import { NextResponse } from 'next/server'
import { PrismaClient, Prisma } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

// ==========================================
// CẤU HÌNH CHẾ ĐỘ THỰC THI (BRAIN CONTROL)
// ==========================================
const STAGING_MODE = true; // TRUE: Chỉ ghi vào bảng Test | FALSE: Ghi vào bảng thật

// Helper để duy trì phả hệ Closure (su dung tuy theo mode)
import { addUserToClosure } from '@/lib/closure-helpers'
import { addUserToClosureTest } from '@/lib/closure-helpers-test'
import { addUserToSystemClosure } from '@/lib/system-closure-helpers'
import { addUserToSystemClosureTest } from '@/lib/system-closure-helpers-test'

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
  groupName?: string
  name: string
  personalScore?: string
  totalScore?: string
  level?: string
  location?: string
  personalRate?: string
  teamRate?: string
  hasBH?: boolean
  hasTD?: boolean
  parentFolderId?: number | string
  parentFolderName?: string
}

interface MemberInfo {
  phone?: string
  email?: string
  address?: string
  joinDate?: string
  contractDate?: string
  promotionDate?: string
}

interface ExpectedIds {
  [tcaId: number]: {
    userId: number | null
    systemId: number | null
    referrerId: number | null
    refSysId: number | null
  }
}

interface SyncPayload {
  source: string
  timestamp: number
  allNodes?: TCANode[]
  memberInfo: Record<number, MemberInfo>
  stats?: {
    total: number
    folders: number
    items: number
  }
  expectedIds?: ExpectedIds
  // New: TRỰC TIẾP từ previewRows (Plan A)
  previewRows?: PreviewRow[]
}

interface PreviewRow {
  id: number
  name: string
  userId: number | null
  referrerId: number | null
  refSysId: number | null
  action: string
  match: string
  parentTcaId: string | null
  email?: string
  phone?: string
}

async function sendTelegramNotification(message: string) {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN
    const chatId = process.env.TELEGRAM_CHAT_ID_EMAIL
    if (!token || !chatId) return;
    const url = `https://api.telegram.org/bot${token}/sendMessage`
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' })
    })
  } catch (error) {
    console.error('[TCA Sync] Telegram error:', error)
  }
}

function parseDate(dateStr?: string): Date | null {
  if (!dateStr) return null
  const date = new Date(dateStr)
  return isNaN(date.getTime()) ? null : date
}

function sortNodesByHierarchy(nodes: TCANode[]): TCANode[] {
  const roots: TCANode[] = []
  const children: TCANode[] = []
  nodes.forEach(n => {
    const pid = n.parentFolderId
    if (!pid || pid === 'root' || pid === '0') roots.push(n)
    else children.push(n)
  })
  return [...roots, ...children]
}

export async function POST(request: Request) {
  const syncId = uuidv4()
  const startTime = Date.now()
  let stats = { usersCreated: 0, usersUpdated: 0, systemsCreated: 0, systemsUpdated: 0, tcaMembersCreated: 0, tcaMembersUpdated: 0, failed: 0, totalRecords: 0, skipped: 0 }
  const failedRecords: { tcaId: number; error: string }[] = []
  const createdRecords: { table: string; id: number; tcaId: number }[] = []

  try {
    const body: SyncPayload = await request.json()
    
    // ===== PLAN A: DÙNG TRỰC TIẾP previewRows =====
    if (body.previewRows && Array.isArray(body.previewRows)) {
      console.log('[TCA Sync] PLAN A: Using previewRows directly');
      console.log('[TCA Sync] previewRows count:', body.previewRows.length);
      console.log('[TCA Sync] previewRows sample:', JSON.stringify(body.previewRows.slice(0, 3)));
      
      stats.totalRecords = body.previewRows.length;
      
      // Duyệt từng row và xử lý theo action
      for (const row of body.previewRows) {
        try {
          const tcaId = Number(row.id) || 0;
          const targetUserId = Number(row.userId) || 0;
          const action = row.action || 'SKIP';
          const referrerId = Number(row.referrerId) || 0;
          const refSysId = Number(row.refSysId) || 0;
          
          console.log('[TCA Sync] Row:', tcaId, 'userId:', targetUserId, 'action:', action, 'ref:', referrerId);
          
          // Skip nếu userId = 0 hoặc action = SKIP
          if (!targetUserId || action === 'SKIP') {
            stats.skipped = (stats.skipped || 0) + 1;
            continue;
          }
          
          // Xử lý theo action
          const userModel = STAGING_MODE ? (prisma as any).userTest : prisma.user;
          const systemModel = STAGING_MODE ? (prisma as any).systemTest : prisma.system;
          const tcaMemberModel = STAGING_MODE ? (prisma as any).tCAMemberTest : (prisma as any).tCAMember;
          
          if (action === 'CREATE_ALL' || action === 'Tạo All') {
            // Tạo mới User + System
            const hashedPassword = await bcrypt.hash('Brk#3773', 10);
            await userModel.create({
              data: {
                id: targetUserId,
                name: row.name || `TCA ${tcaId}`,
                email: row.email || `tca_${tcaId}@placeholder.local`,
                phone: row.phone || null,
                password: hashedPassword,
                role: 'STUDENT',
                referrerId: referrerId
              }
            });
            stats.usersCreated++;
            
            // Add to closure
            if (STAGING_MODE) {
              await addUserToClosureTest(targetUserId, referrerId);
            } else {
              await addUserToClosure(targetUserId, referrerId);
            }
          }
          
          // Luôn tạo System + TCAMember (cho cả CREATE_ALL và CREATE_SYSTEM)
          const systemParentId = refSysId || 0;
          if (STAGING_MODE) {
            await addUserToSystemClosureTest(targetUserId, systemParentId, 1);
          } else {
            await addUserToSystemClosure(targetUserId, systemParentId, 1);
          }
          
          await tcaMemberModel.upsert({
            where: { tcaId },
            update: {
              tcaId, userId: targetUserId, name: row.name || '', type: 'item',
              parentTcaId: row.parentTcaId ? Number(row.parentTcaId) : null,
              lastSyncedAt: new Date()
            },
            create: {
              tcaId, userId: targetUserId, name: row.name || '', type: 'item',
              parentTcaId: row.parentTcaId ? Number(row.parentTcaId) : null,
              lastSyncedAt: new Date()
            }
          });
          stats.tcaMembersCreated++;
          
        } catch (rowError) {
          stats.failed++;
          failedRecords.push({ tcaId: Number(row.id), error: String(rowError) });
        }
      }
      
      const duration = Date.now() - startTime;
      return NextResponse.json({ 
        success: true, 
        syncId, 
        stats, 
        failedRecords: failedRecords.slice(0, 5), 
        staging: STAGING_MODE, 
        message: STAGING_MODE ? 'GHI VÀO BẢNG TEST THÀNH CÔNG' : 'Sync completed' 
      }, { headers: CORS_HEADERS })
    }
    
    // ===== OLD LOGIC (Fallback): Dùng allNodes + expectedIds =====
    if (!body.allNodes || !Array.isArray(body.allNodes)) {
      return NextResponse.json({ error: 'Invalid payload - need previewRows or allNodes' }, { status: 400, headers: CORS_HEADERS })
    }

    stats.totalRecords = body.allNodes.length
    const sortedNodes = sortNodesByHierarchy(body.allNodes)
    
    console.log('[TCA Sync] STAGING_MODE:', STAGING_MODE)
    console.log('[TCA Sync] allNodes sample:', JSON.stringify(body.allNodes?.slice(0, 2)))
    console.log('[TCA Sync] expectedIds keys:', Object.keys(body.expectedIds || {}))
    console.log('[TCA Sync] expectedIds type sample:', typeof Object.keys(body.expectedIds || {})[0])

    for (const node of sortedNodes) {
      try {
        // ========== GIẢI PHÁP #3: XỬ LÝ MỌI DẠNG ==========
        // Lấy id - ưu tiên number, fallback string
        let nodeIdRaw = node.id;
        // Nếu id là dạng khác (object, array) thì log để biết
        if (typeof nodeIdRaw !== 'number' && typeof nodeIdRaw !== 'string') {
          console.log('[DEBUG] Strange node.id:', typeof nodeIdRaw, nodeIdRaw);
        }
        
        // Convert sang number - dùng ParseInt với fallback an toàn
        let nodeId = 0;
        if (typeof nodeIdRaw === 'number') nodeId = nodeIdRaw;
        else if (typeof nodeIdRaw === 'string') nodeId = parseInt(nodeIdRaw, 10);
        
        // Fallback cuối cùng: dùng index trong mảng + offset
        if (!nodeId || isNaN(nodeId)) {
          // Thử indexOf để lấy
          const idx = sortedNodes.indexOf(node);
          nodeId = 60000 + idx; // Offset để tránh trùng
        }
        
        const nodeIdStr = String(nodeId);
        const memberInfo = ((body.memberInfo as any) || {})[nodeIdStr] || {};
        const phone = memberInfo.phone || null;
        const email = memberInfo.email || null;
        const expected = ((body.expectedIds as any) || {})[nodeIdStr];
        
        // Định nghĩa userId trước để dùng cho SKIP
let targetUserId = expected?.userId || 0;
        
        // ========== LOGIC: SKIP / Tạo Sys / Tạo All ==========
        // Nhận cả display label (Tạo Sys, Tạo All) và internal (CREATE_SYSTEM, CREATE_ALL)
        let action = expected?.action || (targetUserId ? 'Tạo All' : 'SKIP');
        // Normalize action để so sánh
        if (action === 'CREATE_SYSTEM') action = 'Tạo Sys';
        else if (action === 'CREATE_ALL') action = 'Tạo All';
        
        // SKIP: Bỏ qua hoàn toàn - đã có User và System rồi
        if (action === 'SKIP' || targetUserId === 0) {
          stats.skipped = (stats.skipped || 0) + 1;
          console.log('[TCA Sync] SKIP node', nodeId);
          continue;
        }
        
        // Dùng trực tiếp referrerId từ expectedIds - không auto-generate
        const useReferrerId = (expected?.referrerId != null) ? expected.referrerId : 0;
        const useRefSysId = (expected?.refSysId != null) ? expected.refSysId : 0;
        
        console.log('[TCA Sync] Processing node', node.id, '-> userId:', targetUserId, 'action:', action);

        const targetReferrerId = useReferrerId; 
        const targetRefSysId = useRefSysId;

        // XÁC ĐỊNH MODEL DỰA TRÊN STAGING_MODE
        const userModel = STAGING_MODE ? (prisma as any).userTest : prisma.user;
        const systemModel = STAGING_MODE ? (prisma as any).systemTest : prisma.system;
        const tcaMemberModel = STAGING_MODE ? (prisma as any).tCAMemberTest : (prisma as any).tCAMember;

        // 1. Xử lý User
        // Tạo Sys: User đã có, chỉ cần tạo System
        // Tạo All: Cần tạo mới User
        let existingUser = await userModel.findUnique({ where: { id: targetUserId } });
        
        // Nếu action = "Tạo Sys" và User đã tồn tại → bỏ qua tạo User
        const isTaoSys = (action === 'Tạo Sys');

        if (existingUser) {
          // User đã tồn tại - update nếu cần
          const updates: any = {};
          if (node.name && existingUser.name !== node.name) updates.name = node.name;
          if (phone && !existingUser.phone) updates.phone = phone;
          if (email && !existingUser.email) updates.email = email;
          if (Object.keys(updates).length > 0) {
            await userModel.update({ where: { id: targetUserId }, data: updates });
            stats.usersUpdated++;
          }
        } else {
          // Chỉ tạo User khi là Tạo All (không phải Tạo Sys)
          if (!isTaoSys) {
            const hashedPassword = await bcrypt.hash('Brk#3773', 10);
            await userModel.create({
              data: {
                id: targetUserId,
                name: node.name || `TCA User ${node.id}`,
                email: email || `tca_${node.id}@placeholder.local`,
                phone: phone,
                password: hashedPassword,
                role: 'STUDENT',
                referrerId: targetReferrerId
              }
            });
            stats.usersCreated++;
            createdRecords.push({ table: STAGING_MODE ? 'UserTest' : 'User', id: targetUserId, tcaId: nodeId });
            console.log('[TCA Sync] Created', STAGING_MODE ? 'UserTest' : 'User', 'id:', targetUserId);

            // Closure (dùng helper tương ứng với mode)
            if (STAGING_MODE) {
              await addUserToClosureTest(targetUserId, targetReferrerId);
            } else {
              await addUserToClosure(targetUserId, targetReferrerId);
            }
          } else {
            console.log('[TCA Sync] SKIP User creation - action is Tạo Sys, user exists');
          }
        }

        // 2. Xử lý System
        const systemParentId = targetRefSysId || 0;
        if (STAGING_MODE) {
          await addUserToSystemClosureTest(targetUserId, systemParentId, 1);
        } else {
          await addUserToSystemClosure(targetUserId, systemParentId, 1);
        }
        
        const systemRecord = await systemModel.findFirst({ where: { userId: targetUserId, onSystem: 1 } });
        if (systemRecord) stats.systemsCreated++;

        // 3. Xử lý TCAMember
        const tcaMemberData = {
          tcaId: nodeId, userId: targetUserId, type: node.type || 'item',
          groupName: node.groupName || null, name: node.name || '',
          personalScore: node.personalScore ? new Prisma.Decimal(parseFloat(node.personalScore)) : null,
          totalScore: node.totalScore ? new Prisma.Decimal(parseFloat(node.totalScore)) : null,
          level: node.level ? parseInt(node.level) : null,
          location: node.location || null, phone: phone, email: email,
          parentTcaId: (node.parentFolderId && node.parentFolderId !== 'root' && node.parentFolderId !== '0') ? Number(node.parentFolderId || nodeId) : null,
          lastSyncedAt: new Date()
        }

        await tcaMemberModel.upsert({
          where: { tcaId: nodeId },
          update: tcaMemberData,
          create: tcaMemberData
        });
        stats.tcaMembersCreated++;

      } catch (error) {
        stats.failed++;
        failedRecords.push({ tcaId: Number(node.id), error: String(error) });
      }
    }

    const duration = Date.now() - startTime;
    return NextResponse.json({ success: true, syncId, stats, failedRecords: failedRecords.slice(0, 5), staging: STAGING_MODE, message: STAGING_MODE ? 'GHI VÀO BẢNG TEST THÀNH CÔNG' : 'Sync completed' }, { headers: CORS_HEADERS })

  } catch (error) {
    console.error('[TCA Sync] ERROR:', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500, headers: CORS_HEADERS })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'TCA Sync API', version: '3.2.0', stagingMode: STAGING_MODE }, { headers: CORS_HEADERS })
}
