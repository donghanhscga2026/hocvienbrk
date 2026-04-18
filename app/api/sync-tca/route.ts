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
  allNodes: TCANode[]
  memberInfo: Record<number, MemberInfo>
  stats?: {
    total: number
    folders: number
    items: number
  }
  expectedIds?: ExpectedIds
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
  let stats = { usersCreated: 0, usersUpdated: 0, systemsCreated: 0, systemsUpdated: 0, tcaMembersCreated: 0, tcaMembersUpdated: 0, failed: 0, totalRecords: 0 }
  const failedRecords: { tcaId: number; error: string }[] = []
  const createdRecords: { table: string; id: number; tcaId: number }[] = []

  try {
    const body: SyncPayload = await request.json()
    if (!body.allNodes || !Array.isArray(body.allNodes)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400, headers: CORS_HEADERS })
    }

    stats.totalRecords = body.allNodes.length
    const sortedNodes = sortNodesByHierarchy(body.allNodes)
    
    console.log('[TCA Sync] STAGING_MODE:', STAGING_MODE)
    console.log('[TCA Sync] ExpectedIds:', JSON.stringify(body.expectedIds))

    for (const node of sortedNodes) {
      try {
        const memberInfo = body.memberInfo?.[node.id] || {}
        const phone = memberInfo.phone || null
        const email = memberInfo.email || null
        const expected = body.expectedIds?.[node.id];
        
        // Auto-generate userId nếu không có expectedIds (dự phòng)
        const useUserId = (expected?.userId != null) ? expected.userId : (900000 + node.id);
        const useReferrerId = (expected?.referrerId != null) ? expected.referrerId : (
          (!node.parentFolderId || node.parentFolderId === 'root' || node.parentFolderId === '0') 
            ? 861 
            : 900000 + Number(node.parentFolderId)
        );
        const useRefSysId = (expected?.refSysId != null) ? expected.refSysId : useReferrerId;
        
        console.log('[TCA Sync] Processing node', node.id, '-> userId:', useUserId, '(auto:', !expected, ')');

        const targetUserId = useUserId;
        const targetReferrerId = useReferrerId; 
        const targetRefSysId = useRefSysId;

        // XÁC ĐỊNH MODEL DỰA TRÊN STAGING_MODE
        const userModel = STAGING_MODE ? (prisma as any).userTest : prisma.user;
        const systemModel = STAGING_MODE ? (prisma as any).systemTest : prisma.system;
        const tcaMemberModel = STAGING_MODE ? (prisma as any).tCAMemberTest : (prisma as any).tCAMember;

        // 1. Xử lý User
        let existingUser = await userModel.findUnique({ where: { id: targetUserId } });

        if (existingUser) {
          const updates: any = {};
          if (node.name && existingUser.name !== node.name) updates.name = node.name;
          if (phone && !existingUser.phone) updates.phone = phone;
          if (email && !existingUser.email) updates.email = email;
          if (Object.keys(updates).length > 0) {
            await userModel.update({ where: { id: targetUserId }, data: updates });
            stats.usersUpdated++;
          }
        } else {
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
          createdRecords.push({ table: STAGING_MODE ? 'UserTest' : 'User', id: targetUserId, tcaId: node.id });
          console.log('[TCA Sync] Created', STAGING_MODE ? 'UserTest' : 'User', 'id:', targetUserId);

          // Closure (dùng helper tương ứng với mode)
          if (STAGING_MODE) {
            await addUserToClosureTest(targetUserId, targetReferrerId);
          } else {
            await addUserToClosure(targetUserId, targetReferrerId);
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
          tcaId: node.id, userId: targetUserId, type: node.type || 'item',
          groupName: node.groupName || null, name: node.name || '',
          personalScore: node.personalScore ? new Prisma.Decimal(parseFloat(node.personalScore)) : null,
          totalScore: node.totalScore ? new Prisma.Decimal(parseFloat(node.totalScore)) : null,
          level: node.level ? parseInt(node.level) : null,
          location: node.location || null, phone: phone, email: email,
          parentTcaId: (node.parentFolderId && node.parentFolderId !== 'root' && node.parentFolderId !== '0') ? Number(node.parentFolderId) : null,
          lastSyncedAt: new Date()
        }

        await tcaMemberModel.upsert({
          where: { tcaId: node.id },
          update: tcaMemberData,
          create: tcaMemberData
        });
        stats.tcaMembersCreated++;

      } catch (error) {
        stats.failed++;
        failedRecords.push({ tcaId: node.id, error: String(error) });
      }
    }

    const duration = Date.now() - startTime;
    return NextResponse.json({ success: true, syncId, stats, staging: STAGING_MODE, message: STAGING_MODE ? 'GHI VÀO BẢNG TEST THÀNH CÔNG' : 'Sync completed' }, { headers: CORS_HEADERS })

  } catch (error) {
    console.error('[TCA Sync] ERROR:', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500, headers: CORS_HEADERS })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'TCA Sync API', version: '3.2.0', stagingMode: STAGING_MODE }, { headers: CORS_HEADERS })
}
