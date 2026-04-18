import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS })
}

export async function DELETE() {
  try {
    // Delete all test data
    await prisma.userClosureTest.deleteMany()
    await prisma.systemClosureTest.deleteMany()
    await prisma.tCAMemberTest.deleteMany()
    await prisma.systemTest.deleteMany()
    await prisma.userTest.deleteMany()

    return NextResponse.json({ 
      success: true, 
      message: 'Da xoa tat ca du lieu Test' 
    }, { headers: CORS_HEADERS })
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: String(error) 
    }, { status: 500, headers: CORS_HEADERS })
  }
}

export async function GET() {
  return NextResponse.json({ 
    status: 'Clear Test API', 
    usage: 'DELETE /api/sync-tca/clear-test' 
  }, { headers: CORS_HEADERS })
}