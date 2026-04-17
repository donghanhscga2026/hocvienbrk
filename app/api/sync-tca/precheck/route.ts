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

interface MemberInfo {
  phone?: string
  email?: string
  address?: string
  joinDate?: string
  contractDate?: string
  promotionDate?: string
}

interface PrecheckPayload {
  allNodes: {
    id: number
    type: string
    name: string
    parentFolderId?: number
  }[]
  memberInfo: Record<number, MemberInfo>
}

export async function POST(request: Request) {
  try {
    const body: PrecheckPayload = await request.json()
    const { allNodes, memberInfo } = body

    console.log('==========================================')
    console.log('[API/sync-tca/precheck] Precheck request')
    console.log('Total nodes:', allNodes?.length || 0)
    console.log('==========================================')

    // Helper function to normalize phone number
    const normalizePhone = (phone: string | null): string | null => {
      if (!phone) return null;
      // Remove all non-digit characters
      const digits = phone.replace(/\D/g, '');
      // If starts with 84, remove it
      if (digits.startsWith('84') && digits.length === 11) {
        return '0' + digits.substring(2);
      }
      // If starts with 0, keep as is
      if (digits.startsWith('0')) {
        return digits;
      }
      // Otherwise return original
      return phone;
    }

    if (!allNodes || !Array.isArray(allNodes)) {
      return NextResponse.json(
        { error: 'Invalid payload: allNodes required' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    const results = {
      totalNodes: allNodes.length,
      willCreateUsers: 0,
      willUpdateUsers: 0,
      willCreateSystems: 0,
      willUpdateSystems: 0,
      willCreateTCAMembers: 0,
      willUpdateTCAMembers: 0,
      members: [] as {
        tcaId: number
        name: string
        type: string
        email: string | null
        phone: string | null
        normalizedPhone: string | null
        status: 'NEW_USER' | 'EXISTING_USER' | 'NEW_SYSTEM' | 'EXISTING_SYSTEM'
        existingUserId: number | null
        existingSystemId: number | null
        message: string
      }[]
    }

    for (const node of allNodes) {
      const info = memberInfo?.[node.id] || {}
      const email = info.email || null
      const phone = info.phone || null
      const normalizedPhone = normalizePhone(phone);

      console.log(`[Precheck] TCA ID ${node.id}: email=${email}, phone=${phone} -> normalized=${normalizedPhone}`);

      // Check if user exists (by phone OR email)
      let existingUser = null;
      if (normalizedPhone || email) {
        // First try exact match
        existingUser = await prisma.user.findFirst({
          where: {
            OR: [
              normalizedPhone ? { phone: normalizedPhone } : undefined,
              email ? { email: email } : undefined
            ].filter(Boolean) as { phone: string }[] | { email: string }[]
          }
        });

        // If no exact match, try fuzzy phone match (get all users with phone containing digits)
        if (!existingUser && normalizedPhone) {
          const allUsers = await prisma.user.findMany({
            where: {
              phone: { not: null }
            }
          });
          
          // Find user with matching normalized phone
          for (const user of allUsers) {
            if (user.phone && normalizePhone(user.phone) === normalizedPhone) {
              existingUser = user;
              console.log(`[Precheck] Found user by fuzzy phone match: ${user.id}`);
              break;
            }
          }
        }
      }

      // Check if system exists
      let existingSystem = null;
      if (existingUser) {
        existingSystem = await prisma.system.findFirst({
          where: {
            userId: existingUser.id,
            onSystem: 1
          }
        });
        console.log(`[Precheck] User ${existingUser.id} found, system exists: ${!!existingSystem}`);
      }

      // Determine status
      let status: string
      let message: string

      if (!existingUser) {
        status = 'NEW_USER'
        message = 'User mới - sẽ tạo tài khoản với email/phone'
        results.willCreateUsers++
      } else if (!existingSystem) {
        status = 'NEW_SYSTEM'
        message = 'User đã có - sẽ tạo System entry'
        results.willUpdateUsers++
        results.willCreateSystems++
      } else {
        status = 'EXISTING_SYSTEM'
        message = 'User và System đã tồn tại - sẽ cập nhật thông tin TCA'
        results.willUpdateUsers++
        results.willUpdateSystems++
      }

      results.members.push({
        tcaId: node.id,
        name: node.name,
        type: node.type,
        email,
        phone,
        normalizedPhone,
        status: status as 'NEW_USER' | 'EXISTING_USER' | 'NEW_SYSTEM' | 'EXISTING_SYSTEM',
        existingUserId: existingUser?.id || null,
        existingSystemId: existingSystem?.autoId || null,
        message
      })
    }

    // Calculate summary
    results.willCreateTCAMembers = results.members.filter(m => m.status !== 'EXISTING_SYSTEM').length
    results.willUpdateTCAMembers = results.members.filter(m => m.status === 'EXISTING_SYSTEM').length

    console.log('[API/sync-tca/precheck] Results:', {
      willCreateUsers: results.willCreateUsers,
      willUpdateUsers: results.willUpdateUsers,
      willCreateSystems: results.willCreateSystems,
      willUpdateSystems: results.willUpdateSystems
    })

    return NextResponse.json({
      success: true,
      ...results
    }, { headers: CORS_HEADERS })

  } catch (error) {
    console.error('[API/sync-tca/precheck] Error:', error)
    return NextResponse.json({
      success: false,
      error: String(error)
    }, { status: 500, headers: CORS_HEADERS })
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'TCA Precheck API',
    version: '1.0.0',
    description: 'Kiểm tra xem user đã tồn tại trong DB chưa trước khi sync',
    usage: {
      method: 'POST',
      body: {
        allNodes: 'Array of TCA nodes with id, type, name',
        memberInfo: 'Object of member details by TCA ID'
      }
    },
    response: {
      totalNodes: 'Tổng số nodes',
      willCreateUsers: 'Số user sẽ tạo mới',
      willUpdateUsers: 'Số user sẽ cập nhật',
      willCreateSystems: 'Số system sẽ tạo mới',
      willUpdateSystems: 'Số system sẽ cập nhật',
      members: 'Array chi tiết từng member với status'
    }
  }, { headers: CORS_HEADERS })
}
