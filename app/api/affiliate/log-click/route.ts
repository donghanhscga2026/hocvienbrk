import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { resolveRefToUserId } from "@/lib/affiliate/resolve-ref-helper"

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ref = searchParams.get("ref")
    if (!ref) {
      return NextResponse.json({ error: "Missing ref parameter" }, { status: 400 })
    }

    const userId = await resolveRefToUserId(ref)
    if (!userId) {
      return NextResponse.json({ error: "Invalid ref - user not found" }, { status: 404 })
    }

    let link = await prisma.affiliateLink.findFirst({
      where: { code: userId.toString() }
    })
    if (!link) {
      let campaign = await prisma.affiliateCampaign.findFirst({ where: { isDefault: true } })
      if (!campaign) {
        campaign = await prisma.affiliateCampaign.create({
          data: { name: "Default Campaign", slug: "default-campaign", isDefault: true }
        })
      }
      link = await prisma.affiliateLink.create({
        data: { userId, campaignId: campaign.id, code: userId.toString(), name: "Default" }
      })
    }

    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    const userAgent = request.headers.get("user-agent") || ""

    const click = await prisma.affiliateClick.create({
      data: { linkId: link.id, ipAddress, userAgent }
    })

    return NextResponse.json({ success: true, clickId: click.id, userId })
  } catch (error) {
    console.error("[Log-Click] Error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")
    const refUserId = searchParams.get("refUserId")
    const days = parseInt(searchParams.get("days") || "7")

    const where: any = {}
    if (refUserId) {
      const links = await prisma.affiliateLink.findMany({
        where: { userId: parseInt(refUserId) },
        select: { id: true }
      })
      where.linkId = { in: links.map(l => l.id) }
    }
    if (days && days > 0) {
      where.createdAt = { gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) }
    }

    const [clicks, total] = await Promise.all([
      prisma.affiliateClick.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          link: {
            include: {
              user: { select: { id: true, name: true, email: true } }
            }
          }
        }
      }),
      prisma.affiliateClick.count({ where })
    ])

    const clickList = clicks.map(c => ({
      id: c.id,
      refUserId: c.link.user.id,
      refName: c.link.user.name,
      refEmail: c.link.user.email,
      ipAddress: c.ipAddress,
      userAgent: c.userAgent,
      createdAt: c.createdAt
    }))

    return NextResponse.json({
      clicks: clickList,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    })
  } catch (error) {
    console.error("[Log-Click GET] Error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
