import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"

// Validation: max 10 chars, a-z0-9 only
function isValidRefKey(key: string): boolean {
  return /^[a-z0-9]{1,10}$/.test(key)
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = parseInt(session.user.id)

    const refs = await prisma.affiliateRef.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    })

    return NextResponse.json({ refs })

  } catch (error) {
    console.error("[Refs] GET Error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = parseInt(session.user.id)
    const body = await request.json()
    const { refKey, description, type } = body

    // Validate refKey
    if (!refKey) {
      return NextResponse.json({ error: "refKey is required" }, { status: 400 })
    }

    const normalizedKey = refKey.toLowerCase().trim()

    if (!isValidRefKey(normalizedKey)) {
      return NextResponse.json({ 
        error: "refKey must be 1-10 characters, lowercase a-z and numbers only" 
      }, { status: 400 })
    }

    // Check if refKey already exists
    const existing = await prisma.affiliateRef.findUnique({
      where: { refKey: normalizedKey }
    })

    if (existing) {
      return NextResponse.json({ 
        error: "This refKey already exists. Please choose a different one." 
      }, { status: 409 })
    }

    // Also check in User table for duplicate
    if (!isNaN(parseInt(normalizedKey))) {
      const userExists = await prisma.user.findUnique({
        where: { id: parseInt(normalizedKey) }
      })
      if (userExists) {
        return NextResponse.json({ 
          error: "This refKey conflicts with a user ID. Please choose a different one." 
        }, { status: 409 })
      }
    }

    const affiliateCode = (await prisma.user.findUnique({ 
      where: { id: userId },
      select: { affiliateCode: true }
    }))?.affiliateCode

    if (normalizedKey === affiliateCode?.toLowerCase()) {
      return NextResponse.json({ 
        error: "This refKey conflicts with your affiliate code. Please choose a different one." 
      }, { status: 409 })
    }

    // Create the ref
    const newRef = await prisma.affiliateRef.create({
      data: {
        refKey: normalizedKey,
        userId,
        type: type || "CUSTOM_ALIAS",
        description: description || null,
      }
    })

    return NextResponse.json({ 
      success: true, 
      ref: newRef 
    })

  } catch (error) {
    console.error("[Refs] POST Error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = parseInt(session.user.id)
    const body = await request.json()
    const { refId, description, isActive } = body

    if (!refId) {
      return NextResponse.json({ error: "refId is required" }, { status: 400 })
    }

    // Verify ownership
    const existing = await prisma.affiliateRef.findFirst({
      where: { id: refId, userId }
    })

    if (!existing) {
      return NextResponse.json({ error: "Ref not found or not owned by you" }, { status: 404 })
    }

    const updated = await prisma.affiliateRef.update({
      where: { id: refId },
      data: {
        description: description !== undefined ? description : existing.description,
        isActive: isActive !== undefined ? isActive : existing.isActive,
      }
    })

    return NextResponse.json({ success: true, ref: updated })

  } catch (error) {
    console.error("[Refs] PUT Error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = parseInt(session.user.id)
    const { searchParams } = new URL(request.url)
    const refId = searchParams.get('id')

    if (!refId) {
      return NextResponse.json({ error: "id is required" }, { status: 400 })
    }

    // Verify ownership
    const existing = await prisma.affiliateRef.findFirst({
      where: { id: parseInt(refId), userId }
    })

    if (!existing) {
      return NextResponse.json({ error: "Ref not found or not owned by you" }, { status: 404 })
    }

    await prisma.affiliateRef.delete({
      where: { id: parseInt(refId) }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error("[Refs] DELETE Error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}