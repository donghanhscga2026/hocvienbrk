import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS })
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const table = searchParams.get('table')

    // Lấy stats cho bảng Test
    if (table === 'test') {
      const users = await prisma.userTest.count()
      const systems = await prisma.systemTest.count()
      const tcaMembers = await prisma.tCAMemberTest.count()
      const closures = await prisma.userClosureTest.count()

      return NextResponse.json({
        stats: { users, systems, tcaMembers, closures }
      }, { headers: CORS_HEADERS })
    }

    return NextResponse.json({ error: 'Invalid table' }, { status: 400, headers: CORS_HEADERS })

  } catch (error) {
    console.error('[ShowData] Error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500, headers: CORS_HEADERS })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { allNodes, memberInfo } = body

    if (!allNodes || !Array.isArray(allNodes)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400, headers: CORS_HEADERS })
    }

    // Gọi demo-preview (đã format sẵn 5 tables)
    const url = process.env.VERCEL_URL 
      ? 'https://' + process.env.VERCEL_URL 
      : 'http://localhost:3000'

    const res = await fetch(url + '/api/sync-tca/demo-preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ allNodes, memberInfo: memberInfo || {} })
    })

    const result = await res.json()

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500, headers: CORS_HEADERS })
    }

    return NextResponse.json(result, { headers: CORS_HEADERS })

  } catch (error) {
    console.error('[ShowData] Error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500, headers: CORS_HEADERS })
  }
}