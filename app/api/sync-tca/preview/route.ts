import { NextResponse } from 'next/server'
import { generatePreview } from '@/lib/tca-preview-logic'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { allNodes, memberInfo } = body

    console.log('[API/sync-tca/preview] Request:', allNodes?.length || 0, 'nodes')

    if (!allNodes || !Array.isArray(allNodes)) {
      return NextResponse.json(
        { error: 'Invalid payload: allNodes required' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    const result = await generatePreview(allNodes, memberInfo || {})

    return NextResponse.json({
      success: true,
      ...result
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
    version: '4.0.0',
    description: 'Batch loading + shared preview logic'
  }, { headers: CORS_HEADERS })
}
